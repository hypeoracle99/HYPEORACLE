'use client'

import { motion } from 'framer-motion'

interface SoulprintRadarChartProps {
  spectrum: Record<string, number>
  size?: number
  totalVibes?: number
}

export function SoulprintRadarChart({ spectrum, size = 300, totalVibes = 0 }: SoulprintRadarChartProps) {
  // Default emotional axes if data is missing or empty
  const defaultData = {
    Greed: 20,
    Fear: 20,
    Hope: 20,
    Confidence: 20,
    Skepticism: 20
  }
  
  const axes = Object.keys(spectrum || {}).length > 0 ? Object.keys(spectrum) : Object.keys(defaultData)
  const values = Object.keys(spectrum || {}).length > 0 ? Object.values(spectrum) : Object.values(defaultData)
  
  const center = size / 2
  const radius = (size / 2) * 0.7 // Leave space for labels
  const angleStep = (Math.PI * 2) / axes.length

  const level = Math.floor(totalVibes / 5) + 1

  // Dynamic colors based on level (Color rules strictly followed)
  let strokeColor = '#FF6B1A'
  let fillColor = 'rgba(255, 107, 26, 0.2)'
  let shadowColor = 'rgba(255, 107, 26, 0.4)'

  if (level === 2) {
    strokeColor = '#10b981'
    fillColor = 'rgba(16, 185, 129, 0.2)'
    shadowColor = 'rgba(16, 185, 129, 0.4)'
  } else if (level === 3) {
    strokeColor = '#06b6d4'
    fillColor = 'rgba(6, 182, 212, 0.2)'
    shadowColor = 'rgba(6, 182, 212, 0.4)'
  } else if (level >= 4) {
    strokeColor = '#fbbf24'
    fillColor = 'rgba(251, 191, 36, 0.2)'
    shadowColor = 'rgba(251, 191, 36, 0.4)'
  }

  // Calculate coordinates for a given value and angle
  const getCoords = (val: number, i: number, r: number) => {
    const angle = i * angleStep - Math.PI / 2
    const distance = (val / 100) * r
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance
    }
  }

  // Background polygons (grid)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1]
  const gridPaths = gridLevels.map(level => {
    return axes.map((_, i) => {
      const { x, y } = getCoords(100, i, radius * level)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ') + ' Z'
  })

  // User data path
  const dataPath = axes.map((_, i) => {
    const { x, y } = getCoords(values[i], i, radius)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ') + ' Z'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid lines */}
        {gridPaths.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const { x, y } = getCoords(100, i, radius)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={strokeColor}
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          )
        })}

        {/* Data area */}
        <motion.path
          initial={{ d: gridPaths[0], opacity: 0 }}
          animate={{ d: dataPath, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 8px ${shadowColor})` }}
        />

        {/* Labels */}
        {axes.map((label, i) => {
          const { x, y } = getCoords(115, i, radius) // Slightly outside the grid
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white/40 text-[10px] font-mono uppercase tracking-widest"
              style={{ fontSize: '8px' }}
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
