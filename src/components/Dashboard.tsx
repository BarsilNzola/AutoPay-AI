'use client'

import { useAccount, useBalance, useChainId, useConfig } from 'wagmi'
import { monadTestnet } from '@/lib/wagmi-config'
import { useState, useEffect } from 'react'
import { Automation } from '@/lib/automation'
import { getTransactionHistoryFromEnvio, getAutomationHistoryFromEnvio } from '@/lib/envio-tracker'

export default function Dashboard() {
  const { address } = useAccount()
  const chainId = useChainId() // Get current chain ID
  const config = useConfig() // Get wagmi config
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
  })
  const [showHistory, setShowHistory] = useState(false)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [historyData, setHistoryData] = useState<{
    transactions: any[]
    automationEvents: any[]
    isLoading: boolean
  }>({
    transactions: [],
    automationEvents: [],
    isLoading: false
  })

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
      // Also refresh history when new automations are created
      if (showHistory) {
        loadHistoryData()
      }
    }

    window.addEventListener('automationUpdated', handleAutomationUpdate)
    
    return () => {
      window.removeEventListener('automationUpdated', handleAutomationUpdate)
    }
  }, [showHistory])

  // Load history data when section is opened
  useEffect(() => {
    if (showHistory && address) {
      loadHistoryData()
    }
  }, [showHistory, address])

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

  // Get chains where user has automations
  const getUserActiveChains = (): number[] => {
    const chains = [...new Set(automations.map(auto => auto.chainId).filter(Boolean))] as number[]
    return chains.length > 0 ? chains : [chainId || 10143]
  }

  // Get chain name from chain ID
  const getChainName = (chainId: number): string => {
    // Try to get chain name from wagmi config
    const chain = config.chains.find(c => c.id === chainId)
    if (chain) return chain.name
    
    // Fallback to our mapping
    switch (chainId) {
      case 10143: return 'Monad Testnet'
      case 11155111: return 'Sepolia'
      case 1: return 'Ethereum'
      case 137: return 'Polygon'
      case 42161: return 'Arbitrum'
      case 10: return 'Optimism'
      case 8453: return 'Base'
      default: return `Chain ${chainId}`
    }
  }

  const loadHistoryData = async () => {
    if (!address) return

    setHistoryData(prev => ({ ...prev, isLoading: true }))
    try {
      // Get chains where user has activity
      const userChains = getUserActiveChains()
      const currentChainId = chainId || 10143
      
      console.log(`🔗 Loading history for chains:`, userChains)
      console.log(`📱 Connected chain: ${currentChainId} (${getChainName(currentChainId)})`)

      const [transactions, automationEvents] = await Promise.all([
        getTransactionHistoryFromEnvio(address, userChains, 20).catch(error => {
          console.warn('Failed to load transaction history:', error)
          return []
        }),
        getAutomationHistoryFromEnvio(address, currentChainId, 10).catch(error => {
          console.warn('Failed to load automation events:', error)
          return []
        })
      ])

      setHistoryData({
        transactions: transactions || [],
        automationEvents: automationEvents || [],
        isLoading: false
      })

    } catch (error) {
      console.error('Failed to load Envio history data:', error)
      setHistoryData(prev => ({ ...prev, isLoading: false }))
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

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'delegation_created': return '🔐'
      case 'automation_executed': return '⚡'
      case 'reward_claimed': return '🎁'
      case 'payment_sent': return '💰'
      default: return '🔗'
    }
  }

  const formatTransactionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatValue = (value: string) => {
    if (!value) return '0'
    const wei = BigInt(value)
    const eth = Number(wei) / 1e18
    return eth.toFixed(6)
  }

  const getChainBadgeColor = (chainId: number) => {
    switch (chainId) {
      case 10143: return { bg: '#f0f9ff', text: '#0369a1', name: getChainName(chainId) }
      case 11155111: return { bg: '#fef3c7', text: '#92400e', name: getChainName(chainId) }
      case 1: return { bg: '#f3f4f6', text: '#374151', name: getChainName(chainId) }
      case 137: return { bg: '#f0f9ff', text: '#0369a1', name: getChainName(chainId) }
      case 42161: return { bg: '#fef3c7', text: '#92400e', name: getChainName(chainId) }
      case 10: return { bg: '#fee2e2', text: '#991b1b', name: getChainName(chainId) }
      case 8453: return { bg: '#f3f4f6', text: '#374151', name: getChainName(chainId) }
      default: return { bg: '#f3f4f6', text: '#6b7280', name: getChainName(chainId) }
    }
  }

  const activeAutomations = automations.filter(auto => auto.status === 'active')
  const pendingAutomations = automations.filter(auto => auto.status === 'pending')

  // Group automations by chain
  const automationsByChain = automations.reduce((acc, auto) => {
    const chainId = auto.chainId || 10143
    if (!acc[chainId]) acc[chainId] = []
    acc[chainId].push(auto)
    return acc
  }, {} as Record<number, Automation[]>)

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
          marginBottom: '0.5rem',
          fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
        }}>Wallet Info</h3>
        <p style={{
          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
          color: '#4b5563',
          wordBreak: 'break-all',
          marginBottom: '0.5rem',
          lineHeight: '1.4'
        }}>
          {address || 'Not connected'}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ 
            color: '#4b5563',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
          }}>Balance:</span>
          <span style={{ 
            fontWeight: '600',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            wordBreak: 'break-all'
          }}>
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
          </span>
        </div>
        {chainId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            color: '#6b7280'
          }}>
            <span>Connected to:</span>
            <span style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: getChainBadgeColor(chainId).bg,
              color: getChainBadgeColor(chainId).text,
              borderRadius: '0.25rem',
              fontWeight: '500',
              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)'
            }}>
              {getChainBadgeColor(chainId).name}
            </span>
          </div>
        )}
      </div>

      {/* Active Automations */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <h3 style={{
            fontWeight: '500',
            color: '#111827',
            margin: 0,
            fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
          }}>Active Automations</h3>
          <span style={{
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            color: '#6b7280'
          }}>
            {automations.length} total
          </span>
        </div>

        {isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
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
            <div style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', marginBottom: '0.5rem' }}>⏰</div>
            <p style={{ 
              fontWeight: '500', 
              marginBottom: '0.5rem',
              fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
            }}>No automations yet</p>
            <p style={{ 
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', 
              marginBottom: '1rem',
              lineHeight: '1.4'
            }}>
              Create your first automation with AI
            </p>
            <button style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
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
            {Object.entries(automationsByChain).slice(0, 3).flatMap(([chainId, chainAutomations]) =>
              chainAutomations.slice(0, 2).map((auto) => {
                const statusColors = getStatusColor(auto.status)
                const chainBadge = getChainBadgeColor(Number(chainId))
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
                      marginBottom: '0.5rem',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        flex: 1,
                        minWidth: '120px'
                      }}>
                        <span style={{ 
                          fontSize: 'clamp(0.875rem, 3vw, 1rem)',
                          flexShrink: 0
                        }}>{getAutomationIcon(auto.type)}</span>
                        <span style={{ 
                          fontWeight: '500', 
                          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                          wordBreak: 'break-word',
                          lineHeight: '1.3'
                        }}>
                          {auto.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: chainBadge.bg,
                          color: chainBadge.text,
                          borderRadius: '0.25rem',
                          fontSize: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}>
                          {chainBadge.name}
                        </span>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: statusColors.bg,
                          color: statusColors.text,
                          borderRadius: '0.25rem',
                          fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}>
                          {auto.status.charAt(0).toUpperCase() + auto.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <p style={{
                      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                      lineHeight: '1.4',
                      wordBreak: 'break-word'
                    }}>
                      {auto.description}
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                      color: '#9ca3af',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <span>Created: {new Date(auto.createdAt).toLocaleDateString()}</span>
                      {auto.nextExecution && (
                        <span>Next: {new Date(auto.nextExecution).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            {automations.length > 3 && (
              <button style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
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
          marginBottom: '1rem',
          fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
        }}>Quick Stats</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '0.75rem'
        }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f0f9ff',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: 'clamp(1rem, 3vw, 1.25rem)', 
              fontWeight: '600', 
              color: '#0369a1' 
            }}>
              {activeAutomations.length}
            </div>
            <div style={{ 
              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)', 
              color: '#0c4a6e' 
            }}>Active</div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: 'clamp(1rem, 3vw, 1.25rem)', 
              fontWeight: '600', 
              color: '#92400e' 
            }}>
              {pendingAutomations.length}
            </div>
            <div style={{ 
              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)', 
              color: '#78350f' 
            }}>Pending</div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: 'clamp(1rem, 3vw, 1.25rem)', 
              fontWeight: '600', 
              color: '#166534' 
            }}>
              {automations.filter(a => a.status === 'completed').length}
            </div>
            <div style={{ 
              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)', 
              color: '#166534' 
            }}>Completed</div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#faf5ff',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: 'clamp(1rem, 3vw, 1.25rem)', 
              fontWeight: '600', 
              color: '#7c3aed' 
            }}>
              {Object.keys(automationsByChain).length}
            </div>
            <div style={{ 
              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)', 
              color: '#6b21a8' 
            }}>Chains</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{
          fontWeight: '500',
          color: '#111827',
          marginBottom: '1rem',
          fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
        }}>Quick Actions</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.5rem'
        }}>
          <button
            onClick={handleViewHistory}
            style={{
              padding: '0.75rem',
              backgroundColor: showHistory ? '#3b82f6' : '#f3f4f6',
              color: showHistory ? 'white' : '#374151',
              borderRadius: '0.375rem',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '500',
              whiteSpace: 'nowrap'
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
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Envio History Panel */}
        {showHistory && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{
              fontWeight: '500',
              color: '#111827',
              marginBottom: '1rem',
              fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
            }}>
              📊 Multi-Chain History
            </h4>

            {historyData.isLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6b7280',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}>
                Loading history across {getUserActiveChains().length} chains...
              </div>
            ) : historyData.transactions.length === 0 && historyData.automationEvents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                padding: '2rem 1rem',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                <p>No history data yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Your automation transactions and events will appear here
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Recent Transactions */}
                {historyData.transactions.length > 0 && (
                  <div>
                    <h5 style={{
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.75rem',
                      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                    }}>
                      Recent Transactions ({historyData.transactions.length})
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {historyData.transactions.slice(0, 5).map((tx, index) => {
                        const chainBadge = getChainBadgeColor(tx.chainId)
                        return (
                          <div key={index} style={{
                            padding: '0.75rem',
                            backgroundColor: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '0.25rem',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span>{getTransactionTypeIcon(tx.type || 'transaction')}</span>
                                <span style={{ fontWeight: '500' }}>
                                  {formatTransactionType(tx.type || 'transaction')}
                                </span>
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  backgroundColor: chainBadge.bg,
                                  color: chainBadge.text,
                                  borderRadius: '0.25rem',
                                  fontSize: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                                  fontWeight: '500'
                                }}>
                                  {chainBadge.name}
                                </span>
                              </div>
                              <span style={{
                                color: '#059669',
                                fontWeight: '500',
                                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                              }}>
                                {formatValue(tx.value || '0')} ETH
                              </span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                              color: '#6b7280',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <span>Block #{tx.blockNumber}</span>
                              <span>{new Date(tx.blockTimestamp).toLocaleDateString()}</span>
                            </div>
                            {tx.hash && (
                              <div style={{
                                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                                color: '#9ca3af',
                                wordBreak: 'break-all',
                                marginTop: '0.25rem'
                              }}>
                                Tx: {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Automation Events */}
                {historyData.automationEvents.length > 0 && (
                  <div>
                    <h5 style={{
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.75rem',
                      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                    }}>
                      Automation Events ({historyData.automationEvents.length})
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {historyData.automationEvents.slice(0, 5).map((event, index) => {
                        const chainBadge = getChainBadgeColor(event.chainId)
                        return (
                          <div key={index} style={{
                            padding: '0.75rem',
                            backgroundColor: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '0.25rem',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span>{getAutomationIcon(event.type)}</span>
                                <span style={{ fontWeight: '500' }}>
                                  {formatTransactionType(event.type)}
                                </span>
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  backgroundColor: chainBadge.bg,
                                  color: chainBadge.text,
                                  borderRadius: '0.25rem',
                                  fontSize: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                                  fontWeight: '500'
                                }}>
                                  {chainBadge.name}
                                </span>
                              </div>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: event.status === 'active' ? '#d1fae5' : '#fef3c7',
                                color: event.status === 'active' ? '#065f46' : '#92400e',
                                borderRadius: '0.25rem',
                                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                                fontWeight: '500'
                              }}>
                                {event.status}
                              </span>
                            </div>
                            <div style={{
                              fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                              color: '#6b7280'
                            }}>
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            {event.transactionHash && (
                              <div style={{
                                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                                color: '#9ca3af',
                                wordBreak: 'break-all',
                                marginTop: '0.25rem'
                              }}>
                                Event Tx: {event.transactionHash.slice(0, 10)}...{event.transactionHash.slice(-8)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}