'use client'

import { useConnect, useAccount } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { useState, useEffect } from 'react'

export default function ConnectWallet() {
  const { connect, isPending } = useConnect()
  const { isConnected } = useAccount()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (isConnected || !isClient) {
    return null
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      padding: '1.5rem',
      textAlign: 'center'
    }}>
      <div style={{
        width: '4rem',
        height: '4rem',
        margin: '0 auto 1rem auto',
        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '1.5rem' }}>🤖</span>
      </div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '0.5rem'
      }}>
        Connect Your Wallet
      </h2>
      <p style={{
        color: '#4b5563',
        marginBottom: '1.5rem'
      }}>
        Connect your MetaMask wallet to start automating your on-chain tasks
      </p>
      
      <button
        onClick={() => connect({ connector: metaMask() })}
        disabled={isPending}
        style={{
          backgroundColor: isPending ? '#9ca3af' : '#2563eb',
          color: 'white',
          fontWeight: '500',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          transition: 'background-color 0.2s',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.5 : 1
        }}
        onMouseOver={(e) => {
          if (!isPending) {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
          }
        }}
        onMouseOut={(e) => {
          if (!isPending) {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }
        }}
      >
        <span>🦊</span>
        {isPending ? 'Connecting...' : 'Connect MetaMask'}
      </button>
      
      <p style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        marginTop: '1rem'
      }}>
        We use ERC-4337 Smart Accounts for secure automation
      </p>
    </div>
  )
}