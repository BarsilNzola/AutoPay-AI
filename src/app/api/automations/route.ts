import { NextRequest, NextResponse } from 'next/server'
import { automationStorage } from '@/lib/automation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('user')
    
    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    const automations = automationStorage.getByUser(userAddress)
    
    return NextResponse.json({ 
      automations,
      total: automations.length
    })

  } catch (error) {
    console.error('Failed to fetch automations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

// Optional: Add POST method to create automations directly via API
export async function POST(request: NextRequest) {
  try {
    const { type, description, params, userAddress } = await request.json()

    if (!type || !description || !userAddress) {
      return NextResponse.json({ error: 'Type, description, and userAddress are required' }, { status: 400 })
    }

    const automation = automationStorage.create({
      type,
      description,
      status: 'pending',
      params: params || {},
      userAddress,
    })

    return NextResponse.json({ 
      success: true,
      automation,
      message: 'Automation created successfully'
    })

  } catch (error) {
    console.error('Failed to create automation:', error)
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}

// Optional: Add DELETE method to remove automations
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('id')
    const userAddress = searchParams.get('user')
    
    if (!automationId || !userAddress) {
      return NextResponse.json({ error: 'Automation ID and user address are required' }, { status: 400 })
    }

    const success = automationStorage.delete(automationId, userAddress)
    
    if (!success) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Automation deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete automation:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}