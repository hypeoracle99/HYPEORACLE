import { NextRequest, NextResponse } from 'next/server'
import { createInsforgeServerClient } from '@/lib/insforge'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await context.params

  // Balanced Genesis Fallback default values
  const defaultSpectrum = {
    Greed: 20,
    Fear: 20,
    Hope: 20,
    Confidence: 20,
    Skepticism: 20
  }

  let profileData: any = {
    agent_name: 'Unawakened Soul',
    personality_summary: 'This HypeOracle contributor has not calibrated their personal trading agent yet. Submit vibes to awaken your emotional frequency.',
    risk_tolerance: 50,
    panic_index: 20,
    fomo_index: 20,
    conviction_index: 20,
    trading_style: 'Balanced Genesis',
    total_vibes: 0,
    emotional_spectrum: defaultSpectrum,
    privacy_level: 'public'
  }

  let isCalibrated = false

  try {
    const client = createInsforgeServerClient()
    const { data: profile } = await client.database
      .from('user_vibe_profiles')
      .select('*')
      .eq('user_pubkey', pubkey)
      .maybeSingle()

    if (profile) {
      profileData = profile
      isCalibrated = true
    }
  } catch (err) {
    console.error('Error fetching user profile for JSON metadata:', err)
  }

  const origin = request.nextUrl.origin
  const imageUrl = `${origin}/api/soulprint/${pubkey}/image`
  const externalUrl = `${origin}/my-agent`

  const privacy = profileData.privacy_level || 'public'

  // Construct Response Metadata JSON based on Privacy level
  let metadata: Record<string, any> = {}

  if (privacy === 'private') {
    // Encrypted/Private response: Hide all values
    metadata = {
      name: 'Encrypted Soulprint',
      symbol: 'SOULPRINT',
      description: 'The owner has set their HypeOracle Soulprint to Encrypted. Attributes and emotional frequencies are stored securely and privately on-chain.',
      image: imageUrl,
      external_url: externalUrl,
      attributes: [
        { trait_type: 'Privacy Setting', value: 'Encrypted' },
        { trait_type: 'Identity Level', value: isCalibrated ? `Level ${Math.floor(profileData.total_vibes / 5) + 1}` : 'Level 0' },
        ...(profileData.nft_token_mint ? [{ trait_type: 'On-Chain Mint Address', value: profileData.nft_token_mint }] : [])
      ]
    }
  } else if (privacy === 'anonymous') {
    // Anonymous response: Hide name/avatar but show attributes
    const emotionalBreakdown = (profileData.emotional_spectrum || defaultSpectrum) as Record<string, number>

    metadata = {
      name: 'Anonymous Soulprint',
      symbol: 'SOULPRINT',
      description: 'An anonymized HypeOracle on-chain emotional frequency. Attributes are verified collective indicators.',
      image: imageUrl,
      external_url: externalUrl,
      attributes: [
        { trait_type: 'Privacy Setting', value: 'Anonymous' },
        { trait_type: 'Identity Level', value: isCalibrated ? `Level ${Math.floor(profileData.total_vibes / 5) + 1}` : 'Level 0' },
        { trait_type: 'Trading Style', value: profileData.trading_style },
        { trait_type: 'Risk Tolerance', value: profileData.risk_tolerance },
        { trait_type: 'Confidence / Conviction', value: profileData.conviction_index },
        { trait_type: 'Greed Metric', value: emotionalBreakdown.Greed ?? 20 },
        { trait_type: 'Fear Metric', value: emotionalBreakdown.Fear ?? 20 },
        { trait_type: 'Hope Metric', value: emotionalBreakdown.Hope ?? 20 },
        { trait_type: 'Confidence Metric', value: emotionalBreakdown.Confidence ?? 20 },
        { trait_type: 'Skepticism Metric', value: emotionalBreakdown.Skepticism ?? 20 },
        ...(profileData.nft_token_mint ? [{ trait_type: 'On-Chain Mint Address', value: profileData.nft_token_mint }] : [])
      ]
    }
  } else {
    // Public response: Show everything
    const emotionalBreakdown = (profileData.emotional_spectrum || defaultSpectrum) as Record<string, number>

    metadata = {
      name: `${profileData.agent_name}`,
      symbol: 'SOULPRINT',
      description: profileData.personality_summary,
      image: imageUrl,
      external_url: externalUrl,
      attributes: [
        { trait_type: 'Privacy Setting', value: 'Public' },
        { trait_type: 'Owner Wallet', value: pubkey },
        { trait_type: 'Identity Level', value: isCalibrated ? `Level ${Math.floor(profileData.total_vibes / 5) + 1}` : 'Level 0' },
        { trait_type: 'Trading Style', value: profileData.trading_style },
        { trait_type: 'Risk Tolerance', value: profileData.risk_tolerance },
        { trait_type: 'Conviction Index', value: profileData.conviction_index },
        { trait_type: 'Panic Index', value: profileData.panic_index },
        { trait_type: 'FOMO Index', value: profileData.fomo_index },
        { trait_type: 'Greed Metric', value: emotionalBreakdown.Greed ?? 20 },
        { trait_type: 'Fear Metric', value: emotionalBreakdown.Fear ?? 20 },
        { trait_type: 'Hope Metric', value: emotionalBreakdown.Hope ?? 20 },
        { trait_type: 'Confidence Metric', value: emotionalBreakdown.Confidence ?? 20 },
        { trait_type: 'Skepticism Metric', value: emotionalBreakdown.Skepticism ?? 20 },
        ...(profileData.nft_token_mint ? [{ trait_type: 'On-Chain Mint Address', value: profileData.nft_token_mint }] : [])
      ]
    }
  }

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
