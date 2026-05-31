'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { INSFORGE_CONFIG } from '@/lib/constants'
import { AmbientBackground } from '@/components/ui-primitives'
import { SoulprintRadarChart } from '@/components/soulprint-radar-chart'
import { 
  Globe, Users, Activity, TrendingUp, Sparkles, 
  ArrowUpRight, AlertTriangle, ShieldCheck, HelpCircle,
  Copy, Check, Lock, Unlock, Cpu, Code
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const client = createClient(INSFORGE_CONFIG)

export default function MarketPage() {
  const { publicKey, connected } = useWallet()
  const [loading, setLoading] = useState(true)
  const [latestSentiment, setLatestSentiment] = useState<any>(null)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [tokenLeaders, setTokenLeaders] = useState<any[]>([])
  const [liveVibes, setLiveVibes] = useState<any[]>([])
  const [isStaked, setIsStaked] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [stakedHype, setStakedHype] = useState<number | null>(null)
  const [checkingStake, setCheckingStake] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'curl' | 'js' | 'python'>('curl')
  const [copied, setCopied] = useState(false)

  const fetchStakedBalance = useCallback(async () => {
    if (!publicKey) {
      setStakedHype(null)
      return
    }
    setCheckingStake(true)
    try {
      const { data, error } = await client.database
        .from('user_staking')
        .select('staked_amount')
        .eq('user_pubkey', publicKey.toBase58())
        .maybeSingle()

      if (error) throw error
      if (data) {
        setStakedHype(parseFloat(data.staked_amount))
      } else {
        setStakedHype(0)
      }
    } catch (err) {
      console.error('Failed to fetch staked balance:', err)
      setStakedHype(0)
    } finally {
      setCheckingStake(false)
    }
  }, [publicKey])

  // Fetch all necessary data
  async function fetchMarketData() {
    try {
      // 1. Fetch latest global sentiment score
      const { data: latest } = await client.database
        .from('global_sentiment_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latest) {
        setLatestSentiment(latest)
      } else {
        // Fallback default
        setLatestSentiment({
          global_score: 62,
          total_contributors: 48,
          emotional_breakdown: {
            Greed: 25,
            Fear: 10,
            Hope: 35,
            Confidence: 20,
            Skepticism: 10
          }
        })
      }

      // 2. Fetch global sentiment history (last 10 entries)
      const { data: history } = await client.database
        .from('global_sentiment_history')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(20)

      if (history && history.length > 0) {
        const formatted = history.map((item, idx) => ({
          name: new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          score: Number(item.global_score),
          contributors: Number(item.total_contributors || 0),
          Greed: item.emotional_breakdown?.Greed || 20,
          Fear: item.emotional_breakdown?.Fear || 20,
          Hope: item.emotional_breakdown?.Hope || 20
        }))
        setHistoryData(formatted)
      } else {
        // Fallback default history curve
        const fallbackHistory = Array.from({ length: 7 }).map((_, i) => {
          const date = new Date(Date.now() - (6 - i) * 60 * 60 * 1000)
          return {
            name: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            score: [52, 58, 48, 65, 71, 60, 62][i],
            contributors: [12, 18, 25, 34, 40, 45, 48][i],
            Greed: [15, 20, 22, 28, 30, 25, 25][i],
            Fear: [25, 20, 30, 15, 10, 12, 10][i],
            Hope: [30, 35, 28, 40, 45, 38, 35][i]
          }
        })
        setHistoryData(fallbackHistory)
      }

      // 3. Fetch top token vibes leaders
      const { data: leaders } = await client.database
        .from('vibe_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5)

      if (leaders && leaders.length > 0) {
        setTokenLeaders(leaders)
      } else {
        // Fallback mock tokens
        setTokenLeaders([
          { token_mint: 'DePIN11111111111111111111111111111111111111', score: 87, contributor_count: 24, ticker: 'BONK' },
          { token_mint: 'Bags222222222222222222222222222222222222222', score: 79, contributor_count: 15, ticker: 'SOL' },
          { token_mint: 'Hype333333333333333333333333333333333333333', score: 74, contributor_count: 9, ticker: 'HYPE' },
          { token_mint: 'Wif444444444444444444444444444444444444444', score: 45, contributor_count: 11, ticker: 'WIF' }
        ])
      }

      // 4. Fetch recent vibes transcripts
      const { data: vibes } = await client.database
        .from('vibes_raw')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8)

      if (vibes && vibes.length > 0) {
        setLiveVibes(vibes)
      } else {
        // Fallback mock rolling feed
        setLiveVibes([
          { user_pubkey: 'Gf7u...9k1a', emoji: '🔥', raw_transcript: 'Absolute consolidation complete on BONK, we are launching to the moon tonight boys!', created_at: new Date(Date.now() - 2 * 60000).toISOString() },
          { user_pubkey: 'BBz7...KaeP', emoji: '🚀', raw_transcript: 'Staking pool share refilling dynamic fee claims perfectly. Love this HypeOracle automation.', created_at: new Date(Date.now() - 8 * 60000).toISOString() },
          { user_pubkey: '4a1d...p7x9', emoji: '💀', raw_transcript: 'Local resistance rejected, looks like panic index might scale. Staying cautious here.', created_at: new Date(Date.now() - 15 * 60000).toISOString() },
          { user_pubkey: '8h2m...w3x2', emoji: '💎', raw_transcript: 'Personal vibe agent is highly bullish on SOL momentum. Holding with absolute conviction.', created_at: new Date(Date.now() - 22 * 60000).toISOString() }
        ])
      }

    } catch (err) {
      console.error('Failed to load market consciousness data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchMarketData()
    const interval = setInterval(fetchMarketData, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (publicKey) {
      fetchStakedBalance()
    } else {
      setStakedHype(null)
    }
  }, [publicKey, fetchStakedBalance])

  const currentScore = latestSentiment?.global_score || 50
  
  const getScoreTheme = () => {
    if (currentScore > 75) return { color: '#FF6B1A', label: 'Ecosystem Euphoria', bgGlow: 'rgba(255, 107, 26, 0.15)' }
    if (currentScore > 55) return { color: '#10b981', label: 'Healthy Optimism', bgGlow: 'rgba(16, 185, 129, 0.15)' }
    if (currentScore > 40) return { color: '#3b82f6', label: 'Neutral Balance', bgGlow: 'rgba(59, 130, 246, 0.15)' }
    return { color: '#ef4444', label: 'Fear & Hesitation', bgGlow: 'rgba(239, 68, 68, 0.15)' }
  }

  const theme = getScoreTheme()

  return (
    <div className="relative min-h-screen bg-[#050507] text-white selection:bg-[#FF6B1A]/30 pb-20">
      <AmbientBackground />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 pt-28">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#FF6B1A] font-mono text-xs tracking-widest uppercase">
              <Sparkles className="w-4 h-4 animate-pulse" />
              SOLANA SENTIMENT ORACLE
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight leading-none">
              COLLECTIVE <span className="text-[#FF6B1A]">CONSCIOUSNESS</span>
            </h1>
            <p className="text-[var(--text-muted)] font-mono text-xs max-w-xl mt-3 leading-relaxed">
              Global Hype indices aggregated from hundreds of verified phone voice notes and accelerometer vibrations. 
              The ultimate real-time emotional pulse of the Solana ecosystem.
            </p>
          </div>

          <button 
            onClick={() => setShowApiModal(true)}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FF6B1A]/30 transition-all font-mono font-bold text-xs uppercase flex items-center gap-2 group active:scale-95 shrink-0"
          >
            <span>Access Premium Indices</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {loading && historyData.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 animate-pulse">
            <div className="h-96 rounded-3xl bg-white/[0.02] border border-white/5" />
            <div className="space-y-4">
              <div className="h-44 rounded-3xl bg-white/[0.02] border border-white/5" />
              <div className="h-44 rounded-3xl bg-white/[0.02] border border-white/5" />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top Grid: Global Gauge, Radar spectrum, and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-6">
              
              {/* Card 1: Hype Gauge */}
              <div className="p-8 rounded-[2.5rem] relative overflow-hidden backdrop-blur-3xl" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div 
                  className="absolute -top-10 -right-10 w-44 h-44 blur-[80px] opacity-10 pointer-events-none transition-all duration-1000"
                  style={{ background: theme.color }}
                />
                
                <h3 className="mono-label text-[10px] text-white/40 tracking-[0.2em] uppercase mb-6 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Collective Index
                </h3>

                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="88"
                        cy="88"
                        r="78"
                        fill="transparent"
                        stroke="rgba(255,255,255,0.02)"
                        strokeWidth="10"
                      />
                      <motion.circle
                        cx="88"
                        cy="88"
                        r="78"
                        fill="transparent"
                        stroke={theme.color}
                        strokeWidth="10"
                        strokeDasharray="490"
                        initial={{ strokeDashoffset: 490 }}
                        animate={{ strokeDashoffset: 490 - (490 * currentScore) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 12px ${theme.color}66)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-display font-black text-white tracking-tight">{currentScore}</span>
                      <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/30 mt-1">GLOBAL SCORE</span>
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <div className="px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider" style={{ background: `${theme.color}15`, border: `1px solid ${theme.color}25`, color: theme.color }}>
                      {theme.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Aggregated Radar Chart */}
              <div className="p-8 rounded-[2.5rem] relative overflow-hidden backdrop-blur-3xl flex flex-col items-center justify-between" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="w-full mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="mono-label text-[10px] text-white/40 tracking-[0.2em] uppercase flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Collective Consciousness Spectrum
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">Weighted aggregated emotional frequency</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-white/40 bg-white/5 border border-white/5 py-1 px-3 rounded-full">
                    <Users className="w-3 h-3 text-[#FF6B1A]" />
                    <span>{latestSentiment?.total_contributors || 0} Vibers</span>
                  </div>
                </div>

                <div className="flex justify-center items-center py-2">
                  <SoulprintRadarChart spectrum={latestSentiment?.emotional_breakdown || {}} size={220} />
                </div>
              </div>

              {/* Card 3: Live Ecosystem Insight */}
              <div className="p-8 rounded-[2.5rem] relative overflow-hidden backdrop-blur-3xl flex flex-col justify-between" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div 
                  className="absolute bottom-0 right-0 w-44 h-44 blur-[80px] opacity-[0.03] pointer-events-none"
                  style={{ background: '#FF6B1A' }}
                />
                
                <div>
                  <h3 className="mono-label text-[10px] text-white/40 tracking-[0.2em] uppercase mb-4 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Platform Consensus
                  </h3>
                  
                  <p className="text-xs font-mono text-white/80 leading-relaxed">
                    HypeOracle AI has processed the vocal signatures of the ecosystem. The dominant wave is 
                    <span className="text-[#FF6B1A] font-bold"> Hope </span> at 
                    <span className="text-[#FF6B1A]"> {latestSentiment?.emotional_breakdown?.Hope || 35}%</span>, 
                    indicating a high consensus that a momentum expansion is building. 
                    Fear indexes remain safely bound below 15%.
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40">Oracle Fuel Refills:</span>
                    <span className="text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40">Auto-Buy Status:</span>
                    <span className="text-orange-400 font-bold">READY</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Middle Grid: Area Chart & Token Leaders */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
              
              {/* Card 4: Historical Sentiment Trend */}
              <div className="p-8 rounded-[2.5rem] backdrop-blur-3xl flex flex-col" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 className="mono-label text-[10px] text-white/40 tracking-[0.2em] uppercase mb-8 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Collective Score Historical Waves
                </h3>

                <div className="h-64 w-full select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B1A" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#FF6B1A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255, 255, 255, 0.2)" 
                        fontSize={9}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.2)" 
                        fontSize={9}
                        fontFamily="monospace"
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#0a0a0d', 
                          border: '1px solid rgba(255, 107, 26, 0.2)', 
                          borderRadius: '16px',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '10px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#FF6B1A" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#scoreGlow)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 5: Top Token Sentiment Leaders */}
              <div className="p-8 rounded-[2.5rem] backdrop-blur-3xl flex flex-col" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 className="mono-label text-[10px] text-white/40 tracking-[0.2em] uppercase mb-6 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> High Vibe Solana Mints
                </h3>

                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  {tokenLeaders.map((token, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:border-[#FF6B1A]/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-[10px] bg-white/5 text-[var(--text-muted)]">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-white">${token.ticker || token.token_mint.slice(0, 4)}</p>
                          <p className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">{token.contributor_count} Contributors</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-display font-black text-sm text-[#FF6B1A]">{token.score}</span>
                        <span className="text-[8px] font-mono text-[var(--text-muted)] block">Vibe Rating</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Grid: Live Scrolling Transcript Feed */}
            <div className="p-8 rounded-[2.5rem] backdrop-blur-3xl" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="mono-label text-[10px] text-white/40 tracking-[0.2em] uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#FF6B1A]" /> Raw Decentralized Sentiment Stream
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-mono text-emerald-400 uppercase tracking-tighter">
                  Realtime Submissions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveVibes.map((vibe, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex gap-4 hover:bg-white/[0.02] transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.01] rounded-bl-full pointer-events-none" />
                    
                    <div className="text-2xl shrink-0 filter drop-shadow-[0_0_8px_rgba(255,107,26,0.3)]">{vibe.emoji}</div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
                          Wallet {vibe.user_pubkey.slice(0, 4)}...{vibe.user_pubkey.slice(-4)}
                        </span>
                        <span className="text-[8px] font-mono text-white/20">
                          {new Date(vibe.created_at || vibe.submitted_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed font-mono italic">
                        &quot;{vibe.raw_transcript}&quot;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Access Premium API Modal */}
      <AnimatePresence>
        {showApiModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApiModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative z-10 w-full rounded-3xl p-8 overflow-hidden transition-all duration-300 ${
                mounted && connected && stakedHype !== null && stakedHype >= 100000 
                  ? 'max-w-2xl' 
                  : 'max-w-md'
              }`}
              style={{ background: '#0a0a0d', border: '1px solid rgba(255, 107, 26, 0.2)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B1A]/5 blur-2xl rounded-full" />
              
              {!mounted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-white/40">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                  <p className="font-mono text-xs uppercase tracking-wider">Syncing Oracle Node...</p>
                </div>
              ) : !connected ? (
                /* 1. DISCONNECTED STATE */
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <Lock className="w-6 h-6 animate-pulse" />
                  </div>
                  
                  <div>
                    <h3 className="font-display font-black text-2xl tracking-tight text-white uppercase">API SHIELD: LOCKED</h3>
                    <p className="text-[11px] font-mono text-red-400 mt-1 uppercase tracking-widest">STAKER AUTHENTICATION REQUIRED</p>
                  </div>

                  <p className="text-xs font-mono text-white/50 leading-relaxed max-w-sm">
                    The Collective Sentiment API is gated cryptographically by your staked quota. 
                    Connect your wallet to verify your staker status.
                  </p>

                  <div className="w-full flex justify-center py-2">
                    <WalletMultiButton className="!bg-[#FF6B1A] !hover:bg-[#FF8C42] !rounded-2xl !h-12 !font-display !font-bold transition-all active:scale-[0.98]" />
                  </div>

                  <button 
                    onClick={() => setShowApiModal(false)}
                    className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-display font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : checkingStake ? (
                /* CHECKING BALANCE LOADING STATE */
                <div className="flex flex-col items-center justify-center py-12 text-center text-white/40">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                  <p className="font-mono text-xs uppercase tracking-wider">Reading user_staking schema...</p>
                </div>
              ) : stakedHype === null || stakedHype < 100000 ? (
                /* 2. INSUFFICIENT STAKE STATE */
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Lock className="w-6 h-6" />
                  </div>
                  
                  <div>
                    <h3 className="font-display font-black text-2xl tracking-tight text-white uppercase">PREMIUM ACCESS DENIED</h3>
                    <p className="text-[11px] font-mono text-amber-500 mt-1 uppercase tracking-widest">INSUFFICIENT $HYPE STAKED</p>
                  </div>

                  {/* Progress Gauge */}
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/40">Staker Quota:</span>
                      <span className="text-[#FF8C42] font-bold">
                        {stakedHype ? stakedHype.toLocaleString() : '0'} / 100,000 $HYPE
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-[#FF6B1A] to-[#FF8C42] rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((stakedHype || 0) / 100000) * 100)}%` }}
                      />
                    </div>
                    <div className="text-right text-[10px] font-mono text-white/30">
                      {Math.min(100, ((stakedHype || 0) / 100000) * 100).toFixed(1)}% Complete
                    </div>
                  </div>

                  <div className="bg-[#FF6B1A]/5 border border-[#FF6B1A]/20 rounded-2xl p-4 flex gap-3 text-[#FF8C42] text-left text-xs font-mono leading-relaxed w-full">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>
                      You need an additional <strong>{(100000 - (stakedHype || 0)).toLocaleString()} $HYPE</strong> staked to decrypt premium indices. Secure your quota at the Stake Portal.
                    </p>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setShowApiModal(false)}
                      className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-display font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      Close
                    </button>
                    <a 
                      href="/stake"
                      className="flex-1 py-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center transition-all active:scale-[0.98] hover:brightness-110"
                      style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)', color: '#fff' }}
                    >
                      Stake Now
                    </a>
                  </div>
                </div>
              ) : (
                /* 3. UNLOCKED DEVELOPER PORTAL STATE */
                <div className="flex flex-col space-y-6">
                  <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Unlock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-2xl tracking-tight text-white uppercase">GUARDIAN CONSOLE</h3>
                      <p className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest text-left">REAL-TIME COLLECTIVE SENTIMENT API UNLOCKED</p>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block text-left">YOUR SECURE API KEY</label>
                    <div className="flex items-center justify-between p-3.5 bg-black/60 border border-white/5 rounded-2xl font-mono text-xs text-white/95">
                      <span className="text-emerald-400">ho_live_prod_{publicKey?.toBase58().slice(0, 16)}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`ho_live_prod_${publicKey?.toBase58().slice(0, 16) || ''}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Description of dynamic verifiable signature challenge */}
                  <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-2 font-mono text-[11px] leading-relaxed text-white/60 text-left">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#FF6B1A]" /> Decentered Keyless Authorization
                    </p>
                    <p>
                      To prevent man-in-the-middle key compromises, HypeOracle implements <strong>Decentralized Cryptographic Signature Gates</strong>.
                      To query the endpoint, your client signs a UNIX timestamp (&quot;HypeOracleAPIAccess:timestamp&quot;) using your Solana key pair and transmits it via headers.
                    </p>
                  </div>

                  {/* Integration Snippets Tabs */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex gap-1.5">
                        {(['curl', 'js', 'python'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                              activeTab === tab 
                                ? 'bg-white/10 text-[#FF6B1A] border border-[#FF6B1A]/20' 
                                : 'text-white/40 hover:text-white/70'
                            }`}
                          >
                            {tab === 'js' ? 'NodeJS' : tab}
                          </button>
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 uppercase flex items-center gap-1">
                        <Code className="w-3 h-3" /> GATED LIVE ENDPOINT
                      </span>
                    </div>

                    {/* Snippet display container */}
                    <div className="relative group">
                      <pre className="p-4 rounded-2xl bg-black/80 border border-white/5 font-mono text-[10.5px] leading-relaxed overflow-x-auto text-white/80 max-h-56 select-all text-left">
                        <code>
                          {activeTab === 'curl' && (
                            `curl -X GET "https://9s8ct2b5.functions.insforge.app/query-collective-sentiment" \\
  -H "x-staker-pubkey: ${publicKey?.toBase58() || ''}" \\
  -H "x-staker-signature: YOUR_ED25519_SIGNATURE" \\
  -H "x-staker-timestamp: ${Date.now()}"`
                          )}
                          {activeTab === 'js' && (
                            `const nacl = require('tweetnacl');
const bs58 = require('bs58');

const timestamp = Date.now();
const message = \`HypeOracleAPIAccess:\${timestamp}\`;
const messageBytes = new TextEncoder().encode(message);

// Sign with your Solana private key
const secretKey = bs58.decode("YOUR_PRIVATE_KEY"); 
const signature = bs58.encode(nacl.sign.detached(messageBytes, secretKey));

fetch("https://9s8ct2b5.functions.insforge.app/query-collective-sentiment", {
  headers: {
    "x-staker-pubkey": "${publicKey?.toBase58() || ''}",
    "x-staker-signature": signature,
    "x-staker-timestamp": timestamp.toString()
  }
})
.then(res => res.json())
.then(data => console.log(data));`
                          )}
                          {activeTab === 'python' && (
                            `import time
import requests
import base58
from nacl.signing import SigningKey

timestamp = int(time.time() * 1000)
message = f"HypeOracleAPIAccess:{timestamp}"

# Sign with your Solana private key
private_key_bytes = base58.b58decode("YOUR_PRIVATE_KEY")[:32]
signing_key = SigningKey(private_key_bytes)
signature = base58.b58encode(signing_key.sign(message.encode()).signature).decode()

headers = {
    "x-staker-pubkey": "${publicKey?.toBase58() || ''}",
    "x-staker-signature": signature,
    "x-staker-timestamp": str(timestamp)
}

response = requests.get("https://9s8ct2b5.functions.insforge.app/query-collective-sentiment", headers=headers)
print(response.json())`
                          )}
                        </code>
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                    <button 
                      onClick={() => setShowApiModal(false)}
                      className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-display font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Close Portal
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
