'use client'

import { useConnect, useAccount } from 'wagmi'

export default function ConnectWallet() {
  const { connect, connectors, isPending } = useConnect()
  const { isConnected } = useAccount()

  if (isConnected) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-2xl">🤖</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Connect Your Wallet
      </h2>
      <p className="text-gray-600 mb-6">
        Connect your MetaMask wallet to start automating your on-chain tasks
      </p>
      
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="btn-primary w-full mb-3 flex items-center justify-center gap-2"
        >
          <span>🦊</span>
          Connect MetaMask
        </button>
      ))}
      
      <p className="text-sm text-gray-500 mt-4">
        We use ERC-4337 Smart Accounts for secure automation
      </p>
    </div>
  )
}