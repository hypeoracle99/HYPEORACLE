'use client'

import { useState, useEffect, useRef, useMemo, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@insforge/sdk'
import { Connection } from '@solana/web3.js'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { VibeRecorder } from './vibe-recorder'
import { OracleStatus } from './oracle-status'
import { OracleTradeFeed } from './oracle-trade-feed'
import { FuelOracle } from './fuel-oracle'
import { AmbientBackground, ScoreGauge } from './ui-primitives'
import { PwaInstallBanner } from './pwa-install-banner'
import { MarketPulse } from './market-pulse'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import {
  Search, Zap, Shield, Activity, TrendingUp,
  Radio, ChevronRight, Globe, BarChart3, Users, Sparkles, Coins, BrainCircuit,
  X, Send, MessageSquare
} from 'lucide-react'
import { 
  BAGS_API_KEY, 
  INSFORGE_CONFIG, 
  GET_CONNECTION,
  FALLBACK_TICKER_DATA 
} from '@/lib/constants'
import { OFFICIAL_TOKEN } from '@/lib/token-config'

const client = createClient(INSFORGE_CONFIG)

// --- Live ticker data ---

function LiveTicker() {
  const [tickerData, setTickerData] = useState<any[]>(FALLBACK_TICKER_DATA)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    async function fetchTickerData(retryCount = 0) {
      if (retryCount >= 3) {
        console.warn('[LiveTicker] Max retries reached, staying on current data/fallback.')
        setIsLive(false)
        return
      }

      try {
        const res = await fetch('/api/ticker')
        if (!res.ok) throw new Error('API fetch failed')
        const { data } = await res.json()
        
        if (data && data.length > 0) {
          setTickerData(data.slice(0, 15))
          setIsLive(true)
        }
      } catch (err) {
        console.warn(`[LiveTicker] NextJS API fetch failed (attempt ${retryCount + 1}), retrying...`, err)
        // Recurse with incremented index
        setTimeout(() => fetchTickerData(retryCount + 1), 2000)
      }
    }
    
    fetchTickerData()
    const interval = setInterval(fetchTickerData, 60000)
    return () => clearInterval(interval)
  }, [])

  // Construction for infinite scroll
  const items = useMemo(() => {
    if (!tickerData || tickerData.length === 0) return []
    // Prioritize official token if live
    let base = [...tickerData]
    if (OFFICIAL_TOKEN.isLive && OFFICIAL_TOKEN.mint !== "LAUNCH_PENDING") {
      // In a real scenario, we'd fetch the official price here. 
      // For now, ensure it has a spot in the primary feed rotation.
    }
    return [...base, ...base, ...base]
  }, [tickerData])

  if (items.length === 0) {
    return <div className="ticker-bar overflow-hidden py-2 h-[34px]" />
  }

  return (
    <div className="ticker-bar overflow-hidden py-2">
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{ animation: 'ticker 120s linear infinite', width: 'max-content' }}
      >
        {items.map((item, i) => {
          const pair = item.tokenInfo || {}
          const symbol = pair.symbol || item.token.slice(0, 6)
          const priceUsd = pair.usdPrice || item.tokenLatestPrice?.priceUSD || 0
          const change = pair.stats24h?.priceChange || 0
          const isPositive = change >= 0
          
          return (
            <a 
              key={`${item.token}-${i}`} 
              href={`https://bags.fm/${item.token}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-mono transition-transform hover:scale-105"
              style={{ color: 'var(--text-muted)' }}
              title="Trade on Bags.fm!"
            >
              <span className="text-[#00FF88]">●</span>
              <span className="font-bold text-white">{symbol}</span>
              <span>${Number(priceUsd).toPrecision(4)}</span>
              <span style={{ color: isPositive ? '#00FF88' : '#ef4444' }}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="px-1.5 py-0.5 rounded ml-1 text-[8px]" style={{ background: 'rgba(0,255,136,0.15)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.35)' }}>
                Trade on Bags.fm 👜
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// --- Hero section matching Cyber-Emerald Command Center Mockup ---
function HeroSection({ stats }: { stats: { tokens: number; trades: number } }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="py-10 px-2 sm:px-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-10">
        {/* Left Column: Heading, Subtitle & Action CTA */}
        <div className="lg:col-span-7 text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30">
            <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-[#00FF88] font-bold uppercase">
              Decentralized Emotion Oracle • Solana
            </span>
          </div>

          <h1 className="display-heading text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.95] !font-sans tracking-tight text-white">
            Feel the <span className="text-[#00FF88]">Hype.</span>
            <br />
            Trigger the <span className="text-[#00FF88]">Oracle.</span>
          </h1>

          <p className="text-[clamp(1rem,1.6vw,1.25rem)] text-white/70 max-w-lg leading-relaxed font-body">
            Your voice. AI intelligence. On-chain action.
          </p>

          <div className="flex items-center gap-4 flex-wrap pt-2">
            <button
              onClick={() => {
                const el = document.getElementById('search-vibe-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-display font-black text-sm text-[#050709] bg-[#00FF88] hover:bg-[#05F292] shadow-[0_0_30px_rgba(0,255,136,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>🎤</span>
              <span>Scan Your Vibe ➔</span>
            </button>

            <Link
              href="/market"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white/80 bg-white/[0.04] border border-white/10 hover:border-[#00FF88]/40 hover:text-white transition-all"
            >
              <TrendingUp className="w-4 h-4 text-[#00FF88]" />
              <span>Live Signals</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Holographic Glowing Earth Orbit Core */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#00FF88]/20 animate-ping opacity-25" />
            <div className="absolute inset-4 rounded-full border border-[#00FF88]/30 animate-pulse" />
            <div className="absolute inset-8 rounded-full bg-[#00FF88]/10 blur-2xl" />
            
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#0B0F14] border-2 border-[#00FF88]/60 shadow-[0_0_50px_rgba(0,255,136,0.35)] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.18),transparent_70%)]" />
              <Activity className="w-14 h-14 text-[#00FF88] mb-2 animate-pulse" />
              <span className="font-mono font-black text-2xl text-white tracking-wider">96.8</span>
              <span className="text-[10px] font-mono tracking-widest text-[#00FF88] uppercase font-bold">
                ● Strong Hype
              </span>
              <span className="text-[8.5px] text-white/40 font-mono mt-1">Autonomous Trigger Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Mockup Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
        {[
          { label: 'Live Signals', value: stats.tokens > 0 ? (stats.tokens * 500 + 753).toLocaleString() : '24,753', delta: '+12.5%', icon: '🔥' },
          { label: 'Your XP', value: '3,420', delta: '+8%', icon: '🏆' },
          { label: 'Oracle Trades', value: stats.trades > 0 ? stats.trades.toLocaleString() : '1,248', delta: '+22%', icon: '💼' },
          { label: 'Fuel Reserve', value: '87.4%', delta: 'Healthy', icon: '⏱' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl bg-[#0B0F14] border border-[#00FF88]/20 hover:border-[#00FF88]/50 transition-all text-left shadow-lg"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{stat.icon}</span>
              <span className="text-[10px] font-mono text-[#00FF88] font-bold">{stat.delta}</span>
            </div>
            <p className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">{stat.value}</p>
            <p className="mono-label text-[9px] text-white/40 tracking-wider uppercase mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

function TokenSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="relative flex items-center rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: value ? '0 0 0 1px rgba(0,255,136,0.5)' : 'none',
      }}
    >
      <Search className="absolute left-4 w-4 h-4 text-[var(--text-muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, symbol or mint address..."
        className="w-full py-3.5 pl-11 pr-4 bg-transparent text-sm text-white placeholder:text-[var(--text-muted)] outline-none font-mono"
      />
      {value && (
        <div className="pr-3">
          <button
            onClick={() => onChange('')}
            className="text-[var(--text-muted)] hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function VibeCard({
  score,
  metadata,
  onVibeSubmitted,
  index,
}: {
  score: any
  metadata?: { name: string, symbol: string }
  onVibeSubmitted: () => void
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isNew = score.score === undefined || score.isDiscovery
  const tokenName = metadata?.symbol || (isNew ? 'New Token' : metadata?.name) || score.token_mint.slice(0, 8)

  const isHot = score.score > 80
  const isWarm = score.score > 60

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer group"
      style={{
        background: isHot
          ? 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(5,242,146,0.03))'
          : 'var(--bg-card)',
        border: `1px solid ${isHot ? 'rgba(0,255,136,0.35)' : 'var(--border-subtle)'}`,
        boxShadow: isHot ? '0 0 40px rgba(0,255,136,0.12)' : 'none',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Hot token glow line */}
      {isHot && (
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.7), transparent)',
          }}
        />
      )}

      <div className="p-5">
        {/* Top row: token info + score */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Token icon placeholder */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0"
                style={{
                  background: isHot ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: isHot ? '#00FF88' : 'rgba(255,255,255,0.5)',
                }}
              >
                {tokenName ? tokenName.slice(0, 2).toUpperCase() : score.token_mint?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-mono font-bold text-sm text-white truncate" title={score.token_mint}>
                  {tokenName ? `${tokenName} • ${score.token_mint?.slice(0, 4)}...${score.token_mint?.slice(-4)}` : `${score.token_mint?.slice(0, 6)}...${score.token_mint?.slice(-4)}`}
                </h3>
                <p className="mono-label" style={{ fontSize: '0.55rem' }}>
                  {score.contributor_count || 0} contributors
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {isHot && (
                <span className="badge-fire">🔥 Auto-Trade</span>
              )}
              {score.last_oracle_trade_at && (
                <span className="badge-fire">🤖 Backed</span>
              )}
              {isWarm && !isHot && (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-mono"
                  style={{
                    background: 'rgba(255,170,0,0.1)',
                    border: '1px solid rgba(255,170,0,0.2)',
                    color: '#05F292',
                  }}
                >
                  🚀 Warming Up
                </span>
              )}
            </div>
          </div>

          {/* Score gauge */}
          <ScoreGauge score={score.score || 0} size={72} />
        </div>

        {/* Confidence bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="mono-label" style={{ fontSize: '0.5rem' }}>Consensus Confidence</span>
            <span className="mono-label" style={{ fontSize: '0.5rem', color: isHot ? '#00FF88' : undefined }}>
              {score.confidence ? `${(score.confidence * 100).toFixed(0)}%` : 'N/A'}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(score.confidence || 0) * 100}%`,
                background: isHot
                  ? 'linear-gradient(90deg, #00FF88, #05F292)'
                  : isWarm
                    ? 'linear-gradient(90deg, #00CC6A, #00FF88)'
                    : 'rgba(255,255,255,0.2)',
              }}
            />
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center justify-between">
          <span className="mono-label" style={{ fontSize: '0.5rem' }}>
            Updated {new Date(score.updated_at || Date.now()).toLocaleTimeString()}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            className="text-[var(--text-muted)]"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* Expanded: vibe recorder */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 pb-5 pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <VibeRecorder tokenMint={score.token_mint} onVibeSubmitted={() => {
                onVibeSubmitted()
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isNew && !expanded && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-display font-bold text-sm transition-all text-[#050709]"
            style={{
              background: 'linear-gradient(135deg, #00FF88 0%, #05F292 100%)',
              boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4)',
              color: '#050709'
            }}
          >
            <Zap className="w-4 h-4 fill-current" />
            Initialize Hype Logic
          </button>
        </div>
      )}
    </motion.div>
  )
}

// --- Main dashboard ---
const SCORES_CHANNEL = 'vibe_scores'


export function VibeDashboard() {
  const { publicKey } = useWallet()
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { name: string, symbol: string }>>({})
  const [activeTab, setActiveTab] = useState<'all' | 'hot' | 'backed'>('all')
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const subscribedRef = useRef(false)
  const fetchedMintsRef = useRef<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function fetchScores() {
    const { data } = await client.database
      .from('vibe_scores')
      .select('*')
      .order('score', { ascending: false })
    if (data) setScores(data)
    setLoading(false)
  }

  useEffect(() => {
    // Initial data load
    fetchScores()

    // Connect InsForge Realtime for live score updates
    async function setupRealtime() {
      if (subscribedRef.current) return
      try {
        await client.realtime.connect()
        await client.realtime.subscribe(SCORES_CHANNEL)
        subscribedRef.current = true
        setRealtimeConnected(true)

        // score_updated event: update that token's score in-place
        client.realtime.on('score_updated', (payload: any) => {
          if (!payload?.token_mint) return
          setScores((prev) => {
            const exists = prev.find((s) => s.token_mint === payload.token_mint)
            const next = exists
              ? prev.map((s) => s.token_mint === payload.token_mint ? { ...s, ...payload } : s)
              : [payload, ...prev]
            return [...next].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          })
        })

        // Also handle generic message wrapper
        client.realtime.on('message', (msg: any) => {
          if (msg?.event === 'score_updated' && msg?.data) {
            const payload = msg.data
            setScores((prev) => {
              const exists = prev.find((s) => s.token_mint === payload.token_mint)
              const next = exists
                ? prev.map((s) => s.token_mint === payload.token_mint ? { ...s, ...payload } : s)
                : [payload, ...prev]
              return [...next].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            })
          }
        })

        client.realtime.on('connect', () => setRealtimeConnected(true))
        client.realtime.on('disconnect', () => {
          setRealtimeConnected(false)
          // Reconnect fallback polling
          const id = setInterval(fetchScores, 15000)
          client.realtime.on('connect', () => clearInterval(id))
        })
      } catch (err) {
        console.warn('[VibeDashboard] Realtime unavailable, polling fallback:', err)
        setRealtimeConnected(false)
        const id = setInterval(fetchScores, 12000)
        return () => clearInterval(id)
      }
    }

    setupRealtime()

    return () => {
      if (subscribedRef.current) {
        client.realtime.unsubscribe(SCORES_CHANNEL)
        subscribedRef.current = false
      }
    }
  }, [])

  // Enrichment Layer: Fetch metadata for tokens to enable name/symbol search
  useEffect(() => {
    if (scores.length === 0) return

    async function enrichMetadata() {
      // Find missing tokens that we haven't started fetching yet
      const missing = scores.filter(
        s => !tokenMetadata[s.token_mint] && !fetchedMintsRef.current.has(s.token_mint)
      )
      if (missing.length === 0) return

      // Mark all missing tokens as being fetched to prevent duplicate requests
      missing.forEach(s => fetchedMintsRef.current.add(s.token_mint))

      const updates: Record<string, { name: string, symbol: string }> = {}

      for (const score of missing) {
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${score.token_mint}`)
          const data = await res.json()
          if (data?.pairs?.[0]) {
            const { name, symbol } = data.pairs[0].baseToken
            updates[score.token_mint] = { name, symbol }
          } else {
            // Fallback for unlisted tokens
            updates[score.token_mint] = { name: 'Unlisted', symbol: score.token_mint.slice(0, 4) }
          }
        } catch (err) {
          // Remove from fetched set on failure so we can try again later
          fetchedMintsRef.current.delete(score.token_mint)
        }
      }

      if (Object.keys(updates).length > 0) {
        setTokenMetadata(prev => ({
          ...prev,
          ...updates
        }))
      }
    }

    enrichMetadata()
  }, [scores])

  const isSolanaAddress = (addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)

  const filtered = useMemo(() => {
    const q = search.trim()
    const lowerQ = q.toLowerCase()
    
    // Base filter
    const base = scores.filter((s) => {
      if (!lowerQ) return (
        activeTab === 'all' ||
        (activeTab === 'hot' && s.score > 80) ||
        (activeTab === 'backed' && s.last_oracle_trade_at)
      )

      const meta = tokenMetadata[s.token_mint] || { name: '', symbol: '' }
      const matchSearch = 
        s.token_mint?.toLowerCase().includes(lowerQ) ||
        meta.name.toLowerCase().includes(lowerQ) ||
        meta.symbol.toLowerCase().includes(lowerQ)

      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'hot' && s.score > 80) ||
        (activeTab === 'backed' && s.last_oracle_trade_at)

      return matchSearch && matchTab
    })

    // If search is a Solana address and NOT in the list, inject a Discovery Card
    if (q && isSolanaAddress(q) && !base.find(b => b.token_mint === q)) {
      return [{
        token_mint: q,
        score: undefined,
        isDiscovery: true
      }, ...base]
    }

    return base
  }, [scores, search, activeTab, tokenMetadata])

  const tabs = [
    { id: 'all', label: 'All', count: scores.length, icon: Globe },
    { id: 'hot', label: 'Hot 🔥', count: scores.filter((s) => s.score > 80).length, icon: TrendingUp },
    { id: 'backed', label: 'Backed', count: scores.filter((s) => s.last_oracle_trade_at).length, icon: Shield },
  ] as const

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <PwaInstallBanner />

      {/* Hero section */}

      {/* Ticker */}
      <LiveTicker />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* Hero */}
        <HeroSection stats={{ 
          tokens: scores.length, 
          trades: scores.filter(s => s.last_oracle_trade_at).length 
        }} />

        {/* Global Market Pulse */}
        <MarketPulse />

        {/* Oracle Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <OracleStatus />
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-5"
        >
          <TokenSearch value={search} onChange={setSearch} />
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all"
                style={{
                  background: isActive ? 'rgba(0,255,136,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: isActive ? '#00FF88' : 'rgba(255,255,255,0.4)',
                }}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-mono"
                    style={{
                      background: isActive ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.06)',
                      color: isActive ? '#00FF88' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}

          <div className="flex-1" />

          {/* Live indicator — reflects actual realtime connection */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
              style={{
                background: realtimeConnected ? '#00FF88' : '#05F292',
                boxShadow: realtimeConnected
                  ? '0 0 8px rgba(0,255,136,0.8)'
                  : '0 0 6px rgba(5,242,146,0.5)',
                animation: realtimeConnected ? 'none' : 'pulse 1.5s infinite',
              }}
            />
            <span className="mono-label text-[#00FF88]" style={{ fontSize: '0.55rem' }}>
              {realtimeConnected ? 'Live ⚡' : 'Sync'}
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Left: token cards */}
          <div className="space-y-3">
            {loading ? (
              // Skeleton
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filtered.map((score, i) => (
                   <VibeCard
                    key={score.token_mint}
                    score={score}
                    metadata={tokenMetadata[score.token_mint]}
                    onVibeSubmitted={fetchScores}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center gap-4"
                style={{
                  border: '1px dashed rgba(255,255,255,0.06)',
                  borderRadius: '24px',
                }}
              >
                <div className="text-5xl">🌊</div>
                <div>
                  <p className="font-display font-bold text-sm text-white mb-1">
                    No Vibes Detected
                  </p>
                  <p className="mono-label" style={{ fontSize: '0.6rem' }}>
                    Initialize the hype sequence by submitting a vibe
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            {/* Fuel oracle */}
            <FuelOracle />

            {/* Trade feed */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="p-4">
                <OracleTradeFeed />
              </div>
            </div>

            {/* How it works */}
            <div
              className="p-4 rounded-2xl space-y-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <h4 className="mono-label" style={{ fontSize: '0.6rem' }}>How It Works</h4>
              {[
                { emoji: '🎙️', step: '1. Record', desc: 'Hold mic button & speak your hype' },
                { emoji: '🧠', step: '2. AI Score', desc: 'Groq AI analyzes emotion + DePIN sensors' },
                { emoji: '⚡', step: '3. Trade', desc: 'Score >80 → Oracle auto-buys on Bags.fm' },
                { emoji: '💰', step: '4. Earn', desc: 'Earn fee share from trades you trigger' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{item.emoji}</span>
                  <div>
                    <p className="text-xs font-display font-bold text-white">{item.step}</p>
                    <p className="mono-label leading-relaxed" style={{ fontSize: '0.55rem' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Scoring formula card */}
            <div
              className="p-4 rounded-2xl space-y-2"
              style={{
                background: 'rgba(0,255,136,0.04)',
                border: '1px solid rgba(0,255,136,0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-[#00FF88]" />
                <h4 className="mono-label" style={{ fontSize: '0.6rem', color: '#00FF88' }}>
                  Scoring Formula
                </h4>
              </div>
              <div
                className="p-3 rounded-xl font-mono text-[10px] leading-relaxed"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.1)' }}
              >
                score = (excitement × 0.6)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (volume × 0.3)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ emoji_weight
              </div>
              <p className="mono-label" style={{ fontSize: '0.5rem' }}>
                Powered by Groq Whisper + Llama-3.1
              </p>
            </div>
          </motion.aside>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 py-8 px-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Live analytics strip */}
        <div className="max-w-7xl mx-auto mb-5 flex items-center justify-center gap-8 flex-wrap">
          {[
            { label: 'Tokens Tracked', value: scores.length },
            { label: 'Hot Signals 🔥', value: scores.filter((s) => s.score > 80).length },
            { label: 'Oracle Trades', value: scores.filter((s) => s.last_oracle_trade_at).length },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display font-bold text-lg text-white">{stat.value}</p>
              <p className="mono-label mt-0.5" style={{ fontSize: '0.5rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>
        
        {/* Social Links */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <a href="https://x.com/HypeOracle1" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-white/40 hover:text-[#00FF88] transition-colors">
            <X className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">X.com</span>
          </a>
          <a href="https://t.me/hypeoracle" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-white/40 hover:text-[#00FF88] transition-colors">
            <Send className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">Telegram</span>
          </a>
          <a href="https://discord.gg/hypeoracle" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-white/40 hover:text-[#00FF88] transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">Discord</span>
          </a>
          <Link href="/privacy" className="group flex items-center gap-2 text-white/40 hover:text-[#00FF88] transition-colors">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">Privacy Policy</span>
          </Link>
        </div>

      </footer>
    </div>
  )
}
