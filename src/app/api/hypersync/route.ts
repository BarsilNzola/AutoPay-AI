import { NextRequest, NextResponse } from 'next/server'

// Chain ID to HyperSync URL mapping
const CHAIN_CONFIGS: { [chainId: number]: string } = {
  10143: 'https://monad-testnet.hypersync.xyz',
  1: 'https://eth.hypersync.xyz',
  11155111: 'https://sepolia-hypersync.xyz',
  137: 'https://polygon.hypersync.xyz',
  42161: 'https://arbitrum.hypersync.xyz',
  10: 'https://optimism.hypersync.xyz',
  8453: 'https://base.hypersync.xyz',
}

export async function POST(request: NextRequest) {
  try {
    const { chainId, query } = await request.json()

    if (!chainId || !query) {
      return NextResponse.json({ error: 'Chain ID and query are required' }, { status: 400 })
    }

    const url = CHAIN_CONFIGS[chainId]
    if (!url) {
      return NextResponse.json({ error: `Unsupported chain ID: ${chainId}` }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_ENVIO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Envio API key not configured' }, { status: 500 })
    }

    console.log(`🔗 Proxying HyperSync query to chain ${chainId}: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(query),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ HyperSync proxy error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `HyperSync API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`✅ HyperSync proxy successful for chain ${chainId}`)
    
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('HyperSync proxy failed:', error)
    return NextResponse.json(
      { error: 'Failed to proxy HyperSync request' },
      { status: 500 }
    )
  }
}