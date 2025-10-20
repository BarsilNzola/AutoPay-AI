import { NextRequest, NextResponse } from 'next/server';
import { getMonadAnalyticsFromEnvio, getAutomationHistoryFromEnvio } from '@/lib/envio-tracker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');
    
    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    // Get comprehensive analytics from Envio
    const [monadAnalytics, automationHistory] = await Promise.all([
      getMonadAnalyticsFromEnvio(userAddress),
      getAutomationHistoryFromEnvio(userAddress, 10143, 20) // Focus on Monad
    ]);

    return NextResponse.json({
      success: true,
      data: {
        monadAnalytics,
        automationHistory,
        // Add Envio-specific metrics for hackathon demonstration
        envioIntegration: {
          hyperSyncEnabled: true,
          multiChainSupport: true,
          realTimeIndexing: true,
          monadFocus: true
        }
      }
    });

  } catch (error) {
    console.error('Envio analytics failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Envio analytics' },
      { status: 500 }
    );
  }
}