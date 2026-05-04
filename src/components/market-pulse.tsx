'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { INSFORGE_CONFIG } from '@/lib/constants'
import { SoulprintRadarChart } from './soulprint-radar-chart'
import { Globe, Users, Activity, TrendingUp } from 'lucide-react'

const client = createClient(INSFORGE_CONFIG)

export function MarketPulse() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGlobalSentiment() {
      const { data: latest } = await client.database
        .from('global_sentiment_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (latest) {
        setData(latest)
      }
      setLoading(false)
    }

    fetchGlobalSentiment()
    const interval = setInterval(fetchGlobalSentiment, 30000) // 30s refresh
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="h-48 rounded-2xl animate-pulse bg-white/5 border border-white/10" />
  )

  if (!data) return null

  const score = data.global_score || 50
  const isGreedy = score > 70
  const isFearful = score < 30

  const getStatusText = () => {
    if (score > 80) return 'EXTREME EUPHORIA'
    if (score > 60) return 'BULLISH OPTIMISM'
    if (score > 40) return 'NEUTRAL MOMENTUM'
    if (score > 20) return 'CAUTIOUS SKEPTICISM'
    return 'EXTREME PANIC'
  }

  const getStatusColor = () => {
    if (score > 80) return '#FFD700' // Gold
    if (score > 60) return '#22c55e' // Green
    if (score > 40) return '#FF8C42' // Orange
    return '#ef4444' // Red
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-6 mb-8"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}
    >
      {/* Background Glow */}
      <div 
        className="absolute -top-20 -right-20 w-64 h-64 blur-[100px] rounded-full opacity-20 transition-colors duration-1000"
        style={{ background: getStatusColor() }}
      />

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        {/* Left: Global Score Gauge */}
        <div className="flex flex-col items-center justify-center min-w-[200px]">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="transparent"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="60"
                fill="transparent"
                stroke={getStatusColor()}
                strokeWidth="8"
                strokeDasharray="377"
                initial={{ strokeDashoffset: 377 }}
                animate={{ strokeDashoffset: 377 - (377 * score) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${getStatusColor()}66)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-display font-black text-white">{score}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Global Pulse</span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <Activity className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] font-mono font-bold tracking-tighter" style={{ color: getStatusColor() }}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Global Emotional Spectrum */}
        <div className="flex-1 w-full max-w-[300px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Market Consciousness</span>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-white/20" />
              <span className="text-[10px] font-mono text-white/40">{data.total_contributors} Contributors</span>
            </div>
          </div>
          <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
            <SoulprintRadarChart spectrum={data.emotional_breakdown} size={220} />
          </div>
        </div>

        {/* Right: Insight & CTA */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-tight">Collective Consciousness</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed font-mono">
              The HypeOracle has aggregated recent vocal signatures from {data.total_contributors} participants. 
              {score > 60 
                ? " Market optimism is scaling, driven by strong 'Hope' and 'Confidence' metrics. This suggests a potential expansion phase."
                : score < 40 
                ? " Caution prevails as 'Fear' and 'Skepticism' dominate the spectrum. Oracle protocols are recalibrating for volatility."
                : " The market is currently in a state of 'Neutral Equilibrium'. Momentum is consolidating before the next breakout."
              }
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
              <TrendingUp className="w-4 h-4 text-green-400 mb-1" />
              <span className="text-[9px] font-mono text-white/40 uppercase">Top Catalyst</span>
              <span className="text-[10px] font-bold text-white">Sentiment Pivot</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
              <Activity className="w-4 h-4 text-blue-400 mb-1" />
              <span className="text-[9px] font-mono text-white/40 uppercase">Volatility Index</span>
              <span className="text-[10px] font-bold text-white">Stable</span>
            </div>
          </div>

          <button className="w-full py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest">
            Access Full API Indices
          </button>
        </div>
      </div>
    </motion.div>
  )
}
