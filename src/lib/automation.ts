export interface Automation {
  id: string
  type: 'recurring_payment' | 'reward_claim' | 'staking' | 'reminder'
  description: string
  status: 'active' | 'pending' | 'completed' | 'failed'
  params: {
    amount?: string
    currency?: string
    recipient?: string
    frequency?: string
    dayOfWeek?: string
    time?: string
    contractAddress?: string
  }
  userAddress: string
  createdAt: Date
  nextExecution?: Date
  lastExecuted?: Date
  delegationId?: string
  transactionHash?: string
  delegationData?: any
  onChainActive?: boolean
  chainId?: number
  isSimulated?: boolean
}

// In-memory storage (replace with database in production)
let automations: Automation[] = []

export const automationStorage = {
  // Create new automation
  create: (automation: Omit<Automation, 'id' | 'createdAt'>): Automation => {
    const newAutomation: Automation = {
      ...automation,
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    }
    automations.push(newAutomation)
    return newAutomation
  },

  // Get automations by user
  getByUser: (userAddress: string): Automation[] => {
    return automations.filter(auto => auto.userAddress === userAddress)
  },

  // Update automation status
  updateStatus: (id: string, status: Automation['status']): Automation | null => {
    const automation = automations.find(auto => auto.id === id)
    if (automation) {
      automation.status = status
      return automation
    }
    return null
  },

  // Update automation with partial data
  update: (id: string, updates: Partial<Automation>): Automation | null => {
    const automation = automations.find(auto => auto.id === id)
    if (automation) {
      Object.assign(automation, updates)
      return automation
    }
    return null
  },

  // Delete automation
  delete: (id: string, userAddress: string): boolean => {
    const index = automations.findIndex(auto => auto.id === id && auto.userAddress === userAddress)
    if (index !== -1) {
      automations.splice(index, 1)
      return true
    }
    return false
  }
}