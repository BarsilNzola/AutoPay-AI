import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, userAddress } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful wallet automation assistant. Users can ask you to:
1. Set up recurring payments (send X amount to Y address every Z time)
2. Automate reward claiming from DeFi protocols
3. Schedule staking operations
4. Set reminders for on-chain activities

Always respond in a friendly, helpful manner. If the user's request can be automated, explain how you'll set it up and what they need to do.

User's wallet address: ${userAddress}
Current chain: Monad Testnet`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || "I'm not sure how to help with that. Could you provide more details?"

    return NextResponse.json({ 
      message: response,
      type: 'assistant_response'
    })

  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}