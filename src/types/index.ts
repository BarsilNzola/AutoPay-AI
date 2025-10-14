export interface Automation {
    id: string
    type: 'payment' | 'claim' | 'stake' | 'reminder'
    description: string
    params: any
    status: 'active' | 'pending' | 'completed' | 'failed'
    nextExecution?: string
    createdAt: Date
}
  
export interface ParsedCommand {
    action: string
    params: {
      amount?: string
      currency?: string
      recipient?: string
      frequency?: string
      dayOfWeek?: string
      time?: string
    }
    confidence: number
}