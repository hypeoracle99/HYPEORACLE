import { NextResponse } from 'next/server'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { BAGS_API_KEY, GET_CONNECTION } from '@/lib/constants'

export const revalidate = 60 // Cache for 60 seconds to avoid spamming the RPC

export async function GET() {
  try {
    const connection = GET_CONNECTION(0)
    const sdk = new BagsSDK(BAGS_API_KEY, connection, 'processed')
    const topTokens = await sdk.state.getTopTokensByLifetimeFees()
    
    return NextResponse.json({ data: topTokens })
  } catch (error: any) {
    console.error('[API/Ticker] Error fetching Bags data:', error.message)
    return NextResponse.json({ error: 'Failed to fetch ticker data' }, { status: 500 })
  }
}
