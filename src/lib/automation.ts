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

// Event Storage system
export interface AutomationEvent {
  id: string
  automationId: string
  userAddress: string
  type: string
  eventType: 'created' | 'executed' | 'updated' | 'completed' | 'failed'
  status: string
  timestamp: Date
  transactionHash?: string
  chainId?: number
  isSimulated?: boolean
  params?: any
  details?: any
  blockNumber?: number
}

// Global variables that persist in server environment
declare global {
  var _automations: Automation[] | undefined;
  var _automationEvents: AutomationEvent[] | undefined;
}

// Persistent in-memory storage for server environment
const getAutomations = (): Automation[] => {
  if (typeof window === 'undefined') {
    // Server environment - use global persistent storage
    if (!global._automations) {
      global._automations = [];
      console.log('🔄 Initialized persistent automations storage');
    }
    return global._automations;
  } else {
    // Client environment - use local storage (or empty array)
    console.log('🌐 Client environment - using empty automations array');
    return [];
  }
};

const getAutomationEvents = (): AutomationEvent[] => {
  if (typeof window === 'undefined') {
    // Server environment - use global persistent storage
    if (!global._automationEvents) {
      global._automationEvents = [];
      console.log('🔄 Initialized persistent automation events storage');
    }
    return global._automationEvents;
  } else {
    // Client environment - use local storage (or empty array)
    console.log('🌐 Client environment - using empty events array');
    return [];
  }
};

// Initialize the persistent storage
const automations = getAutomations();
const automationEvents = getAutomationEvents();

export const automationStorage = {
  // Create new automation
  create: (automation: Omit<Automation, 'id' | 'createdAt'>): Automation => {
    const newAutomation: Automation = {
      ...automation,
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    }
    automations.push(newAutomation)
    console.log(`✅ Automation created: ${newAutomation.id} for user ${newAutomation.userAddress}. Total automations: ${automations.length}`)
    return newAutomation
  },

  // Get automations by user
  getByUser: (userAddress: string): Automation[] => {
    const userAutomations = automations.filter(auto => auto.userAddress === userAddress)
    console.log(`🔍 Getting automations for user ${userAddress}. Found ${userAutomations.length} automations`)
    return userAutomations
  },

  // Get all automations (for debugging)
  getAll: (): Automation[] => {
    console.log(`📊 Total automations in storage: ${automations.length}`)
    return automations
  },

  // Update automation status
  updateStatus: (id: string, status: Automation['status']): Automation | null => {
    const automation = automations.find(auto => auto.id === id)
    if (automation) {
      automation.status = status
      console.log(`🔄 Automation ${id} status updated to: ${status}`)
      return automation
    }
    console.log(`❌ Automation ${id} not found for status update`)
    return null
  },

  // Update automation with partial data
  update: (id: string, updates: Partial<Automation>): Automation | null => {
    const automation = automations.find(auto => auto.id === id)
    if (automation) {
      Object.assign(automation, updates)
      console.log(`🔄 Automation ${id} updated with:`, Object.keys(updates))
      return automation
    }
    console.log(`❌ Automation ${id} not found for update`)
    return null
  },

  // Delete automation
  delete: (id: string, userAddress: string): boolean => {
    const index = automations.findIndex(auto => auto.id === id && auto.userAddress === userAddress)
    if (index !== -1) {
      automations.splice(index, 1)
      console.log(`🗑️ Automation ${id} deleted. Total automations: ${automations.length}`)
      return true
    }
    console.log(`❌ Automation ${id} not found for deletion`)
    return false
  },

  // Clear all automations (for testing)
  clear: (): void => {
    automations.length = 0
    console.log('🧹 All automations cleared')
  }
}

export const eventStorage = {
  // Create new event
  create: (event: Omit<AutomationEvent, 'id' | 'timestamp'>): AutomationEvent => {
    const newEvent: AutomationEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    automationEvents.push(newEvent)
    console.log(`📝 Event stored: ${event.eventType} for automation ${event.automationId} on chain ${event.chainId}. Total events: ${automationEvents.length}`)
    return newEvent
  },

  // Get events by user
  getByUser: (userAddress: string, limit?: number): AutomationEvent[] => {
    const events = automationEvents
      .filter(event => event.userAddress === userAddress)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    console.log(`🔍 Getting events for user ${userAddress}. Found ${events.length} events total`)
    const result = limit ? events.slice(0, limit) : events
    console.log(`📋 Returning ${result.length} events for user ${userAddress}`)
    return result
  },

  // Get events by automation
  getByAutomation: (automationId: string): AutomationEvent[] => {
    const events = automationEvents
      .filter(event => event.automationId === automationId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    console.log(`🔍 Getting events for automation ${automationId}. Found ${events.length} events`)
    return events
  },

  // Get events by chain
  getByChain: (chainId: number, limit?: number): AutomationEvent[] => {
    const events = automationEvents
      .filter(event => event.chainId === chainId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    console.log(`🔍 Getting events for chain ${chainId}. Found ${events.length} events`)
    const result = limit ? events.slice(0, limit) : events
    console.log(`📋 Returning ${result.length} events for chain ${chainId}`)
    return result
  },

  // Get all events (for debugging)
  getAll: (): AutomationEvent[] => {
    console.log(`📊 Total events in storage: ${automationEvents.length}`)
    return automationEvents
  },

  // Clear all events (for testing)
  clear: (): void => {
    automationEvents.length = 0
    console.log('🧹 All events cleared')
  }
}