import { NextRequest, NextResponse } from 'next/server'
import { automationStorage } from '@/lib/automation'
import { DelegationService } from '@/lib/delegation-service'
import { 
  trackAutomationInEnvio, 
  trackTransactionInEnvio 
} from '@/lib/envio-tracker'

export async function POST(request: NextRequest) {
  try {
    const { automationId, userAddress } = await request.json()

    if (!automationId || !userAddress) {
      return NextResponse.json({ 
        error: 'Automation ID and user address are required' 
      }, { status: 400 })
    }

    // Verify the automation exists and belongs to the user
    const userAutomations = automationStorage.getByUser(userAddress)
    const automation = userAutomations.find(auto => auto.id === automationId)
    
    if (!automation) {
      return NextResponse.json({ 
        error: 'Automation not found or access denied' 
      }, { status: 404 })
    }

    // Set up on-chain delegation
    const delegationService = new DelegationService()
    const delegationResult = await delegationService.setupAutomationDelegation(automation)
    
    if (!delegationResult.success) {
      return NextResponse.json({ 
        error: `Failed to set up on-chain delegation: ${delegationResult.error}` 
      }, { status: 500 })
    }

    // Update automation status to active with real delegation data
    const updatedAutomation = automationStorage.updateStatus(automationId, 'active')
    
    if (!updatedAutomation) {
      return NextResponse.json({ 
        error: 'Failed to update automation' 
      }, { status: 500 })
    }

    // Add delegation data to the automation
    const automationWithDelegation = {
      ...updatedAutomation,
      delegationId: delegationResult.delegationId,
      transactionHash: delegationResult.transactionHash,
      delegationData: delegationResult.delegation
    };

    // Track in Envio
    await trackAutomationInEnvio({
      automationId: automation.id,
      userAddress,
      delegationData: delegationResult.delegation,
      type: automation.type,
      params: automation.params,
      status: 'active',
      createdAt: new Date().toISOString()
    })

    // Track the delegation transaction
    if (delegationResult.transactionHash) {
      await trackTransactionInEnvio({
        automationId: automation.id,
        userAddress,
        transactionHash: delegationResult.transactionHash,
        type: 'delegation_created',
        status: 'success',
        timestamp: new Date().toISOString(),
        details: {
          delegationId: delegationResult.delegationId,
          type: automation.type
        }
      })
    }

    // Calculate next execution based on frequency
    const nextExecution = calculateNextExecution(automation.params?.frequency || 'weekly')
    
    console.log('Real on-chain automation activated:', {
      id: automationId,
      type: updatedAutomation.type,
      user: userAddress,
      delegationId: delegationResult.delegationId,
      transactionHash: delegationResult.transactionHash
    })

    return NextResponse.json({ 
      success: true,
      message: getSuccessMessage(updatedAutomation),
      automation: {
        ...automationWithDelegation,
        nextExecution: nextExecution.toISOString(),
        delegationId: delegationResult.delegationId,
        transactionHash: delegationResult.transactionHash,
        onChainData: delegationResult.delegation
      },
      transaction: delegationResult.transactionHash ? {
        hash: delegationResult.transactionHash,
        explorerUrl: `https://testnet.monadexplorer.com/tx/${delegationResult.transactionHash}`
      } : undefined
    })

  } catch (error) {
    console.error('Failed to confirm automation:', error)
    return NextResponse.json(
      { error: 'Failed to confirm automation' },
      { status: 500 }
    )
  }
}

function calculateNextExecution(frequency: string): Date {
  const nextExecution = new Date()
  
  switch (frequency?.toLowerCase()) {
    case 'daily':
      nextExecution.setDate(nextExecution.getDate() + 1)
      break
    case 'weekly':
      nextExecution.setDate(nextExecution.getDate() + 7)
      break
    case 'monthly':
      nextExecution.setMonth(nextExecution.getMonth() + 1)
      break
    default:
      nextExecution.setDate(nextExecution.getDate() + 7)
  }
  
  return nextExecution
}

function getSuccessMessage(automation: any): string {
  switch (automation.type) {
    case 'recurring_payment':
      return `✅ Recurring payment activated on-chain! I'll send ${automation.params?.amount} ${automation.params?.currency} to ${automation.params?.recipient} ${automation.params?.frequency}.`
    case 'reward_claim':
      return `✅ Reward claim automation activated! I'll automatically claim your staking rewards ${automation.params?.frequency}.`
    case 'staking':
      return `✅ Staking automation activated! Your staking operations will run ${automation.params?.frequency}.`
    default:
      return `✅ Automation activated on-chain! Smart contract delegation is now active.`
  }
}

// Check delegation status on-chain
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('id')
    const userAddress = searchParams.get('user')
    
    if (!automationId || !userAddress) {
      return NextResponse.json({ 
        error: 'Automation ID and user address are required' 
      }, { status: 400 })
    }

    const userAutomations = automationStorage.getByUser(userAddress)
    const automation = userAutomations.find(auto => auto.id === automationId)
    
    if (!automation) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 })
    }

    // Check on-chain status using DelegationService
    const delegationService = new DelegationService()
    const isActive = (automation as any).delegationId ? 
      await delegationService.checkDelegationStatus((automation as any).delegationId) : 
      false

    return NextResponse.json({ 
      automation,
      isConfirmed: automation.status === 'active',
      onChainActive: isActive
    })

  } catch (error) {
    console.error('Failed to check automation status:', error)
    return NextResponse.json(
      { error: 'Failed to check automation status' },
      { status: 500 }
    )
  }
}