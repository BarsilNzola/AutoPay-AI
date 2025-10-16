'use client'

import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid hydration issues
const ConnectWallet = dynamic(() => import('@/components/ConnectWallet'), {
  ssr: false,
})
const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
})
const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  ssr: false,
})

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          AutoPay AI 🤖
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Automate your on-chain tasks with AI-powered wallet automation
        </p>
      </div>

      {!isConnected ? (
        <div className="max-w-md mx-auto">
          <ConnectWallet />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">AI Assistant</h2>
              <ChatBox />
            </div>
          </div>
          <div className="lg:col-span-1">
            <Dashboard />
          </div>
        </div>
      )}
    </main>
  )
}