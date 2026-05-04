'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { ChevronLeft, BrainCircuit, Activity, Target, Zap, LayoutDashboard } from 'lucide-react'
import { AmbientBackground, ScoreGauge } from './ui-primitives'
import { SoulprintRadarChart } from './soulprint-radar-chart'
import { INSFORGE_CONFIG } from '@/lib/constants'
import { OFFICIAL_TOKEN } from '@/lib/token-config'

const client = createClient(INSFORGE_CONFIG)

export function PersonalAgentDashboard() {
  const { publicKey } = useWallet()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function fetchProfile(pubkey: string) {
    setLoading(true)
    const { data } = await client.database
      .from('user_vibe_profiles')
      .select('*')
      .eq('user_pubkey', pubkey)
      .maybeSingle()
    
    setProfile(data || null)
    setLoading(false)
  }

  useEffect(() => {
    if (publicKey) fetchProfile(publicKey.toBase58())
    else setLoading(false)
  }, [publicKey])

  async function handleTrainAgent() {
    if (!publicKey) return
    setTraining(true)
    setErrorMsg('')
    try {
      const { data, error } = await client.functions.invoke('train-personal-agent', {
        body: { user_pubkey: publicKey.toBase58() }
      })
      
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Unknown error occurred')
      
      await fetchProfile(publicKey.toBase58())
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setTraining(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <AmbientBackground />
        <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-20">
        </div>
        <motion.div
           initial={{ opacity: 0, scale: 0.96 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative z-10 text-center space-y-6 p-8 rounded-3xl"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-5xl mb-2">🧠</div>
          <div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Emotional Soulprint</h2>
            <p className="mono-label text-sm max-w-sm">Connect your wallet to analyze your on-chain emotional identity.</p>
          </div>
          <div className="flex justify-center">
            {mounted ? <WalletMultiButton /> : <div className="h-[48px] w-[150px] rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-20">
      <AmbientBackground />

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex justify-between items-center mb-10 pt-24">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-white transition-colors group">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-white/5 group-hover:bg-white/10 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </div>
            BACK TO ORACLE
          </Link>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white tracking-tight">My Soulprint</h1>
              <p className="mono-label text-[0.6rem] text-white/40 mt-0.5">
                On-Chain Emotional Identity
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="h-64 rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
        ) : !profile ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-12 rounded-[2rem] text-center backdrop-blur-xl relative overflow-hidden" style={{ background: 'rgba(255, 107, 26, 0.03)', border: '1px solid rgba(255, 107, 26, 0.1)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FF6B1A]/5 pointer-events-none" />
            <div className="text-7xl mb-6 drop-shadow-[0_0_15px_rgba(255,107,26,0.3)]">🧠</div>
            <h2 className="font-display font-bold text-2xl text-white mb-3">Initialize Soulprint</h2>
            <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs mx-auto leading-relaxed">
              Your on-chain emotional frequency hasn&apos;t been synthesized yet. Train your AI to unlock your Soulprint.
            </p>
            
            <button
               onClick={handleTrainAgent}
               disabled={training}
               className="relative px-10 py-4 rounded-2xl font-bold font-mono text-white transition-all w-full sm:w-auto group overflow-hidden"
               style={{ background: training ? 'rgba(255, 107, 26, 0.2)' : '#FF6B1A' }}
            >
              <span className="relative z-10">{training ? 'Synthesizing...' : 'Calibrate Soulprint'}</span>
              {!training && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
            </button>
            
            {errorMsg && <p className="text-red-400 mt-6 text-xs font-mono bg-red-400/5 py-2 px-4 rounded-lg inline-block">{errorMsg}</p>}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             {/* Profile Card */}
             <div className="p-6 sm:p-10 rounded-[2.5rem] mb-8 relative overflow-hidden backdrop-blur-3xl" style={{ background: 'rgba(5, 5, 7, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                {/* Visual Risk Gradient */}
                <div 
                   className="absolute top-0 right-0 w-80 h-80 blur-[120px] opacity-10 pointer-events-none transition-colors duration-1000" 
                   style={{ background: profile.risk_tolerance > 70 ? '#FF3D00' : profile.risk_tolerance > 40 ? '#FF6B1A' : '#3b82f6' }}
                />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12 text-center sm:text-left">
                   <div className="relative group">
                      <div className="absolute inset-0 bg-[#FF6B1A]/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <ScoreGauge score={profile.risk_tolerance} size={100} />
                      <div className="absolute -top-1 -right-1 bg-[#FF6B1A] text-[10px] font-bold px-1.5 py-0.5 rounded-full text-black">RISK</div>
                   </div>
                   <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2 justify-center sm:justify-start">
                        <h2 className="font-display font-black text-4xl text-white uppercase tracking-tight">{profile.agent_name}</h2>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/50 uppercase tracking-tighter">Level {Math.floor(profile.total_vibes / 5) + 1} Soul</span>
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-lg">{profile.personality_summary}</p>
                   </div>
                </div>

                {/* Soulprint Emotional Spectrum */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 items-center">
                   <div className="flex justify-center bg-white/[0.02] rounded-3xl p-6 border border-white/5">
                      <SoulprintRadarChart spectrum={profile.emotional_spectrum || {}} size={240} />
                   </div>

                   <div className="space-y-6">
                      <h3 className="mono-label text-[0.65rem] text-[#FF6B1A] tracking-[0.2em] uppercase">Behavioral Indices</h3>
                      
                      {/* Trait Meters */}
                      {[
                        { label: 'Panic Index', value: profile.panic_index, color: '#ef4444', icon: <Activity className="w-3 h-3" /> },
                        { label: 'FOMO Index', value: profile.fomo_index, color: '#f59e0b', icon: <Zap className="w-3 h-3" /> },
                        { label: 'Conviction', value: profile.conviction_index, color: '#10b981', icon: <Target className="w-3 h-3" /> }
                      ].map((trait, i) => (
                        <div key={i} className="space-y-1.5">
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                {trait.icon} {trait.label}
                              </span>
                              <span className="text-white font-bold">{trait.value}%</span>
                           </div>
                           <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${trait.value}%` }}
                                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                className="h-full rounded-full" 
                                style={{ background: trait.color, boxShadow: `0 0 10px ${trait.color}44` }} 
                              />
                           </div>
                        </div>
                      ))}

                      <div className="pt-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-1">Current Trading Archetype</span>
                          <p className="font-display font-bold text-white text-lg capitalize">{profile.trading_style}</p>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Symbiosis Protocol Active Status */}
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.8 }}
                   className="p-5 rounded-3xl mb-12 relative overflow-hidden"
                   style={{ 
                     background: 'rgba(16, 185, 129, 0.05)', 
                     border: '1px solid rgba(16, 185, 129, 0.2)' 
                   }}
                 >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                   <div className="flex items-center gap-4 relative z-10">
                     <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                        <Activity className="w-5 h-5 text-emerald-400" />
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Protocol Active</span>
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <h4 className="font-display font-bold text-white text-lg">AI-Human Symbiosis</h4>
                        <p className="text-[10px] font-mono text-white/50 mt-1 max-w-md">
                          Your Oracle has synchronized with your Soulprint. Trading parameters (thresholds, sizing, and risk) are now dynamically scaling based on your emotional frequency.
                        </p>
                     </div>
                   </div>
                 </motion.div>

                {/* Behavioral Insights */}
                <div className="mb-10 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                   <h3 className="mono-label mb-5 text-[0.65rem] text-white/40 tracking-widest uppercase">Deep Consciousness Insights</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {Array.isArray(profile.favorite_tokens) && profile.favorite_tokens.map((insight: string, idx: number) => (
                         <div key={idx} className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-[#FF6B1A]/30 transition-colors">
                            <span className="text-[#FF6B1A]"><Zap className="w-4 h-4" /></span>
                            <span className="text-xs text-white/70 leading-relaxed font-medium">{insight}</span>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Daily Recommendation */}
                <div className="mb-10 p-6 rounded-3xl border border-[#FF6B1A]/20 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(255, 107, 26, 0.05), transparent)' }}>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6B1A] opacity-[0.03] blur-[60px] pointer-events-none" />
                  <div className="flex items-start gap-5 relative z-10">
                    <div className="mt-1 shrink-0 p-2.5 bg-[#FF6B1A]/10 rounded-xl border border-[#FF6B1A]/20">
                      <BrainCircuit className="w-5 h-5 text-[#FF6B1A]" />
                    </div>
                    <div>
                      <h3 className="mono-label text-[0.65rem] text-[#FF6B1A] mb-2 tracking-widest uppercase">Oracle Synergy Report</h3>
                      <p className="text-white/80 text-sm leading-relaxed font-medium">
                        Based on your {profile.trading_style} profile and {profile.conviction_index}% conviction rate, the Oracle suggests 
                        {profile.risk_tolerance > 70 ? ' aggressive deployment into emerging volatility' : ' tactical positioning in consolidated assets'} like <span className="text-[#FF6B1A] font-bold">${OFFICIAL_TOKEN.symbol}</span>. 
                        {OFFICIAL_TOKEN.isLive ? ' High-vibe momentum detected.' : ' Prepare for liquidity induction.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                        Data Points: {profile.total_vibes}
                      </div>
                      <div className="h-3 w-[1px] bg-white/10" />
                      <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                        Status: SYNCED
                      </div>
                   </div>
                   <button 
                      onClick={handleTrainAgent}
                      disabled={training}
                      className="text-xs font-bold text-[#FF6B1A] hover:text-[#FF3D00] transition-colors bg-transparent disabled:opacity-50 flex items-center gap-2 group"
                   >
                      {training ? 'RECALIBRATING...' : 'RECALIBRATE SOULPRINT'}
                      <ChevronLeft className="w-3 h-3 rotate-180 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>
             
             {errorMsg && <p className="text-red-400 mt-4 text-xs font-mono text-center">{errorMsg}</p>}
          </motion.div>
        )}
      </main>
    </div>
  )
}
