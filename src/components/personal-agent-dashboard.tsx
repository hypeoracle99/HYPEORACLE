'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { ChevronLeft, BrainCircuit, Activity, Target, Zap, LayoutDashboard } from 'lucide-react'
import { AmbientBackground } from './ui-primitives'
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
            <h2 className="font-display font-bold text-xl text-white mb-2">Personal Vibe Agent</h2>
            <p className="mono-label text-sm max-w-sm">Connect your wallet to train or view your personalized AI trading companion.</p>
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
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">My Vibe Agent</h1>
              <p className="mono-label overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] sm:max-w-[400px]" style={{ fontSize: '0.6rem' }}>
                Wallet Context: {publicKey.toBase58()}
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="h-64 rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
        ) : !profile ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-3xl text-center" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="font-display font-bold text-xl text-white mb-2">No Agent Brain Found</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
              Your personal AI doesn&apos;t know who you are yet. Train it using your past vibe submissions!
            </p>
            
            <button
               onClick={handleTrainAgent}
               disabled={training}
               className="px-8 py-3 rounded-xl font-bold font-mono text-white transition-all w-full sm:w-auto"
               style={{ background: training ? 'rgba(16, 185, 129, 0.3)' : '#10b981' }}
            >
              {training ? 'Scanning Brainwaves...' : 'Train My Vibe Agent'}
            </button>
            
            {errorMsg && <p className="text-red-400 mt-4 text-xs font-mono">{errorMsg}</p>}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             {/* Profile Card */}
             <div className="p-6 sm:p-8 rounded-3xl mb-6 relative overflow-hidden backdrop-blur-xl" style={{ background: 'rgba(20, 20, 20, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                {/* Visual Risk Gradient */}
                <div 
                   className="absolute top-0 right-0 w-64 h-64 blur-[80px] opacity-20 pointer-events-none transition-colors duration-1000" 
                   style={{ background: profile.risk_tolerance > 70 ? '#ef4444' : profile.risk_tolerance > 40 ? '#f59e0b' : '#3b82f6' }}
                />

                <div className="flex items-start gap-4 mb-8">
                   <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {profile.risk_tolerance > 80 ? '🦍' : profile.risk_tolerance > 50 ? '🐂' : '🦉'}
                   </div>
                   <div>
                      <h2 className="font-display font-bold text-3xl text-white">{profile.agent_name}</h2>
                      <p className="text-[var(--text-secondary)] font-medium mt-1">{profile.personality_summary}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                   <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between mb-2">
                         <span className="mono-label text-[0.6rem] flex items-center gap-1"><Activity className="w-3 h-3" /> Risk Tolerance</span>
                         <span className="font-mono text-xs font-bold text-white">{profile.risk_tolerance}/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                         <div className="h-full rounded-full" style={{ width: `${profile.risk_tolerance}%`, background: `linear-gradient(90deg, #3b82f6, ${profile.risk_tolerance > 50 ? '#f59e0b' : '#3b82f6'}, ${profile.risk_tolerance > 80 ? '#ef4444' : '#f59e0b'})` }} />
                      </div>
                   </div>

                   <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-2 mb-2">
                         <Target className="w-3 h-3 text-[var(--text-muted)]" />
                         <span className="mono-label text-[0.6rem]">Trading Style</span>
                      </div>
                      <p className="font-display font-bold text-white capitalize">{profile.trading_style}</p>
                   </div>
                </div>

                <div className="mb-8">
                   <h3 className="mono-label mb-3 text-[0.65rem] border-b border-white/10 pb-2">Behavioral Insights</h3>
                   <ul className="space-y-2">
                      {Array.isArray(profile.favorite_tokens) && profile.favorite_tokens.map((insight: string, idx: number) => (
                         <li key={idx} className="flex gap-2 text-sm text-[var(--text-secondary)]">
                            <span className="text-[#10b981] mt-0.5"><Zap className="w-3 h-3" /></span>
                            <span>{insight}</span>
                         </li>
                      ))}
                   </ul>
                </div>

                {/* Daily Recommendation from Token Config */}
                <div className="mb-8 p-5 rounded-2xl border border-white/5 relative overflow-hidden group" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981] opacity-10 blur-[40px] pointer-events-none group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="mt-1 shrink-0 px-2 py-1 bg-[#10b981]/20 rounded-md border border-[#10b981]/30">
                      <Zap className="w-4 h-4 text-[#10b981]" />
                    </div>
                    <div>
                      <h3 className="mono-label text-[0.65rem] text-[#10b981] mb-1.5 tracking-wider">DAILY RECOMMENDATION</h3>
                      <p className="text-white/90 text-sm leading-relaxed">
                        Based on your risk tolerance of <span className="font-mono text-[#10b981]">{profile.risk_tolerance}</span>, your agent is closely monitoring <span className="font-bold text-[#10b981]">${OFFICIAL_TOKEN.symbol}</span> momentum. 
                        {OFFICIAL_TOKEN.isLive ? ' Active market conditions detected, prioritize high-conviction vibes.' : ' Prepare for impending bonding curve launch.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                   <div className="text-xs text-[var(--text-muted)] font-mono">
                      Trained on {profile.total_vibes} vibes
                   </div>
                   <button 
                      onClick={handleTrainAgent}
                      disabled={training}
                      className="text-xs font-bold text-[#10b981] hover:text-[#059669] transition-colors bg-transparent disabled:opacity-50"
                   >
                      {training ? 'Retraining...' : 'Recalibrate Agent ->'}
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
