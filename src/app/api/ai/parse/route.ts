import { NextRequest, NextResponse } from 'next/server'
import { automationStorage } from '@/lib/automation'
import { InferenceClient } from '@huggingface/inference'

// Initialize Hugging Face Inference Client
const hf = new InferenceClient(process.env.HUGGING_FACE_API_KEY)

/**
 * POST /api/ai/parse
 */
export async function POST(request: NextRequest) {
  try {
    const { message, userAddress } = await request.json()
    if (!message || !userAddress) {
      return NextResponse.json({ error: 'Message and userAddress are required' }, { status: 400 })
    }

    // First, try simple parser (local)
    const parsedCommand = parseUserCommand(message)
    if (parsedCommand) {
      const automation = automationStorage.create({
        type: parsedCommand.type,
        description: generateDescription(parsedCommand),
        status: 'pending',
        params: parsedCommand.params,
        userAddress,
      })
      return NextResponse.json({
        message: `I'll set that up for you! ${generateUserFriendlyMessage(parsedCommand)}`,
        automation,
        requiresConfirmation: true,
        type: 'automation_created',
      })
    }

    // Only attempt HF models if key present
    if (!process.env.HUGGING_FACE_API_KEY) {
      return handleFallbackResponse(message)
    }

    const aiResponse = await queryHuggingFaceWithFallback(message, userAddress)

    if (aiResponse.type === 'automation' && aiResponse.suggested_automation) {
      const automation = automationStorage.create({
        type: aiResponse.suggested_automation.type,
        description: `Automated ${aiResponse.suggested_automation.type.replace('_', ' ')}`,
        status: 'pending',
        params: {},
        userAddress,
      })
      return NextResponse.json({
        message: aiResponse.message,
        automation,
        requiresConfirmation: false,
        missingParams: aiResponse.suggested_automation.missing_params,
        type: 'automation_draft',
      })
    }

    // Final fallback: local parser again
    const finalParsed = parseUserCommand(message)
    if (finalParsed) {
      const automation = automationStorage.create({
        type: finalParsed.type,
        description: generateDescription(finalParsed),
        status: 'pending',
        params: finalParsed.params,
        userAddress,
      })
      return NextResponse.json({
        message: `I'll set that up for you! ${generateUserFriendlyMessage(finalParsed)}`,
        automation,
        requiresConfirmation: true,
        type: 'automation_created',
      })
    }

    // Nothing works — send AI message or generic fallback
    return NextResponse.json({
      message: aiResponse.message || "I'm not sure how to help with that. Try: 'Send 0.01 ETH weekly' or 'Claim rewards daily'.",
      type: 'assistant_response',
    })

  } catch (error) {
    console.error('AI API error:', error)
    // Emergency fallback: local parser
    try {
      const { message: errMsg, userAddress: errAddr } = await request.json()
      const parsed = parseUserCommand(errMsg)
      if (parsed && errAddr) {
        const automation = automationStorage.create({
          type: parsed.type,
          description: generateDescription(parsed),
          status: 'pending',
          params: parsed.params,
          userAddress: errAddr,
        })
        return NextResponse.json({
          message: `I'll set that up for you! ${generateUserFriendlyMessage(parsed)}`,
          automation,
          requiresConfirmation: true,
          type: 'automation_created',
        })
      }
    } catch (inner) {
      console.error('Final fallback also failed:', inner)
    }
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}


/**
 * Try multiple Hugging Face models sequentially, fall back to parser
 */
async function queryHuggingFaceWithFallback(message: string, userAddress: string): Promise<any> {
  const prompt = buildPrompt(message, userAddress)

  // Use models likely to be supported — adjust as needed for your account
  const models = [
    'HuggingFaceH4/zephyr-7b-beta',  // instruction-capable model
    'meta-llama/Llama-2-7b-chat-hf',  // a chat / instruction model
    'google/flan-t5-large',          // text2text (if available)
  ]

  for (const model of models) {
    try {
      console.log(`🔍 Trying model: ${model}`)
      const response = await hf.textGeneration({
        model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.3,
          do_sample: true,
        },
      }) as any

      const generatedText = (response.generated_text || response || '').toString().trim()
      console.log(`✅ Model responded (${model}):`, generatedText.substring(0, 80))

      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        parsed._modelUsed = model
        return parsed
      }

      // Interpret plain text fallback
      return analyzeTextResponse(generatedText, message)
    } catch (err: any) {
      console.warn(`⚠️ Model ${model} failed:`, err.message)
      // If provider missing or 503, continue to next model
      if (err.message?.includes('No Inference Provider') || err.message?.includes('unsupported')) {
        continue
      }
      if (err.response?.status === 503) {
        continue
      }
    }
  }

  console.warn('⚠️ All Hugging Face models failed. Using local parser fallback.')

  const localParsed = parseUserCommand(message)
  if (localParsed) {
    return {
      type: 'automation',
      message: `I'll set that up for you! ${generateUserFriendlyMessage(localParsed)}`,
      suggested_automation: {
        type: localParsed.type,
        missing_params: getMissingParams(localParsed),
      }
    }
  }

  return {
    type: 'general',
    message: "I can help set up automations like recurring payments, staking, or reminders. Try: 'Send 0.01 ETH every week' or 'Claim rewards daily'.",
    suggested_automation: null,
  }
}

