'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount } from 'wagmi'

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
  const { address } = useAccount()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
        // Trigger a custom event that Dashboard can listen to
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
      // Update message to show confirmation in progress
      setMessages(prev => prev.map(msg => 
        msg.automation?.id === automationId 
          ? { ...msg, content: "Setting up automation...", pending: true }
          : msg
      ))

      const response = await fetch('/api/automations/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automationId,
          userAddress: address
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update message to show success
        setMessages(prev => prev.map(msg => 
          msg.automation?.id === automationId 
            ? { 
                ...msg, 
                content: `✅ Automation confirmed and activated! ${data.message}`,
                pending: false,
                requiresConfirmation: false
              }
            : msg
        ))

        // Refresh dashboard
        window.dispatchEvent(new CustomEvent('automationUpdated'))
      } else {
        throw new Error(data.error)
      }

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.automation?.id === automationId 
          ? { 
              ...msg, 
              content: "❌ Failed to confirm automation. Please try again.",
              pending: false 
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '24rem'
    }}>
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
                    Status: <strong>{message.automation.status}</strong>
                  </div>
                </div>
              )}

              {/* Confirmation Button */}
              {message.requiresConfirmation && !message.pending && (
                <button
                  onClick={() => handleConfirmAutomation(message.automation.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  ✅ Confirm & Activate Automation
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
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              alignSelf: 'flex-end',
              padding: '0.5rem',
              backgroundColor: isLoading || !input.trim() ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '2.5rem',
              minHeight: '2.5rem'
            }}
            onMouseOver={(e) => {
              if (!isLoading && input.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && input.trim()) {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }
            }}
          >
            <span style={{ fontSize: '1rem' }}>➤</span>
          </button>
        </div>
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