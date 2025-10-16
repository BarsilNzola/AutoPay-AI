import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { automationStorage } from '@/lib/automation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, userAddress } = await request.json()

    if (!message || !userAddress) {
      return NextResponse.json({ error: 'Message and userAddress are required' }, { status: 400 })
    }

    // First, try to parse with our simple parser for immediate automation creation
    const parsedCommand = parseUserCommand(message)
    
    if (parsedCommand) {
      // Create automation based on parsed command
      const automation = automationStorage.create({
        type: parsedCommand.type,
        description: generateDescription(parsedCommand),
        status: 'pending', // Requires user confirmation
        params: parsedCommand.params,
        userAddress,
      })

      const friendlyMessage = generateUserFriendlyMessage(parsedCommand)

      return NextResponse.json({ 
        message: `I'll set that up for you! ${friendlyMessage}`,
        automation,
        requiresConfirmation: true,
        type: 'automation_created'
      })
    }

    // If our simple parser doesn't understand, use OpenAI for better understanding
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful wallet automation assistant. Analyze if the user wants to create an automation for:

1. RECURRING_PAYMENT - Send X amount to Y address every Z time
2. REWARD_CLAIM - Automatically claim staking rewards
3. STAKING - Automate staking operations
4. REMINDER - Set reminders for on-chain activities

If it's an automation request but missing details, ask for clarification.
If it's not an automation request, respond helpfully.

Format your response as JSON:
{
  "type": "automation" | "clarification" | "general",
  "message": "Your response text",
  "suggested_automation": {
    "type": "recurring_payment" | "reward_claim" | "staking" | "reminder",
    "missing_params": ["amount", "recipient", "frequency", etc.]
  } | null
}

User's wallet: ${userAddress}
Chain: Monad Testnet`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || "I'm not sure how to help with that. Could you provide more details?"
    
    try {
      // Try to parse OpenAI's JSON response
      const aiResponse = JSON.parse(responseText)
      
      if (aiResponse.type === 'automation' && aiResponse.suggested_automation) {
        // Create automation based on AI understanding
        const automation = automationStorage.create({
          type: aiResponse.suggested_automation.type,
          description: `Automated ${aiResponse.suggested_automation.type.replace('_', ' ')}`,
          status: 'pending',
          params: {}, // Will be filled after user provides missing details
          userAddress,
        })

        return NextResponse.json({ 
          message: aiResponse.message,
          automation,
          requiresConfirmation: false, // Don't confirm until details are filled
          missingParams: aiResponse.suggested_automation.missing_params,
          type: 'automation_draft'
        })
      }

      return NextResponse.json({ 
        message: aiResponse.message,
        type: 'assistant_response'
      })

    } catch (parseError) {
      // If OpenAI returns non-JSON, use it as a regular response
      return NextResponse.json({ 
        message: responseText,
        type: 'assistant_response'
      })
    }

  } catch (error) {
    console.error('AI API error:', error)
    
    // Fallback to simple parser if OpenAI fails - pass the original message and userAddress
    const { message: errorMessage, userAddress: errorUserAddress } = await request.json().catch(() => ({ message: '', userAddress: '' }))
    
    const parsedCommand = parseUserCommand(errorMessage)
    if (parsedCommand && errorUserAddress) {
      const automation = automationStorage.create({
        type: parsedCommand.type,
        description: generateDescription(parsedCommand),
        status: 'pending',
        params: parsedCommand.params,
        userAddress: errorUserAddress,
      })

      return NextResponse.json({ 
        message: `I'll set that up for you! ${generateUserFriendlyMessage(parsedCommand)}`,
        automation,
        requiresConfirmation: true,
        type: 'automation_created'
      })
    }

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Simple command parser for common patterns (fast and free)
function parseUserCommand(message: string): any {
  const lowerMessage = message.toLowerCase()
  
  if ((lowerMessage.includes('send') || lowerMessage.includes('pay')) && 
      (lowerMessage.includes('every') || lowerMessage.includes('weekly') || lowerMessage.includes('monthly'))) {
    
    const amountMatch = message.match(/(\d+\.?\d*)\s*(ETH|MATIC|MON|USDC|USDT)/i)
    const toMatch = message.match(/to\s+(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]+\.eth)/i)
    const frequencyMatch = message.match(/(daily|weekly|monthly|every day|every week|every month)/i)
    const dayMatch = message.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
    
    if (amountMatch && toMatch) {
      return {
        type: 'recurring_payment' as const,
        params: {
          amount: amountMatch[1],
          currency: amountMatch[2]?.toUpperCase(),
          recipient: toMatch[1],
          frequency: frequencyMatch ? frequencyMatch[1].toLowerCase() : 'weekly',
          dayOfWeek: dayMatch ? dayMatch[1].toLowerCase() : undefined,
        }
      }
    }
  }
  
  if (lowerMessage.includes('claim') && lowerMessage.includes('reward')) {
    return {
      type: 'reward_claim' as const,
      params: {
        frequency: lowerMessage.includes('daily') ? 'daily' : 'weekly',
      }
    }
  }

  if (lowerMessage.includes('stake') && lowerMessage.includes('every')) {
    return {
      type: 'staking' as const,
      params: {
        frequency: lowerMessage.includes('daily') ? 'daily' : 'weekly',
      }
    }
  }
  
  return null
}

function generateDescription(parsedCommand: any): string {
  switch (parsedCommand.type) {
    case 'recurring_payment':
      return `Send ${parsedCommand.params.amount} ${parsedCommand.params.currency} to ${parsedCommand.params.recipient} ${parsedCommand.params.frequency}`
    case 'reward_claim':
      return `Claim staking rewards ${parsedCommand.params.frequency}`
    case 'staking':
      return `Stake tokens ${parsedCommand.params.frequency}`
    default:
      return 'Automated on-chain task'
  }
}

function generateUserFriendlyMessage(parsedCommand: any): string {
  switch (parsedCommand.type) {
    case 'recurring_payment':
      return `I'll send ${parsedCommand.params.amount} ${parsedCommand.params.currency} to ${parsedCommand.params.recipient} ${parsedCommand.params.frequency}. You'll need to confirm this setup.`
    case 'reward_claim':
      return `I'll automatically claim your staking rewards ${parsedCommand.params.frequency}. You'll need to confirm this setup.`
    case 'staking':
      return `I'll automate your staking operations ${parsedCommand.params.frequency}. You'll need to confirm this setup.`
    default:
      return 'Your automation has been created and is pending confirmation.'
  }
}