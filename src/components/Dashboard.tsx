'use client'

import { useAccount, useBalance, useChainId, useConfig } from 'wagmi'
import { monadTestnet } from '@/lib/wagmi-config'
import { useState, useEffect } from 'react'
import { Automation } from '@/lib/automation'
import { getTransactionHistoryFromEnvio, getAutomationHistoryFromEnvio } from '@/lib/envio-tracker'

export default function Dashboard() {
  const { address } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
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

  useEffect(() => {
    const handleAutomationUpdate = () => {
      console.log('Automation update event received, refreshing...')
      loadUserAutomations()
      if (showHistory) {
        loadHistoryData()
      }
    }

    window.addEventListener('automationUpdated', handleAutomationUpdate)
    
    return () => {
      window.removeEventListener('automationUpdated', handleAutomationUpdate)
    }
  }, [showHistory])

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

  const getUserActiveChains = (): number[] => {
    const chains = [...new Set(automations.map(auto => auto.chainId).filter(Boolean))] as number[]
    return chains.length > 0 ? chains : [chainId || 10143]
  }

  const getChainName = (chainId: number): string => {
    const chain = config.chains.find(c => c.id === chainId)
    if (chain) return chain.name
    
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
    const chatInput = document.querySelector('textarea') as HTMLTextAreaElement
    if (chatInput) {
      chatInput.focus()
      chatInput.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { backgroundColor: 'var(--color-success)', color: 'white' }
      case 'pending': return { backgroundColor: 'var(--color-warning)', color: 'white' }
      case 'completed': return { backgroundColor: 'var(--color-ocean-200)', color: 'var(--color-ocean-700)' }
      case 'failed': return { backgroundColor: 'var(--color-error)', color: 'white' }
      default: return { backgroundColor: 'var(--color-gray-200)', color: 'var(--color-gray-700)' }
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

  const getChainBadgeStyle = (chainId: number) => {
    switch (chainId) {
      case 10143: return { backgroundColor: 'var(--color-ocean-100)', color: 'var(--color-ocean-700)' }
      case 11155111: return { backgroundColor: 'var(--color-root-100)', color: 'var(--color-root-700)' }
      case 1: return { backgroundColor: 'var(--color-gray-100)', color: 'var(--color-gray-700)' }
      case 137: return { backgroundColor: 'var(--color-ocean-50)', color: 'var(--color-ocean-600)' }
      case 42161: return { backgroundColor: 'var(--color-coral)', color: 'var(--color-root-700)' }
      case 10: return { backgroundColor: 'var(--color-error)', color: 'white' }
      case 8453: return { backgroundColor: 'var(--color-gray-200)', color: 'var(--color-gray-800)' }
      default: return { backgroundColor: 'var(--color-gray-100)', color: 'var(--color-gray-600)' }
    }
  }

  const getChainBadgeName = (chainId: number): string => {
    return getChainName(chainId)
  }

  const activeAutomations = automations.filter(auto => auto.status === 'active')
  const pendingAutomations = automations.filter(auto => auto.status === 'pending')

  const automationsByChain = automations.reduce((acc, auto) => {
    const chainId = auto.chainId || 10143
    if (!acc[chainId]) acc[chainId] = []
    acc[chainId].push(auto)
    return acc
  }, {} as Record<number, Automation[]>)

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Dashboard</h2>
      
      {/* Wallet Info */}
      <div className="wallet-card">
        <h3 className="wallet-title">Wallet Info</h3>
        <p className="wallet-address">
          {address || 'Not connected'}
        </p>
        <div className="wallet-balance">
          <span className="balance-label">Balance:</span>
          <span className="balance-amount">
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
          </span>
        </div>
        {chainId && (
          <div className="chain-info">
            <span>Connected to:</span>
            <span 
              className="chain-badge" 
              style={getChainBadgeStyle(chainId)}
            >
              {getChainBadgeName(chainId)}
            </span>
          </div>
        )}
      </div>

      {/* Active Automations */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Active Automations</h3>
          <span className="section-count">{automations.length} total</span>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            Loading automations...
          </div>
        ) : automations.length === 0 ? (
          <div 
            className="empty-state"
            onClick={handleCreateFirstAutomation}
          >
            <div className="empty-icon">⏰</div>
            <p className="empty-title">No automations yet</p>
            <p className="empty-description">
              Create your first automation with AI
            </p>
            <button className="btn-primary">
              Get Started
            </button>
          </div>
        ) : (
          <div className="automations-grid">
            {Object.entries(automationsByChain).slice(0, 3).flatMap(([chainId, chainAutomations]) =>
              chainAutomations.slice(0, 2).map((auto) => {
                const statusStyle = getStatusColor(auto.status)
                const chainStyle = getChainBadgeStyle(Number(chainId))
                const chainName = getChainBadgeName(Number(chainId))
                
                return (
                  <div key={auto.id} className="automation-card">
                    <div className="automation-header">
                      <div className="automation-info">
                        <span className="automation-icon">{getAutomationIcon(auto.type)}</span>
                        <span className="automation-name">
                          {auto.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="automation-badges">
                        <span 
                          className="chain-badge badge" 
                          style={chainStyle}
                        >
                          {chainName}
                        </span>
                        <span 
                          className="status-badge badge"
                          style={statusStyle}
                        >
                          {auto.status.charAt(0).toUpperCase() + auto.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <p className="automation-description">
                      {auto.description}
                    </p>
                    <div className="automation-footer">
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
              <button className="view-all-btn">
                View all {automations.length} automations
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="section">
        <h3 className="section-title">Quick Stats</h3>
        <div className="stats-grid">
          <div className="stat-card ocean">
            <div className="stat-number">{activeAutomations.length}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card root">
            <div className="stat-number">{pendingAutomations.length}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card success">
            <div className="stat-number">{automations.filter(a => a.status === 'completed').length}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card coral">
            <div className="stat-number">{Object.keys(automationsByChain).length}</div>
            <div className="stat-label">Chains</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <h3 className="section-title">Quick Actions</h3>
        <div className="actions-grid">
          <button
            onClick={handleViewHistory}
            className={`action-btn ${showHistory ? 'primary' : 'secondary'}`}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
          <button
            onClick={handleSettings}
            className="action-btn secondary"
          >
            <span className="btn-icon">⚙️</span>
            Settings
          </button>
        </div>

        {/* Envio History Panel */}
        {showHistory && (
          <div className="history-panel">
            <h4 className="history-title">
              📊 Multi-Chain History
            </h4>

            {historyData.isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                Loading history across {getUserActiveChains().length} chains...
              </div>
            ) : historyData.transactions.length === 0 && historyData.automationEvents.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">📊</div>
                <p>No history data yet</p>
                <p className="empty-subtitle">
                  Your automation transactions and events will appear here
                </p>
              </div>
            ) : (
              <div className="history-content">
                {/* Recent Transactions */}
                {historyData.transactions.length > 0 && (
                  <div className="history-section">
                    <h5 className="history-section-title">
                      Recent Transactions ({historyData.transactions.length})
                    </h5>
                    <div className="history-list">
                      {historyData.transactions.slice(0, 5).map((tx, index) => {
                        const chainStyle = getChainBadgeStyle(tx.chainId)
                        const chainName = getChainBadgeName(tx.chainId)
                        
                        return (
                          <div key={index} className="history-item">
                            <div className="history-item-header">
                              <div className="history-item-info">
                                <span className="item-icon">{getTransactionTypeIcon(tx.type || 'transaction')}</span>
                                <span className="item-title">
                                  {formatTransactionType(tx.type || 'transaction')}
                                </span>
                                <span 
                                  className="chain-badge badge"
                                  style={chainStyle}
                                >
                                  {chainName}
                                </span>
                              </div>
                              <span className="item-value">
                                {formatValue(tx.value || '0')} ETH
                              </span>
                            </div>
                            <div className="history-item-footer">
                              <span>Block #{tx.blockNumber}</span>
                              <span>{new Date(tx.blockTimestamp).toLocaleDateString()}</span>
                            </div>
                            {tx.hash && (
                              <div className="transaction-hash">
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
                  <div className="history-section">
                    <h5 className="history-section-title">
                      Automation Events ({historyData.automationEvents.length})
                    </h5>
                    <div className="history-list">
                      {historyData.automationEvents.slice(0, 5).map((event, index) => {
                        const chainStyle = getChainBadgeStyle(event.chainId)
                        const chainName = getChainBadgeName(event.chainId)
                        const statusStyle = getStatusColor(event.status)
                        
                        return (
                          <div key={index} className="history-item">
                            <div className="history-item-header">
                              <div className="history-item-info">
                                <span className="item-icon">{getAutomationIcon(event.type)}</span>
                                <span className="item-title">
                                  {formatTransactionType(event.type)}
                                </span>
                                <span 
                                  className="chain-badge badge"
                                  style={chainStyle}
                                >
                                  {chainName}
                                </span>
                              </div>
                              <span 
                                className="status-badge badge"
                                style={statusStyle}
                              >
                                {event.status}
                              </span>
                            </div>
                            <div className="history-item-footer">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            {event.transactionHash && (
                              <div className="transaction-hash">
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

      <style jsx>{`
        .dashboard-container {
          background: var(--color-white);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 2rem;
          border: 1px solid var(--color-coral);
        }

        .dashboard-title {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--color-root-700);
          font-family: var(--font-display);
        }

        /* Wallet Card */
        .wallet-card {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, var(--color-sand) 0%, var(--color-white) 100%);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-coral);
        }

        .wallet-title {
          font-weight: 500;
          color: var(--color-root-700);
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .wallet-address {
          font-size: 0.875rem;
          color: var(--color-root-600);
          word-break: break-all;
          margin-bottom: 0.75rem;
          line-height: 1.4;
          font-family: monospace;
        }

        .wallet-balance {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .balance-label {
          color: var(--color-root-500);
          font-size: 0.875rem;
        }

        .balance-amount {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--color-root-700);
        }

        .chain-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-root-500);
        }

        .chain-badge {
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        /* Section Styles */
        .section {
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-title {
          font-weight: 500;
          color: var(--color-root-700);
          margin: 0;
          font-size: 1.125rem;
        }

        .section-count {
          font-size: 0.875rem;
          color: var(--color-root-500);
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--color-root-500);
          font-size: 0.875rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          border: 2px solid var(--color-ocean-100);
          border-top: 2px solid var(--color-ocean);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          color: var(--color-root-500);
          padding: 3rem 1.5rem;
          border: 2px dashed var(--color-coral);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--color-sand);
        }

        .empty-state:hover {
          background: var(--color-coral);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--color-root-700);
          font-size: 1.125rem;
        }

        .empty-description {
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }

        /* Automation Cards */
        .automations-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .automation-card {
          padding: 1.25rem;
          background: var(--color-white);
          border: 1px solid var(--color-coral);
          border-radius: var(--radius-lg);
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .automation-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-ocean);
        }

        .automation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          gap: 0.75rem;
        }

        .automation-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .automation-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .automation-name {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--color-root-700);
          line-height: 1.3;
        }

        .automation-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .badge {
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .automation-description {
          font-size: 0.875rem;
          color: var(--color-root-600);
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .automation-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--color-root-400);
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .view-all-btn {
          width: 100%;
          padding: 1rem;
          background: var(--color-sand);
          color: var(--color-root-600);
          border: 1px solid var(--color-coral);
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .view-all-btn:hover {
          background: var(--color-coral);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          padding: 1.5rem 1rem;
          border-radius: var(--radius-lg);
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition: transform 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stat-card.ocean {
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-ocean-400) 100%);
          color: white;
        }

        .stat-card.root {
          background: linear-gradient(135deg, var(--color-root) 0%, var(--color-root-400) 100%);
          color: white;
        }

        .stat-card.success {
          background: linear-gradient(135deg, var(--color-success) 0%, #059669 100%);
          color: white;
        }

        .stat-card.coral {
          background: linear-gradient(135deg, var(--color-coral) 0%, var(--color-clay) 100%);
          color: var(--color-root-700);
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.75rem;
          opacity: 0.9;
        }

        /* Actions */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .action-btn {
          padding: 1rem;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-ocean-400) 100%);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .action-btn.secondary {
          background: var(--color-sand);
          color: var(--color-root-600);
          border: 1px solid var(--color-coral);
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .btn-icon {
          font-size: 1rem;
        }

        /* History Panel */
        .history-panel {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--color-sand);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-coral);
        }

        .history-title {
          font-weight: 500;
          color: var(--color-root-700);
          margin-bottom: 1.5rem;
          font-size: 1.125rem;
        }

        .empty-history {
          text-align: center;
          color: var(--color-root-500);
          padding: 3rem 1rem;
        }

        .empty-subtitle {
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .history-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .history-section-title {
          font-weight: 500;
          color: var(--color-root-600);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .history-item {
          padding: 1rem;
          background: var(--color-white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-coral);
          transition: all 0.2s ease;
        }

        .history-item:hover {
          border-color: var(--color-ocean);
          box-shadow: var(--shadow-sm);
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .history-item-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .item-icon {
          font-size: 1rem;
        }

        .item-title {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--color-root-700);
        }

        .item-value {
          color: var(--color-success);
          font-weight: 500;
          font-size: 0.875rem;
        }

        .history-item-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--color-root-500);
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .transaction-hash {
          font-size: 0.75rem;
          color: var(--color-root-400);
          word-break: break-all;
          margin-top: 0.5rem;
          font-family: monospace;
        }

        /* Buttons */
        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-ocean-400) 100%);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1.5rem;
          }

          .dashboard-title {
            font-size: 1.5rem;
          }

          .wallet-card {
            padding: 1.25rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }

          .automation-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .automation-badges {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  )
}