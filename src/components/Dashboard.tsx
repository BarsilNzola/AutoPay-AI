'use client'

import { useAccount, useBalance } from 'wagmi'
import { monadTestnet } from '@/lib/wagmi-config'
import { Clock, Calendar, Zap, Settings } from 'lucide-react'

export default function Dashboard() {
  const { address } = useAccount()
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
  })

  const automations = [
    {
      id: 1,
      type: 'Recurring Payment',
      description: 'Send 0.01 ETH to vitalik.eth',
      frequency: 'Weekly',
      status: 'Active',
      nextExecution: '2024-01-15 09:00'
    },
    {
      id: 2,
      type: 'Reward Claim',
      description: 'Claim staking rewards',
      frequency: 'Daily',
      status: 'Pending',
      nextExecution: '2024-01-12 12:00'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>
      
      {/* Wallet Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Wallet Info</h3>
        <p className="text-sm text-gray-600 break-all mb-2">
          {address}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Balance:</span>
          <span className="font-semibold">
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Active Automations */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Active Automations
        </h3>
        <div className="space-y-3">
          {automations.map((auto) => (
            <div key={auto.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm">{auto.type}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  auto.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {auto.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{auto.description}</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {auto.frequency}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {auto.nextExecution}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary text-sm py-2">
            View History
          </button>
          <button className="btn-secondary text-sm py-2 flex items-center justify-center gap-1">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}