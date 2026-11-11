'use client'

import { useEffect, useRef } from 'react'

// Ambient animated background with floating orbs and grid
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,136,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-move 8s linear infinite',
        }}
      />

      {/* Floating Cyber-Emerald orbs */}
      <div
        className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,136,0.14) 0%, transparent 70%)',
          animation: 'orb-float 15s ease-in-out infinite',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(5,242,146,0.10) 0%, transparent 70%)',
          animation: 'orb-float 20s ease-in-out infinite reverse',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,204,106,0.08) 0%, transparent 70%)',
          animation: 'orb-float 18s ease-in-out 5s infinite',
          filter: 'blur(80px)',
        }}
      />

      {/* Scan line */}
      <div
        className="absolute w-full h-[1px] opacity-[0.05] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.9), transparent)',
          animation: 'scan-line 12s linear infinite',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,7,9,0.9) 100%)',
        }}
      />
    </div>
  )
}

// Animated equalizer bars for "live" feel
export function EqualizerBars({ active, bars = 5 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-current text-[#00FF88]"
          style={{
            height: active ? `${Math.random() * 100}%` : '20%',
            minHeight: '3px',
            animation: active ? `equalizer ${0.4 + i * 0.1}s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
            transition: 'height 0.1s ease',
          }}
        />
      ))}
    </div>
  )
}

// Circular score gauge in Cyber-Emerald
export function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash = (score / 100) * circumference
  const isHot = score > 80
  const isWarm = score > 60

  const color = isHot ? '#00FF88' : isWarm ? '#05F292' : '#374151'
  const glowColor = isHot ? 'rgba(0,255,136,0.6)' : isWarm ? 'rgba(0,255,136,0.3)' : 'transparent'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={6}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          style={{
            filter: isHot ? `drop-shadow(0 0 8px ${color})` : 'none',
            transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      {/* Center content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: size * 0.28,
            color: isHot ? '#00FF88' : isWarm ? '#05F292' : '#6B7280',
            textShadow: isHot ? `0 0 14px ${glowColor}` : 'none',
          }}
        >
          {Math.round(score)}
        </span>
        {isHot && (
          <span style={{ fontSize: size * 0.16, lineHeight: 1 }} className="text-[#00FF88]">⚡</span>
        )}
      </div>
    </div>
  )
}

// Waveform visualizer bar in Cyber-Emerald
export function WaveformBar({ level, bars = 20 }: { level: number; bars?: number }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10 px-2">
      {Array.from({ length: bars }).map((_, i) => {
        const center = bars / 2
        const dist = Math.abs(i - center) / center
        const baseHeight = (1 - dist) * 40 + 4
        const randOffset = (Math.random() - 0.5) * level * 30
        const h = Math.max(4, Math.min(40, baseHeight + randOffset * level))
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: '3px',
              height: `${h}px`,
              background: level > 0.7
                ? `linear-gradient(to top, #00CC6A, #00FF88)`
                : `linear-gradient(to top, rgba(0,255,136,0.3), rgba(5,242,146,0.6))`,
              opacity: 0.4 + level * 0.6,
            }}
          />
        )
      })}
    </div>
  )
}
