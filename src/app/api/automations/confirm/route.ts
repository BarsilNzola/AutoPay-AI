import { NextRequest, NextResponse } from 'next/server'
import { automationStorage } from '@/lib/automation'
import { 
  trackAutomationInEnvio, 
  trackTransactionInEnvio 
} from '@/lib/envio-tracker'

export async function POST(request: NextRequest) {
  try {
    const { automationId, userAddress, signedDelegation, transactionHash, chainId, isSimulated } = await request.json()

    if (!automationId || !userAddress || !signedDelegation) {
      return NextResponse.json({ 
        error: 'Automation ID, user address, and signed delegation are required' 
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

    // Calculate next execution
    const nextExecution = calculateNextExecution(automation.params?.frequency || 'weekly')
    
    // Update automation with delegation data
    const updatedAutomation = automationStorage.update(automationId, {
      status: 'active',
      delegationId: signedDelegation.delegationId,
      transactionHash: transactionHash,
      delegationData: signedDelegation,
      nextExecution: nextExecution,
      // Add chain fields
      chainId: chainId,
      isSimulated: isSimulated
    })
    
    if (!updatedAutomation) {
      return NextResponse.json({ 
        error: 'Failed to update automation' 
      }, { status: 500 })
    }

    // Track in Envio
    await trackAutomationInEnvio({
      automationId: automation.id,
      userAddress,
      delegationData: signedDelegation,
      type: automation.type,
      params: automation.params,
      status: 'active',
      createdAt: new Date().toISOString(),
      // Add chain fields
      chainId: chainId,
      isSimulated: isSimulated
    })

    // Track the delegation transaction if we have a hash
    if (transactionHash) {
      await trackTransactionInEnvio({
        automationId: automation.id,
        userAddress,
        transactionHash: transactionHash,
        type: 'delegation_created',
        status: 'success',
        timestamp: new Date().toISOString(),
        details: {
          delegationId: signedDelegation.delegationId,
          type: automation.type
        },
        // Add chain fields
        chainId: chainId,
        isSimulated: isSimulated
      })
    }

    console.log('Automation activated:', {
      id: automationId,
      type: updatedAutomation.type,
      user: userAddress,
      chainId: chainId,
      isSimulated: isSimulated,
      delegationId: signedDelegation.delegationId,
      transactionHash: transactionHash
    })

    return NextResponse.json({ 
      success: true,
      message: getSuccessMessage(updatedAutomation, chainId, isSimulated),
      automation: updatedAutomation,
      transaction: transactionHash ? {
        hash: transactionHash,
        explorerUrl: getExplorerUrl(chainId, transactionHash)
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

function getExplorerUrl(chainId: number, transactionHash: string): string {
  switch (chainId) {
    case 10143: // Monad
      return `https://testnet.monadexplorer.com/tx/${transactionHash}`
    case 11155111: // Sepolia
      return `https://sepolia.etherscan.io/tx/${transactionHash}`
    case 1: // Ethereum
      return `https://etherscan.io/tx/${transactionHash}`
    case 5: // Goerli
      return `https://goerli.etherscan.io/tx/${transactionHash}`
    case 137: // Polygon
      return `https://polygonscan.com/tx/${transactionHash}`
    case 80001: // Mumbai
      return `https://mumbai.polygonscan.com/tx/${transactionHash}`
    default:
      return `https://etherscan.io/tx/${transactionHash}`
  }
}

function getSuccessMessage(automation: any, chainId: number, isSimulated: boolean): string {
  const chainName = getChainName(chainId)
  const mode = isSimulated ? '(Simulated Delegation)' : '(Real On-Chain Delegation)'
  
  switch (automation.type) {
    case 'recurring_payment':
      return `Recurring payment activated on ${chainName}! ${mode} I'll send ${automation.params?.amount} ${automation.params?.currency} to ${automation.params?.recipient} ${automation.params?.frequency}.`
    case 'reward_claim':
      return `Reward claim automation activated on ${chainName}! ${mode} I'll automatically claim your staking rewards ${automation.params?.frequency}.`
    case 'staking':
      return `Staking automation activated on ${chainName}! ${mode} Your staking operations will run ${automation.params?.frequency}.`
    default:
      return `Automation activated on ${chainName}! ${mode} Smart contract delegation is now active.`
  }
}

function getChainName(chainId: number): string {
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

    return NextResponse.json({ 
      automation,
      isConfirmed: automation.status === 'active',
      onChainActive: !!automation.delegationId
    })

  } catch (error) {
    console.error('Failed to check automation status:', error)
    return NextResponse.json(
      { error: 'Failed to check automation status' },
      { status: 500 }
    )
  }
}