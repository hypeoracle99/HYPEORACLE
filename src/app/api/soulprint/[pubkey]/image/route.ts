import { NextRequest } from 'next/server'
import { createInsforgeServerClient } from '@/lib/insforge'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await context.params

  // Default axes and balanced values (Genesis Fallback)
  const defaultSpectrum = {
    Greed: 20,
    Fear: 20,
    Hope: 20,
    Confidence: 20,
    Skepticism: 20
  }

  let spectrum = defaultSpectrum
  let isCalibrated = false
  let privacyLevel = 'public'
  let totalVibes = 0

  try {
    const client = createInsforgeServerClient()
    const { data: profile } = await client.database
      .from('user_vibe_profiles')
      .select('emotional_spectrum, privacy_level, total_vibes')
      .eq('user_pubkey', pubkey)
      .maybeSingle()

    if (profile) {
      privacyLevel = profile.privacy_level || 'public'
      totalVibes = profile.total_vibes || 0
      
      if (privacyLevel !== 'private' && profile.emotional_spectrum) {
        // Double check formatting of spectrum
        const emotionalBreakdown = profile.emotional_spectrum as Record<string, number>
        if (Object.keys(emotionalBreakdown).length > 0) {
          spectrum = {
            Greed: emotionalBreakdown.Greed ?? 20,
            Fear: emotionalBreakdown.Fear ?? 20,
            Hope: emotionalBreakdown.Hope ?? 20,
            Confidence: emotionalBreakdown.Confidence ?? 20,
            Skepticism: emotionalBreakdown.Skepticism ?? 20
          }
          isCalibrated = true
        }
      }
    }
  } catch (err) {
    console.error('Error fetching user profile for SVG chart:', err)
  }

  // Calculate Level (1-4+)
  const level = Math.floor(totalVibes / 5) + 1

  // Determine theme colors based on level (No Purple/Violet hex rules strictly followed)
  let strokeColor = '#FF6B1A' // Genesis (Orange)
  let fillColor = 'rgba(255, 107, 26, 0.25)'
  let glowColor = 'rgba(255, 107, 26, 0.6)'
  let gridOpacity = '0.1'
  let tierName = 'GENESIS'

  if (level === 2) {
    strokeColor = '#10b981' // Sentinel (Emerald Green)
    fillColor = 'rgba(16, 185, 129, 0.25)'
    glowColor = 'rgba(16, 185, 129, 0.6)'
    gridOpacity = '0.1'
    tierName = 'SENTINEL'
  } else if (level === 3) {
    strokeColor = '#06b6d4' // Elite (Cyber Cyan)
    fillColor = 'rgba(6, 182, 212, 0.25)'
    glowColor = 'rgba(6, 182, 212, 0.6)'
    gridOpacity = '0.1'
    tierName = 'ELITE'
  } else if (level >= 4) {
    strokeColor = '#fbbf24' // Legendary (Sovereign Gold)
    fillColor = 'rgba(251, 191, 36, 0.25)'
    glowColor = 'rgba(251, 191, 36, 0.65)'
    gridOpacity = '0.15'
    tierName = 'LEGENDARY'
  }

  // Draw SVG
  const size = 320
  const center = size / 2
  const radius = (size / 2) * 0.65
  const axes = Object.keys(spectrum)
  const values = Object.values(spectrum)
  const angleStep = (Math.PI * 2) / axes.length

  const getCoords = (val: number, i: number, r: number) => {
    const angle = i * angleStep - Math.PI / 2
    const distance = (val / 100) * r
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance
    }
  }

  // Generate background grid levels
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
  const gridPolygons = gridLevels.map(level => {
    const points = axes.map((_, i) => {
      const { x, y } = getCoords(100, i, radius * level)
      return `${x},${y}`
    }).join(' ')
    return `<polygon points="${points}" fill="none" stroke="${strokeColor}" stroke-opacity="${gridOpacity}" stroke-width="1" />`
  }).join('\n')

  // Generate axis radial lines
  const axisLines = axes.map((_, i) => {
    const { x, y } = getCoords(100, i, radius)
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="${strokeColor}" stroke-opacity="${gridOpacity}" stroke-width="1" />`
  }).join('\n')

  // Generate active data polygon
  const dataPoints = axes.map((_, i) => {
    const { x, y } = getCoords(values[i], i, radius)
    return `${x},${y}`
  }).join(' ')

  // Dynamic concentric golden/neon orbits for Legendary levels
  let legendaryRings = ''
  if (level >= 4 && privacyLevel !== 'private') {
    legendaryRings = `
      <circle cx="${center}" cy="${center}" r="${radius * 0.4}" fill="none" stroke="${strokeColor}" stroke-opacity="0.05" stroke-width="1" />
      <circle cx="${center}" cy="${center}" r="${radius * 0.75}" fill="none" stroke="${strokeColor}" stroke-opacity="0.06" stroke-width="1.5" stroke-dasharray="4,4" />
      <circle cx="${center}" cy="${center}" r="${radius * 1.12}" fill="none" stroke="${strokeColor}" stroke-opacity="0.08" stroke-width="2" />
    `
  }

  // Generate labels
  const textLabels = axes.map((label, i) => {
    const { x, y } = getCoords(120, i, radius)
    const val = values[i]
    return `
      <text 
        x="${x}" 
        y="${y - 4}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="rgba(255, 255, 255, 0.5)" 
        font-family="monospace" 
        font-size="9" 
        letter-spacing="1"
      >
        ${label.toUpperCase()}
      </text>
      <text 
        x="${x}" 
        y="${y + 6}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="#FFFFFF" 
        font-family="monospace" 
        font-weight="bold" 
        font-size="9"
      >
        ${privacyLevel === 'private' ? '??' : `${val}%`}
      </text>
    `
  }).join('\n')

  const titleText = privacyLevel === 'private' 
    ? 'ENCRYPTED IDENTITY' 
    : isCalibrated 
      ? `LEVEL ${level} ${tierName}` 
      : 'UNAWAKENED SOULPRINT'

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.15" />
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="#050507" />
      <circle cx="${center}" cy="${center}" r="${radius * 1.2}" fill="url(#bg-glow)" />

      ${gridPolygons}
      ${axisLines}
      ${legendaryRings}

      ${privacyLevel === 'private' ? `
        <circle cx="${center}" cy="${center}" r="30" fill="rgba(255, 107, 26, 0.05)" stroke="${strokeColor}" stroke-width="1.5" />
        <path d="M ${center - 8} ${center + 4} L ${center + 8} ${center + 4} L ${center + 8} ${center - 4} L ${center - 8} ${center - 4} Z" fill="none" stroke="${strokeColor}" stroke-width="1.5" />
        <path d="M ${center - 5} ${center - 4} A 5 5 0 0 1 ${center + 5} ${center - 4}" fill="none" stroke="${strokeColor}" stroke-width="1.5" />
      ` : `
        <polygon 
          points="${dataPoints}" 
          fill="${fillColor}" 
          stroke="${strokeColor}" 
          stroke-width="2.5" 
          filter="url(#glow)"
        />
        ${axes.map((_, i) => {
          const { x, y } = getCoords(values[i], i, radius)
          return `<circle cx="${x}" cy="${y}" r="4.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />`
        }).join('\n')}
      `}

      <rect x="${center - 75}" y="12" width="150" height="20" rx="6" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
      <text 
        x="${center}" 
        y="22" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="${isCalibrated && privacyLevel !== 'private' ? strokeColor : '#FF6B1A'}" 
        font-family="monospace" 
        font-size="8" 
        font-weight="bold" 
        letter-spacing="1.5"
      >
        ${titleText}
      </text>

      ${textLabels}
    </svg>
  `

  return new Response(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
