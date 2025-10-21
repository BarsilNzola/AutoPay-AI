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
      
      // In handleConfirmAutomation, after getting delegationResult
      if (delegationResult.success) {
        let userMessage = '';
        
        if (delegationResult.isSimulated) {
          if (delegationResult.walletType === 'scw') {
            userMessage = `🔒 Smart Contract Wallet Detected\n\nYour wallet appears to be a smart contract wallet. These currently work in simulation mode only.\n\nFor real on-chain automations with actual fund movements, please use an EOA wallet like MetaMask, Rainbow, or Trust Wallet.\n\nYour automation is active in simulation mode for testing.`;
          } else {
            userMessage = `🧪 Simulation Mode\n\nYour automation is running in simulation mode. This is perfect for testing! To enable real on-chain execution, ensure you're using a supported wallet and network.`;
          }
        } else {
          userMessage = `✅ Automation Activated!\n\nYour automation has been successfully set up with real on-chain delegation on ${getChainName(chainId)}.`;
        }

        setMessages(prev => prev.map(msg => 
          msg.automation?.id === automationId 
            ? { 
                ...msg, 
                content: userMessage,
                pending: false,
                requiresConfirmation: false,
                automation: msg.automation ? { 
                  ...msg.automation, 
                  status: delegationResult.isSimulated ? 'simulated' : 'active',
                  walletType: delegationResult.walletType
                } : msg.automation
              }
            : msg
        ));
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
        <div className="connection-status connection-error">
          ⚠️ Wallet not connected. Please connect your wallet to use automations.
        </div>
      )
    }

    if (!address) {
      return (
        <div className="connection-status connection-warning">
          ⚠️ Connecting to wallet... Please wait.
        </div>
      )
    }

    return null
  }

  return (
    <div className="chat-container">
      {/* Connection Status */}
      <ConnectionStatus />

      {/* Current Network Info */}
      <div className="network-info">
        <div className="network-status">
          <span className="network-label">Current Network:</span>
          <span className="network-name">{getChainName(chainId)}</span>
          {chainId === 10143 && <span className="network-badge simulation">🔧 Simulation Mode</span>}
          {(chainId === 11155111 || chainId === 1) && <span className="network-badge real">🔗 Real Delegation</span>}
        </div>
        {isConnected && address && (
          <div className="wallet-info">
            <span className="wallet-label">Wallet:</span>
            <span className="wallet-address">{address.slice(0, 6)}...{address.slice(-4)}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message-wrapper ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className={`avatar ${message.role}`}>
              <span className="avatar-text">
                {message.role === 'user' ? 'U' : 'AI'}
              </span>
            </div>
            <div className={`message-bubble ${message.role}`}>
              <p className="message-content">
                {message.content}
              </p>
              
              {/* Automation Preview */}
              {message.automation && (
                <div className="automation-preview">
                  <div className="automation-header">
                    <span className="automation-icon">
                      {getAutomationIcon(message.automation.type)}
                    </span>
                    <strong className="automation-title">
                      {message.automation.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </strong>
                  </div>
                  <p className="automation-description">
                    {message.automation.description}
                  </p>
                  <div className="automation-details">
                    <span className="status-label">Status:</span>
                    <span className={`status-badge ${message.automation.status}`}>
                      {message.automation.status.toUpperCase()}
                    </span>
                    {message.automation.delegationId && (
                      <div className="delegation-info">
                        Delegation: {message.automation.delegationId.slice(0, 8)}...
                      </div>
                    )}
                    {message.automation.transactionHash && (
                      <div className="transaction-info">
                        Tx: {message.automation.transactionHash.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation Button */}
              {message.requiresConfirmation && !message.pending && (
                <button
                  onClick={() => handleConfirmAutomation(message.automation.id)}
                  disabled={!isConnected || !address}
                  className={`confirm-button ${!isConnected || !address ? 'disabled' : ''}`}
                >
                  {!isConnected ? '🔒 Connect Wallet First' : 
                   !address ? '⏳ Connecting...' : 
                   '✅ Confirm & Activate Automation'}
                </button>
              )}

              {message.pending && (
                <div className="loading-indicator">
                  <div className="loading-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                  <span>Processing...</span>
                </div>
              )}

              <p className="message-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your automation command... (e.g., 'Send 0.01 ETH to vitalik.eth every Friday at 2 PM')"
            className="chat-input"
            rows={2}
            disabled={isLoading || !isConnected}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !isConnected}
            className="send-button"
          >
            <span className="send-icon">➤</span>
          </button>
        </div>
        {!isConnected && (
          <div className="connection-warning-text">
            🔒 Connect your wallet to use the chat
          </div>
        )}
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 24rem;
          background: var(--color-white);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-coral);
          overflow: hidden;
        }

        .connection-status {
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          text-align: center;
          border-bottom: 1px solid;
        }

        .connection-error {
          background-color: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .connection-warning {
          background-color: #fffbeb;
          border-color: #fed7aa;
          color: #ea580c;
        }

        .network-info {
          padding: 0.75rem 1rem;
          background: var(--color-sand);
          border-bottom: 1px solid var(--color-coral);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--color-root-600);
        }

        .network-status, .wallet-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .network-label, .wallet-label {
          color: var(--color-root-500);
        }

        .network-name, .wallet-address {
          font-weight: 600;
          color: var(--color-root-700);
        }

        .network-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 500;
        }

        .network-badge.simulation {
          background: var(--color-warning);
          color: white;
        }

        .network-badge.real {
          background: var(--color-success);
          color: white;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: var(--color-background);
        }

        .message-wrapper {
          display: flex;
          gap: 0.75rem;
        }

        .user-message {
          flex-direction: row-reverse;
        }

        .assistant-message {
          flex-direction: row;
        }

        .avatar {
          flex-shrink: 0;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          box-shadow: var(--shadow-sm);
        }

        .avatar.user {
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-ocean-400) 100%);
          color: white;
        }

        .avatar.assistant {
          background: linear-gradient(135deg, var(--color-root) 0%, var(--color-root-400) 100%);
          color: white;
        }

        .message-bubble {
          max-width: 70%;
          border-radius: var(--radius-lg);
          padding: 1rem;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }

        .message-bubble.user {
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-ocean-400) 100%);
          color: white;
          border-bottom-right-radius: var(--radius-sm);
        }

        .message-bubble.assistant {
          background: var(--color-white);
          color: var(--color-root-700);
          border: 1px solid var(--color-coral);
          border-bottom-left-radius: var(--radius-sm);
        }

        .message-content {
          font-size: 0.875rem;
          white-space: pre-wrap;
          margin: 0;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .automation-preview {
          padding: 0.75rem;
          background: var(--message-role === 'user' ? 'rgba(255,255,255,0.1)' : 'var(--color-sand)');
          border-radius: var(--radius-md);
          margin-bottom: 0.75rem;
          border: 1px solid var(--color-coral);
        }

        .automation-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .automation-icon {
          font-size: 1rem;
        }

        .automation-title {
          font-size: 0.875rem;
          color: inherit;
        }

        .automation-description {
          font-size: 0.75rem;
          color: inherit;
          opacity: 0.8;
          margin: 0;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .automation-details {
          font-size: 0.7rem;
          opacity: 0.7;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .status-label {
          margin-right: 0.5rem;
        }

        .status-badge {
          font-weight: 600;
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
        }

        .status-badge.active {
          background: var(--color-success);
          color: white;
        }

        .status-badge.activating {
          background: var(--color-warning);
          color: white;
        }

        .status-badge.pending {
          background: var(--color-gray-400);
          color: white;
        }

        .confirm-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--color-success) 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
        }

        .confirm-button:hover:not(.disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .confirm-button.disabled {
          background: var(--color-gray-400);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .loading-dots {
          display: flex;
          gap: 0.25rem;
        }

        .dot {
          width: 0.375rem;
          height: 0.375rem;
          background-color: currentColor;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }

        .message-timestamp {
          font-size: 0.75rem;
          margin: 0;
          margin-top: 0.5rem;
          opacity: 0.6;
        }

        .input-container {
          border-top: 1px solid var(--color-coral);
          padding: 1rem;
          background: var(--color-white);
        }

        .input-wrapper {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }

        .chat-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--color-coral);
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          resize: none;
          min-height: 2.5rem;
          max-height: 6rem;
          outline: none;
          font-family: inherit;
          background: var(--color-white);
          transition: all 0.2s ease;
        }

        .chat-input:focus {
          border-color: var(--color-ocean);
          box-shadow: 0 0 0 3px var(--color-ocean-50);
        }

        .chat-input:disabled {
          background: var(--color-gray-50);
          color: var(--color-gray-400);
          cursor: not-allowed;
        }

        .send-button {
          align-self: flex-end;
          padding: 0.75rem;
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-ocean-400) 100%);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justifyify-content: center;
          min-width: 3rem;
          min-height: 3rem;
          box-shadow: var(--shadow-sm);
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-1px) scale(1.05);
          box-shadow: var(--shadow-md);
        }

        .send-button:disabled {
          background: var(--color-gray-300);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .send-icon {
          font-size: 1rem;
          font-weight: bold;
        }

        .connection-warning-text {
          font-size: 0.75rem;
          color: var(--color-error);
          margin-top: 0.5rem;
          text-align: center;
        }

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