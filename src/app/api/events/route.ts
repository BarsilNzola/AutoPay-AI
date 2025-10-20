import { NextRequest, NextResponse } from 'next/server'
import { eventStorage } from '@/lib/automation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')
    const chainId = searchParams.get('chainId')
    
    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    console.log(`🔍 API: Getting events for user ${userAddress}, chain ${chainId}`)
    
    // Get events from server-side storage
    let events;
    if (chainId) {
      events = eventStorage.getByChain(parseInt(chainId));
    } else {
      events = eventStorage.getByUser(userAddress);
    }

    console.log(`📊 API: Found ${events.length} events for user ${userAddress}`)
    
    return NextResponse.json({ 
      success: true,
      events: events 
    })
  } catch (error) {
    console.error('API: Failed to get events:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get events' 
    }, { status: 500 })
  }
}