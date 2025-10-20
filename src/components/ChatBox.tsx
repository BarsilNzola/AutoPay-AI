'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount, useWalletClient, useChainId } from 'wagmi'
import { DelegationService } from '@/lib/delegation-service'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  pending?: boolean
  automation?: any
  requiresConfirmation?: boolean
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your wallet automation assistant. I can help you set up:\n\n• 💰 Recurring payments (send X ETH to address every Y time)\n• 🎁 Automatic reward claims from DeFi protocols\n• ⚡ Scheduled staking operations\n• ⏰ Reminders for on-chain activities\n\nWhat would you like to automate?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Debug wallet connection status
  useEffect(() => {
    console.log('🔗 Wallet connection status:', {
      isConnected,
      address,
      hasWalletClient: !!walletClient,
      chainId
    })
  }, [isConnected, address, walletClient, chainId])

  const getChainName = (chainId: number): string => {
    switch (chainId) {
      case 10143: return 'Monad Testnet'
      case 11155111: return 'Sepolia'
      case 1: return 'Ethereum Mainnet'
      case 5: return 'Goerli'
      case 137: return 'Polygon'
      case 80001: return 'Mumbai'
      default: return `Chain ${chainId}`
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          userAddress: address
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        automation: data.automation,
        requiresConfirmation: data.requiresConfirmation
      }

      setMessages(prev => [...prev, assistantMessage])

      // Refresh dashboard to show new automation
      if (data.automation) {
        window.dispatchEvent(new CustomEvent('automationUpdated'))
      }

    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmAutomation = async (automationId: string) => {
    try {
      console.log('🔄 Starting automation confirmation...', {
        automationId,
        address,
        isConnected,
        hasWalletClient: !!walletClient,
        chainId
      })

      // Update message to show confirmation in progress
      setMessages(prev => prev.map(msg => 
        msg.automation?.id === automationId 
          ? { 
              ...msg, 
              content: "Setting up automation...", 
              pending: true,
              // Also update the automation status in the preview
              automation: msg.automation ? { ...msg.automation, status: 'activating' } : msg.automation
            }
          : msg
      ))
  
      // Comprehensive validation
      if (!isConnected) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
  
      if (!address) {
        throw new Error('User address not available. Please ensure your wallet is connected and try again.')
      }
  
      if (!walletClient) {
        throw new Error('Wallet client not available. Please refresh the page and try again.')
      }

      console.log(' Wallet validation passed:', {
        address,
        chainId,
        walletClientAccount: walletClient.account
      })
  
      // Get the automation details from current messages
      const automation = messages.find(msg => msg.automation?.id === automationId)?.automation
      
      if (!automation) {
        throw new Error('Automation not found in current session. Please try creating the automation again.')
      }

      console.log('📋 Automation details:', automation)
  
      const delegationService = new DelegationService()
      
      console.log('🏗️ Creating delegation...')
      // Create and submit delegation on client side with current chain
      const delegationResult = await delegationService.setupAutomationDelegation(
        automation, 
        walletClient, 
        address,
        chainId
      )
      
      console.log('📦 Delegation result:', delegationResult)
      
      if (!delegationResult.success) {
        throw new Error(delegationResult.error || 'Delegation setup failed')
      }
  
      console.log('📡 Sending delegation to server...')
      // Send signed delegation to server for storage and tracking
      const response = await fetch('/api/automations/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automationId,
          userAddress: address,
          signedDelegation: delegationResult.delegation,
          transactionHash: delegationResult.transactionHash,
          chainId: delegationResult.chainId,
          isSimulated: delegationResult.isSimulated
        }),
      })
  
      const data = await response.json()
      console.log(' Server response:', data)
  
      if (data.success) {
        const chainName = getChainName(chainId);
        let mode = '';
        
        if (delegationResult.isSimulated) {
          mode = ' (Simulation Mode)';
        } else if ((delegationResult as any).usedWalletConnect) {
          mode = ' (Real On-Chain Delegation via WalletConnect)';
        } else {
          mode = ' (Real On-Chain Delegation)';
        }
        
        // Update both content AND automation status
        setMessages(prev => prev.map(msg => 
          msg.automation?.id === automationId 
            ? { 
                ...msg, 
                content: ` Automation activated on ${chainName}!\n${mode}\n\nYour automation has been successfully set up with real on-chain delegation.`,
                pending: false,
                requiresConfirmation: false,
                // Update the automation status to match the dashboard
                automation: msg.automation ? { 
                  ...msg.automation, 
                  status: 'active',
                  delegationId: delegationResult.delegationId,
                  transactionHash: delegationResult.transactionHash
                } : msg.automation
              }
            : msg
        ));
      
        window.dispatchEvent(new CustomEvent('automationUpdated'));
      } else {
        throw new Error(data.error || 'Server failed to save automation')
      }
  
    } catch (error) {
      console.error('❌ Failed to confirm automation:', error)
      
      let errorMessage = "❌ Failed to confirm automation. Please try again."
      if (error instanceof Error) {
        if (error.message.includes('Wallet not connected')) {
          errorMessage = "❌ Wallet not connected. Please connect your wallet and try again."
        } else if (error.message.includes('User address not available')) {
          errorMessage = "❌ Unable to detect your wallet address. Please ensure your wallet is properly connected."
        } else if (error.message.includes('Wallet client not available')) {
          errorMessage = "❌ Wallet connection issue. Please refresh the page and try again."
        } else if (error.message.includes('Automation not found')) {
          errorMessage = "❌ Automation session expired. Please create the automation again."
        } else {
          errorMessage = `❌ ${error.message}`
        }
      }
      
      setMessages(prev => prev.map(msg => 
        msg.automation?.id === automationId 
          ? { 
              ...msg, 
              content: errorMessage,
              pending: false,
              // reset automation status on error
              automation: msg.automation ? { ...msg.automation, status: 'pending' } : msg.automation
            }
          : msg
      ))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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

  // Add connection status indicator
  const ConnectionStatus = () => {
    if (!isConnected) {
      return (
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          fontSize: '0.75rem',
          color: '#dc2626',
          textAlign: 'center'
        }}>
          ⚠️ Wallet not connected. Please connect your wallet to use automations.
        </div>
      )
    }

    if (!address) {
      return (
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fed7aa',
          fontSize: '0.75rem',
          color: '#ea580c',
          textAlign: 'center'
        }}>
          ⚠️ Connecting to wallet... Please wait.
        </div>
      )
    }

    return null
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '24rem'
    }}>
      {/* Connection Status */}
      <ConnectionStatus />

      {/* Current Network Info */}
      <div style={{
        padding: '0.5rem 1rem',
        backgroundColor: '#f3f4f6',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.75rem',
        color: '#6b7280'
      }}>
        Current Network: <strong>{getChainName(chainId)}</strong>
        {chainId === 10143 && ' 🔧 (Simulation Mode)'}
        {(chainId === 11155111 || chainId === 1) && ' 🔗 (Real Delegation)'}
        {isConnected && address && (
          <span style={{ marginLeft: '1rem' }}>
            Wallet: <strong>{address.slice(0, 6)}...{address.slice(-4)}</strong>
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <div style={{
              flexShrink: 0,
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: message.role === 'user' ? '#3b82f6' : '#10b981'
            }}>
              <span style={{ 
                color: 'white', 
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}>
                {message.role === 'user' ? 'U' : 'AI'}
              </span>
            </div>
            <div style={{
              maxWidth: '70%',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              backgroundColor: message.role === 'user' 
                ? '#3b82f6' 
                : '#f3f4f6',
              color: message.role === 'user' ? 'white' : '#111827'
            }}>
              <p style={{ 
                fontSize: '0.875rem', 
                whiteSpace: 'pre-wrap',
                margin: 0,
                marginBottom: message.automation || message.requiresConfirmation ? '0.75rem' : '0'
              }}>
                {message.content}
              </p>
              
              {/* Automation Preview */}
              {message.automation && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: message.role === 'user' ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                  borderRadius: '0.375rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1rem' }}>
                      {getAutomationIcon(message.automation.type)}
                    </span>
                    <strong style={{ fontSize: '0.875rem' }}>
                    {message.automation.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </strong>
                  </div>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: message.role === 'user' ? 'rgba(255,255,255,0.8)' : '#6b7280',
                    margin: 0,
                    marginBottom: '0.5rem'
                  }}>
                    {message.automation.description}
                  </p>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: message.role === 'user' ? 'rgba(255,255,255,0.6)' : '#9ca3af'
                  }}>
                    Status: <strong style={{
                      color: message.automation.status === 'active' ? '#10b981' : 
                             message.automation.status === 'activating' ? '#f59e0b' : 
                             message.automation.status === 'pending' ? '#6b7280' : '#ef4444'
                    }}>{message.automation.status.toUpperCase()}</strong>
                    {message.automation.delegationId && (
                      <div>Delegation: {message.automation.delegationId.slice(0, 8)}...</div>
                    )}
                    {message.automation.transactionHash && (
                      <div>Tx: {message.automation.transactionHash.slice(0, 8)}...</div>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation Button */}
              {message.requiresConfirmation && !message.pending && (
                <button
                  onClick={() => handleConfirmAutomation(message.automation.id)}
                  disabled={!isConnected || !address}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: (!isConnected || !address) ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    cursor: (!isConnected || !address) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (isConnected && address) {
                      e.currentTarget.style.backgroundColor = '#059669'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isConnected && address) {
                      e.currentTarget.style.backgroundColor = '#10b981'
                    }
                  }}
                >
                  {!isConnected ? '🔒 Connect Wallet First' : 
                   !address ? '⏳ Connecting...' : 
                   '✅ Confirm & Activate Automation'}
                </button>
              )}

              {message.pending && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#6b7280'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '0.25rem'
                  }}>
                    <div style={{
                      width: '0.375rem',
                      height: '0.375rem',
                      backgroundColor: 'currentColor',
                      borderRadius: '9999px',
                      animation: 'bounce 1.4s infinite ease-in-out both'
                    }}></div>
                    <div style={{
                      width: '0.375rem',
                      height: '0.375rem',
                      backgroundColor: 'currentColor',
                      borderRadius: '9999px',
                      animation: 'bounce 1.4s infinite ease-in-out both',
                      animationDelay: '0.16s'
                    }}></div>
                    <div style={{
                      width: '0.375rem',
                      height: '0.375rem',
                      backgroundColor: 'currentColor',
                      borderRadius: '9999px',
                      animation: 'bounce 1.4s infinite ease-in-out both',
                      animationDelay: '0.32s'
                    }}></div>
                  </div>
                  Processing...
                </div>
              )}

              <p style={{ 
                fontSize: '0.75rem', 
                margin: 0,
                marginTop: '0.5rem',
                color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#6b7280'
              }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        padding: '1rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your automation command... (e.g., 'Send 0.01 ETH to vitalik.eth every Friday at 2 PM')"
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              resize: 'none',
              minHeight: '2.5rem',
              maxHeight: '6rem',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            rows={2}
            disabled={isLoading || !isConnected}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !isConnected}
            style={{
              alignSelf: 'flex-end',
              padding: '0.5rem',
              backgroundColor: (isLoading || !input.trim() || !isConnected) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: (isLoading || !input.trim() || !isConnected) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '2.5rem',
              minHeight: '2.5rem'
            }}
            onMouseOver={(e) => {
              if (!isLoading && input.trim() && isConnected) {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && input.trim() && isConnected) {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }
            }}
          >
            <span style={{ fontSize: '1rem' }}>➤</span>
          </button>
        </div>
        {!isConnected && (
          <div style={{
            fontSize: '0.75rem',
            color: '#dc2626',
            marginTop: '0.5rem',
            textAlign: 'center'
          }}>
            🔒 Connect your wallet to use the chat
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}