/** Build the instruction prompt */
function buildPrompt(message: string, userAddress: string) {
  return `You are a wallet automation assistant. Analyze if the user wants to create an on-chain automation.

Available automation types:
- recurring_payment: Send X amount to Y address every Z time
- reward_claim: Automatically claim staking rewards
- staking: Automate staking
- reminder: Set reminders for on-chain activities

User wallet: ${userAddress}
Chain: Monad testnet

User: "${message}"

Respond with JSON only:
{
  "type": "automation" | "clarification" | "general",
  "message": "Your human-friendly reply",
  "suggested_automation": {
    "type": "recurring_payment" | "reward_claim" | "staking" | "reminder",
    "missing_params": ["amount", "recipient", "frequency"]
  } | null
}`
}

/** Fallback analysis of plain text */
function analyzeTextResponse(generatedText: string, originalMessage: string): any {
  // Try local command parser first
  const local = parseUserCommand(originalMessage)
  if (local) {
    return {
      type: 'automation',
      message: `I'll set that up for you! ${generateUserFriendlyMessage(local)}`,
      suggested_automation: {
        type: local.type,
        missing_params: getMissingParams(local),
      }
    }
  }

  const lower = generatedText.toLowerCase()
  if (lower.includes('send') || lower.includes('transfer') || lower.includes('payment')) {
    return {
      type: 'automation',
      message: generatedText,
      suggested_automation: { type: 'recurring_payment', missing_params: ['amount', 'recipient', 'frequency'] }
    }
  }
  if (lower.includes('claim') || lower.includes('reward')) {
    return {
      type: 'automation',
      message: generatedText,
      suggested_automation: { type: 'reward_claim', missing_params: ['frequency'] }
    }
  }
  if (lower.includes('stake')) {
    return {
      type: 'automation',
      message: generatedText,
      suggested_automation: { type: 'staking', missing_params: ['frequency', 'amount'] }
    }
  }
  if (lower.includes('remind') || lower.includes('alert') || lower.includes('notify')) {
    return {
      type: 'automation',
      message: generatedText,
      suggested_automation: { type: 'reminder', missing_params: ['time', 'message'] }
    }
  }
  return {
    type: 'general',
    message: generatedText || "I’m not sure how to help with that.",
    suggested_automation: null,
  }
}

/** Compute missing parameters for a parsed command */
function getMissingParams(parsedCommand: any): string[] {
  switch (parsedCommand.type) {
    case 'recurring_payment':
      return ['amount', 'recipient', 'frequency'].filter(p => !parsedCommand.params[p])
    case 'reward_claim':
      return ['frequency'].filter(p => !parsedCommand.params[p])
    case 'staking':
      return ['frequency', 'amount'].filter(p => !parsedCommand.params[p])
    case 'reminder':
      return ['time', 'message'].filter(p => !parsedCommand.params[p])
    default:
      return []
  }
}

