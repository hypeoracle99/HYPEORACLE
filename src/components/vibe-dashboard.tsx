'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { Connection } from '@solana/web3.js'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { VibeRecorder } from './vibe-recorder'
import { OracleStatus } from './oracle-status'
import { OracleTradeFeed } from './oracle-trade-feed'
import { FuelOracle } from './fuel-oracle'
import { AmbientBackground, ScoreGauge } from './ui-primitives'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import {
  Search, Zap, Shield, Activity, TrendingUp,
  Radio, ChevronRight, Globe, BarChart3, Users, Sparkles, Coins, BrainCircuit
} from 'lucide-react'

const client = createClient({
  baseUrl: "https://9s8ct2b5.us-east.insforge.app",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY",
})

// --- Live ticker data ---

function LiveTicker() {
  const [tickerData, setTickerData] = useState<any[]>([])

  useEffect(() => {
    async function fetchTickerData() {
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
        const sdk = new BagsSDK("bags_prod_8lR0OnUDXzqmRKoWBXV5p14Blh8OsiKWuHgIgc2rook", connection, 'processed')
        
        const topTokens = await sdk.state.getTopTokensByLifetimeFees()
        if (topTokens && topTokens.length > 0) {
          setTickerData(topTokens.slice(0, 15)) // Top 15 Bags tokens
        }
      } catch (err) {
        console.warn('Failed to fetch Bags.fm leaderboard', err)
      }
    }
    
    fetchTickerData()
    const interval = setInterval(fetchTickerData, 30000)
    return () => clearInterval(interval)
  }, [])

  const baseItems = tickerData.length > 0 ? tickerData : []
  // Repeat the items to construct the infinite scroll
  const items = [...baseItems, ...baseItems, ...baseItems]

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
              <span className="text-orange-500/60">●</span>
              <span className="font-bold text-white">{symbol}</span>
              <span>${Number(priceUsd).toPrecision(4)}</span>
              <span style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="px-1.5 py-0.5 rounded ml-1 text-[8px]" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF8C42', border: '1px solid rgba(255,107,26,0.3)' }}>
                Trade on Bags.fm 👜
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// --- Hero section ---
function HeroSection() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="text-center py-16 px-4"
    >
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
        style={{
          background: 'rgba(255,107,26,0.08)',
          border: '1px solid rgba(255,107,26,0.2)',
        }}
      >
        <Radio className="w-3 h-3 text-orange-500 animate-pulse" />
        <span className="text-xs font-mono text-orange-400 tracking-wider">
          LIVE ON SOLANA
        </span>
        <Sparkles className="w-3 h-3 text-orange-500" />
      </motion.div>

      {/* Main heading */}
      <h1 className="display-heading text-[clamp(3rem,10vw,7rem)] mb-4 leading-[0.9]">
        <span className="gradient-text-fire">HYPE</span>
        <br />
        <span style={{ color: 'rgba(255,255,255,0.9)' }}>ORACLE</span>
      </h1>

      <p
        className="text-[clamp(0.85rem,2vw,1.1rem)] max-w-xl mx-auto mb-10 leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Real human voice &amp; DePIN sensors → AI-scored emotion oracle →
        <br />
        <span className="text-orange-400 font-semibold">Automated token trades on Solana</span>
      </p>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-8 flex-wrap">
        {[
          { label: 'Vibe Score Formula', value: 'AI × 0.6 + Vol × 0.3 + Emoji' },
          { label: 'Auto-Buy Trigger', value: 'Score > 80' },
          { label: 'Max Position', value: '0.005 SOL' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display font-bold text-sm text-white">{stat.value}</p>
            <p className="mono-label mt-0.5" style={{ fontSize: '0.55rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

// --- Token search bar ---
function TokenSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="relative flex items-center rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: value ? '0 0 0 1px rgba(255,107,26,0.3)' : 'none',
      }}
    >
      <Search className="absolute left-4 w-4 h-4 text-[var(--text-muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter token mint address to track vibes..."
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

// --- Score card for a single token ---
function VibeCard({
  score,
  onVibeSubmitted,
  index,
}: {
  score: any
  onVibeSubmitted: () => void
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [tokenName, setTokenName] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchName() {
      if (!score.token_mint) return
      try {
        // Try DexScreener for established tokens
        let res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${score.token_mint}`)
        let data = await res.json()
        if (data && data.pairs && data.pairs.length > 0) {
          setTokenName(data.pairs[0].baseToken.symbol || data.pairs[0].baseToken.name)
          return
        }
      } catch (err) {
        // silently fallback on fetch failures
      }
      
      // If it's a completely unlisted/test token
      setTokenName('Unlisted')
    }
    fetchName()
  }, [score.token_mint])

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
          ? 'linear-gradient(135deg, rgba(255,107,26,0.06), rgba(255,61,0,0.03))'
          : 'var(--bg-card)',
        border: `1px solid ${isHot ? 'rgba(255,107,26,0.25)' : 'var(--border-subtle)'}`,
        boxShadow: isHot ? '0 0 40px rgba(255,107,26,0.07)' : 'none',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Hot token glow line */}
      {isHot && (
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,107,26,0.7), transparent)',
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
                  background: isHot ? 'rgba(255,107,26,0.15)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: isHot ? '#FF8C42' : 'rgba(255,255,255,0.5)',
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
                    color: '#FFAA00',
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
            <span className="mono-label" style={{ fontSize: '0.5rem', color: isHot ? '#FF8C42' : undefined }}>
              {score.confidence ? `${(score.confidence * 100).toFixed(0)}%` : 'N/A'}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(score.confidence || 0) * 100}%`,
                background: isHot
                  ? 'linear-gradient(90deg, #FF6B1A, #FFD700)'
                  : isWarm
                    ? 'linear-gradient(90deg, #FFAA00, #FFD700)'
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
              <VibeRecorder tokenMint={score.token_mint} onVibeSubmitted={onVibeSubmitted} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [activeTab, setActiveTab] = useState<'all' | 'hot' | 'backed'>('all')
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const subscribedRef = useRef(false)
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

  const filtered = scores.filter((s) => {
    const matchSearch = !search || s.token_mint?.toLowerCase().includes(search.toLowerCase())
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'hot' && s.score > 80) ||
      (activeTab === 'backed' && s.last_oracle_trade_at)
    return matchSearch && matchTab
  })

  const tabs = [
    { id: 'all', label: 'All', count: scores.length, icon: Globe },
    { id: 'hot', label: 'Hot 🔥', count: scores.filter((s) => s.score > 80).length, icon: TrendingUp },
    { id: 'backed', label: 'Backed', count: scores.filter((s) => s.last_oracle_trade_at).length, icon: Shield },
  ] as const

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              {/* This image element looks for 'logo.png' in the /public folder */}
              <img 
                src="/logo.png" 
                alt="HypeOracle Logo" 
                className="h-10 sm:h-12 w-auto object-contain scale-110 origin-left"
                onError={(e) => {
                  // Fallback to Zap icon if logo.png doesn't exist
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* Fallback Icon */}
              <div
                className="w-7 h-7 rounded-lg items-center justify-center hidden"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF3D00)' }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="font-display font-bold text-sm text-white tracking-wide">
              HypeOracle
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{
                background: 'rgba(255,107,26,0.12)',
                border: '1px solid rgba(255,107,26,0.2)',
                color: '#FF8C42',
              }}
            >
              BETA
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 min-w-[150px] justify-end">
            {mounted && publicKey && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Activity className="w-3 h-3 text-green-500" />
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}
                </span>
              </div>
            )}
            {mounted && publicKey && (
              <Link
                href="/my-agent"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all"
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                }}
              >
                <BrainCircuit className="w-3 h-3" />
                My Agent
              </Link>
            )}
            {mounted && publicKey && (
              <Link
                href="/earnings"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all"
                style={{
                  background: 'rgba(255,107,26,0.08)',
                  border: '1px solid rgba(255,107,26,0.2)',
                  color: '#FF8C42',
                }}
              >
                <Coins className="w-3 h-3" />
                My Earnings
              </Link>
            )}
            {mounted ? <WalletMultiButton /> : <div className="w-[150px] h-[48px] rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />}
          </div>
        </div>
      </nav>

      {/* Ticker */}
      <LiveTicker />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* Hero */}
        <HeroSection />

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
                  background: isActive ? 'rgba(255,107,26,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(255,107,26,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.4)',
                }}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-mono"
                    style={{
                      background: isActive ? 'rgba(255,107,26,0.25)' : 'rgba(255,255,255,0.06)',
                      color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.3)',
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
                background: realtimeConnected ? '#22c55e' : '#FF6B1A',
                boxShadow: realtimeConnected
                  ? '0 0 6px rgba(34,197,94,0.6)'
                  : '0 0 6px rgba(255,107,26,0.5)',
                animation: realtimeConnected ? 'none' : 'pulse 1.5s infinite',
              }}
            />
            <span className="mono-label" style={{ fontSize: '0.55rem' }}>
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
                background: 'rgba(255,107,26,0.04)',
                border: '1px solid rgba(255,107,26,0.15)',
              }}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
                <h4 className="mono-label" style={{ fontSize: '0.6rem', color: '#FF8C42' }}>
                  Scoring Formula
                </h4>
              </div>
              <div
                className="p-3 rounded-xl font-mono text-[10px] leading-relaxed"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#FF8C42' }}
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
            { label: 'Total Contributors', value: scores.reduce((sum, s) => sum + (s.contributor_count || 0), 0) },
            { label: 'Oracle Trades', value: scores.filter((s) => s.last_oracle_trade_at).length },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display font-bold text-lg text-white">{stat.value}</p>
              <p className="mono-label mt-0.5" style={{ fontSize: '0.5rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="mono-label text-center" style={{ fontSize: '0.55rem' }}>
          <a href="https://bags.fm" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 transition-colors">
            Bags.fm
          </a>{' '}
          •{' '}
          <a href="https://insforge.dev" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 transition-colors">
            InsForge
          </a>
        </p>
      </footer>
    </div>
  )
}
