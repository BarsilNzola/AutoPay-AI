'use client'

import { useAccount, useBalance } from 'wagmi'
import { monadTestnet } from '@/lib/wagmi-config'
import { useState, useEffect } from 'react'
import { Automation } from '@/lib/automation'

export default function Dashboard() {
  const { address } = useAccount()
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
  })
  const [showHistory, setShowHistory] = useState(false)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (address) {
      loadUserAutomations()
    }
  }, [address])

  // Listen for automation updates from chatbox
  useEffect(() => {
    const handleAutomationUpdate = () => {
      console.log('Automation update event received, refreshing...')
      loadUserAutomations()
    }

    window.addEventListener('automationUpdated', handleAutomationUpdate)
    
    return () => {
      window.removeEventListener('automationUpdated', handleAutomationUpdate)
    }
  }, [])

  const loadUserAutomations = async () => {
    if (!address) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/automations?user=${address}`)
      if (response.ok) {
        const data = await response.json()
        setAutomations(data.automations || [])
      } else {
        console.error('Failed to fetch automations')
      }
    } catch (error) {
      console.error('Failed to load automations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewHistory = () => {
    setShowHistory(!showHistory)
  }

  const handleSettings = () => {
    console.log('Settings clicked')
  }

  const handleCreateFirstAutomation = () => {
    // Focus the chat input if it exists
    const chatInput = document.querySelector('textarea') as HTMLTextAreaElement
    if (chatInput) {
      chatInput.focus()
      chatInput.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#d1fae5', text: '#065f46' }
      case 'pending': return { bg: '#fef3c7', text: '#92400e' }
      case 'completed': return { bg: '#dbeafe', text: '#1e40af' }
      case 'failed': return { bg: '#fee2e2', text: '#991b1b' }
      default: return { bg: '#f3f4f6', text: '#374151' }
    }
  }

  const getAutomationIcon = (type: string) => {
    switch (type) {
      case 'recurring_payment': return '💰'
      case 'reward_claim': return '🎁'
      case 'staking': return '⚡'
      case 'reminder': return '⏰'
      default: return '🤖'
    }
  }

  const activeAutomations = automations.filter(auto => auto.status === 'active')
  const pendingAutomations = automations.filter(auto => auto.status === 'pending')

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      padding: '1.5rem'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '1.5rem'
      }}>Dashboard</h2>
      
      {/* Wallet Info */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem'
      }}>
        <h3 style={{
          fontWeight: '500',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>Wallet Info</h3>
        <p style={{
          fontSize: '0.875rem',
          color: '#4b5563',
          wordBreak: 'break-all',
          marginBottom: '0.5rem'
        }}>
          {address || 'Not connected'}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#4b5563' }}>Balance:</span>
          <span style={{ fontWeight: '600' }}>
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Active Automations */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontWeight: '500',
            color: '#111827',
            margin: 0
          }}>Active Automations</h3>
          <span style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            {automations.length} total
          </span>
        </div>

        {isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            Loading automations...
          </div>
        ) : automations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            padding: '2rem 1rem',
            border: '2px dashed #d1d5db',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onClick={handleCreateFirstAutomation}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏰</div>
            <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>No automations yet</p>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Create your first automation with AI
            </p>
            <button style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Get Started
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {automations.slice(0, 3).map((auto) => {
              const statusColors = getStatusColor(auto.status)
              return (
                <div key={auto.id} style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{getAutomationIcon(auto.type)}</span>
                      <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                        {auto.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: statusColors.bg,
                      color: statusColors.text,
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {auto.status.charAt(0).toUpperCase() + auto.status.slice(1)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {auto.description}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    <span>Created: {new Date(auto.createdAt).toLocaleDateString()}</span>
                    {auto.nextExecution && (
                      <span>Next: {new Date(auto.nextExecution).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {automations.length > 3 && (
              <button style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                View all {automations.length} automations
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{
          fontWeight: '500',
          color: '#111827',
          marginBottom: '1rem'
        }}>Quick Stats</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.75rem'
        }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f0f9ff',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0369a1' }}>
              {activeAutomations.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>Active</div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#92400e' }}>
              {pendingAutomations.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#78350f' }}>Pending</div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#166534' }}>
              {automations.filter(a => a.status === 'completed').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#166534' }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{
          fontWeight: '500',
          color: '#111827',
          marginBottom: '1rem'
        }}>Quick Actions</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem'
        }}>
          <button
            onClick={handleViewHistory}
            style={{
              padding: '0.75rem',
              backgroundColor: showHistory ? '#3b82f6' : '#f3f4f6',
              color: showHistory ? 'white' : '#374151',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '500'
            }}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
          <button
            onClick={handleSettings}
            style={{
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontWeight: '500'
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ 
              textAlign: 'center', 
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              Transaction history will appear here when you have active automations.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}