/** Fallback when no HF key or models */
function handleFallbackResponse(message: string) {
  const parsed = parseUserCommand(message)
  if (parsed) {
    return NextResponse.json({
      message: `I'll set that up for you! ${generateUserFriendlyMessage(parsed)}`,
      automation: {
        type: parsed.type,
        description: generateDescription(parsed),
        status: 'pending',
        params: parsed.params,
      },
      requiresConfirmation: true,
      type: 'automation_created'
    })
  }

  const lower = message.toLowerCase()
  if (lower.includes('payment') || lower.includes('send')) {
    return NextResponse.json({ message: "I can help you set up recurring payments. Please specify amount, recipient, and frequency.", type: 'clarification' })
  }
  if (lower.includes('claim') || lower.includes('reward')) {
    return NextResponse.json({ message: "I can automate reward claims. Please specify frequency (daily, weekly).", type: 'clarification' })
  }
  if (lower.includes('stake')) {
    return NextResponse.json({ message: "I can automate staking. Please specify amount and frequency.", type: 'clarification' })
  }
  return NextResponse.json({
    message: "Try commands like: 'Send 0.01 ETH weekly' or 'Claim rewards daily'.",
    type: 'general'
  })
}

/** Local command parser (as before) */
function parseUserCommand(message: string): any {
  const lower = message.toLowerCase().trim()
  // Recurring payment pattern
  if ((lower.includes('send') || lower.includes('pay') || lower.includes('transfer'))
    && (lower.includes('every') || lower.includes('weekly') || lower.includes('monthly') || lower.includes('daily'))) {
    const amount = message.match(/(\d+\.?\d*)\s*(ETH|USDC|USDT|MON)/i)
    const to = message.match(/to\s+(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]+\.eth)/i)
    const freq = message.match(/(daily|weekly|monthly|every day|every week|every month)/i)
    if (amount && to) {
      return {
        type: 'recurring_payment',
        params: {
          amount: amount[1],
          currency: amount[2]?.toUpperCase(),
          recipient: to[1],
          frequency: freq ? freq[1].toLowerCase() : 'weekly',
        },
      }
    }
  }

  // Reward claim
  if ((lower.includes('claim') && lower.includes('reward')) || lower.includes('auto claim') || lower.includes('claim automatically') || lower.includes('claim rewards')) {
    return {
      type: 'reward_claim',
      params: { frequency: lower.includes('daily') ? 'daily' : 'weekly' }
    }
  }

  // Staking
  if ((lower.includes('stake') && lower.includes('every')) || lower.includes('auto stake') || lower.includes('stake automatically') || lower.includes('stake tokens')) {
    return {
      type: 'staking',
      params: { frequency: lower.includes('daily') ? 'daily' : 'weekly' }
    }
  }

  // Reminder
  if (lower.includes('remind') || lower.includes('alert') || lower.includes('notify')) {
    return {
      type: 'reminder',
      params: { frequency: 'once', message }
    }
  }

  return null
}

function generateDescription(cmd: any): string {
  switch (cmd.type) {
    case 'recurring_payment':
      return `Send ${cmd.params.amount} ${cmd.params.currency} to ${cmd.params.recipient} ${cmd.params.frequency}`
    case 'reward_claim':
      return `Claim rewards ${cmd.params.frequency}`
    case 'staking':
      return `Stake tokens ${cmd.params.frequency}`
    case 'reminder':
      return `Reminder: ${cmd.params.message.substring(0, 50)}...`
    default:
      return 'Automated on-chain action'
  }
}

function generateUserFriendlyMessage(cmd: any): string {
  switch (cmd.type) {
    case 'recurring_payment':
      return `I'll send ${cmd.params.amount} ${cmd.params.currency} to ${cmd.params.recipient} ${cmd.params.frequency}. Please confirm this setup.`
    case 'reward_claim':
      return `I'll automatically claim your rewards ${cmd.params.frequency}. Please confirm this setup.`
    case 'staking':
      return `I'll automate staking ${cmd.params.frequency}. Please confirm.`
    case 'reminder':
      return `I'll set up a reminder for you. Please confirm.`
    default:
      return 'Your automation request is pending confirmation.'
  }
}
