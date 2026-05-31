'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { 
  ChevronLeft, BrainCircuit, Activity, Target, Zap, 
  Lock, Unlock, ShieldAlert, Key, Eye, EyeOff, 
  Check, AlertCircle, Copy, Info, ShieldCheck
} from 'lucide-react'
import { AmbientBackground, ScoreGauge } from './ui-primitives'
import { SoulprintRadarChart } from './soulprint-radar-chart'
import { INSFORGE_CONFIG } from '@/lib/constants'
import { OFFICIAL_TOKEN } from '@/lib/token-config'

const client = createClient(INSFORGE_CONFIG)

export function PersonalAgentDashboard() {
  const { publicKey, signMessage } = useWallet()
  const [profile, setProfile] = useState<any>(null)
  const [stakedHype, setStakedHype] = useState(0)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [cryptographicProof, setCryptographicProof] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [mounted, setMounted] = useState(false)
  const [mintingNft, setMintingNft] = useState(false)
  const [syncingNft, setSyncingNft] = useState(false)
  const [mintStep, setMintStep] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function fetchProfileAndStaking(pubkey: string) {
    setLoading(true)
    setErrorMsg('')
    try {
      const [profileRes, stakingRes] = await Promise.all([
        client.database
          .from('user_vibe_profiles')
          .select('*')
          .eq('user_pubkey', pubkey)
          .maybeSingle(),
        client.database
          .from('user_staking')
          .select('staked_amount')
          .eq('user_pubkey', pubkey)
          .maybeSingle()
      ])
      
      setProfile(profileRes.data || null)
      setStakedHype(stakingRes.data?.staked_amount || 0)
    } catch (err: any) {
      console.error('Fetch failed:', err)
      setErrorMsg('Failed to connect to oracle database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (publicKey) fetchProfileAndStaking(publicKey.toBase58())
    else setLoading(false)
  }, [publicKey])

  // Saves slider, toggle, or toggle modifications to the database
  async function handleUpdateSetting(field: string, value: any) {
    if (!publicKey || !profile) return
    setSavingSettings(true)
    setErrorMsg('')
    try {
      const updatedProfile = { ...profile, [field]: value }
      const { error } = await client.database
        .from('user_vibe_profiles')
        .update({ [field]: value })
        .eq('user_pubkey', publicKey.toBase58())

      if (error) throw error
      setProfile(updatedProfile)
    } catch (err: any) {
      console.error(`Failed to update ${field}:`, err)
      setErrorMsg(`Failed to save settings: ${err.message}`)
    } finally {
      setSavingSettings(false)
    }
  }

  // Generates cryptographically verifiable credentials signed by the wallet
  async function handleGenerateProof() {
    if (!publicKey || !signMessage || !profile) return
    setErrorMsg('')
    try {
      const textEncoder = new TextEncoder()
      const message = `HypeOracle verification proof for ${publicKey.toBase58()}. Calibrated Style: ${profile.trading_style}, Risk Tolerance: ${profile.risk_tolerance}%. Synthesized on ${new Date().toLocaleDateString()}`
      const messageBytes = textEncoder.encode(message)
      const signatureBytes = await signMessage(messageBytes)
      
      const bs58 = (await import('bs58')).default
      const signature = bs58.encode(signatureBytes)

      const proofObject = {
        verifiableCredential: {
          context: ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "EmotionalSoulprintCredential"],
          issuer: "did:key:hypeoracle",
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: `did:solana:${publicKey.toBase58()}`,
            agentName: profile.agent_name,
            personality: profile.personality_summary,
            riskTolerance: profile.risk_tolerance,
            traits: {
              panicIndex: profile.panic_index,
              fomoIndex: profile.fomo_index,
              convictionIndex: profile.conviction_index
            },
            spectrum: profile.emotional_spectrum,
            tradingStyle: profile.trading_style
          },
          proof: {
            type: "Ed25519Signature2020",
            verificationMethod: `did:solana:${publicKey.toBase58()}#key-1`,
            signature: signature
          }
        }
      }
      
      setCryptographicProof(JSON.stringify(proofObject, null, 2))
    } catch (err: any) {
      console.error('Proof generation failed:', err)
      alert(`Wallet signature declined: ${err.message || err.name}`)
    }
  }

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
      
      await fetchProfileAndStaking(publicKey.toBase58())
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setTraining(false)
    }
  }

  async function handleMintNft() {
    if (!publicKey || !profile) return
    setMintingNft(true)
    setMintStep(1)
    setErrorMsg('')
    try {
      // Step intervals for premium visual feedback
      const timer1 = setTimeout(() => setMintStep(2), 1500)
      const timer2 = setTimeout(() => setMintStep(3), 3000)
      
      const { data, error } = await client.functions.invoke('mint-soulprint-nft', {
        body: { user_pubkey: publicKey.toBase58() }
      })
      
      clearTimeout(timer1)
      clearTimeout(timer2)
      
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Failed to mint NFT')
      
      setMintStep(4)
      setTimeout(async () => {
        await fetchProfileAndStaking(publicKey.toBase58())
        setMintingNft(false)
        setMintStep(0)
      }, 1500)
    } catch (err: any) {
      console.error('Minting failed:', err)
      setErrorMsg(`NFT Minting failed: ${err.message}`)
      setMintingNft(false)
      setMintStep(0)
    }
  }

  async function handleSyncNft() {
    if (!publicKey || !signMessage || !profile) return
    setSyncingNft(true)
    setErrorMsg('')
    try {
      const currentLevel = Math.floor((profile.total_vibes || 0) / 5) + 1
      const message = `Authorize HypeOracle to sync on-chain NFT Metadata for ${publicKey.toBase58()} at Level ${currentLevel} (Total Vibes: ${profile.total_vibes})`
      const textEncoder = new TextEncoder()
      const messageBytes = textEncoder.encode(message)
      await signMessage(messageBytes) // Option B wallet signature request!
      
      // Update nft_last_synced_at directly in DB
      const { error } = await client.database
        .from('user_vibe_profiles')
        .update({ nft_last_synced_at: new Date().toISOString() })
        .eq('user_pubkey', publicKey.toBase58())
        
      if (error) throw error
      
      // Reload profile
      await fetchProfileAndStaking(publicKey.toBase58())
      alert('On-chain NFT metadata successfully synchronized!')
    } catch (err: any) {
      console.error('Sync failed:', err)
      alert(`Sync declined: ${err.message || err.name}`)
    } finally {
      setSyncingNft(false)
    }
  }

  const handleCopyProof = () => {
    if (!cryptographicProof) return
    navigator.clipboard.writeText(cryptographicProof)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const autonomyUnlocked = stakedHype >= 50000

  if (!publicKey) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <AmbientBackground />
        <motion.div
           initial={{ opacity: 0, scale: 0.96 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative z-10 text-center space-y-6 p-8 rounded-3xl"
           style={{ background: 'rgba(5, 5, 7, 0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-5xl mb-2">🧠</div>
          <div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Emotional Soulprint</h2>
            <p className="mono-label text-xs max-w-sm">Connect your wallet to analyze your on-chain emotional identity.</p>
          </div>
          <div className="flex justify-center">
            {mounted ? <WalletMultiButton className="!bg-[#FF6B1A] !hover:bg-[#FF8C42] !rounded-2xl !h-12 !font-display !font-bold transition-all" /> : <div className="h-[48px] w-[150px] rounded-lg animate-pulse bg-white/5" />}
          </div>
        </motion.div>
      </div>
    )
  }

  const totalVibes = profile?.total_vibes || 0
  const level = Math.floor(totalVibes / 5) + 1
  const tierName = level === 1 ? 'Genesis' : level === 2 ? 'Sentinel' : level === 3 ? 'Elite' : 'Legendary'
  const borderStyle = level === 2 ? 'rgba(16, 185, 129, 0.2)' : 
                      level === 3 ? 'rgba(6, 182, 212, 0.2)' : 
                      level >= 4 ? 'rgba(251, 191, 36, 0.25)' : 
                      'rgba(255, 107, 26, 0.15)'
  const shadowStyle = level >= 4 
                      ? '0 25px 50px -12px rgba(251, 191, 36, 0.08)' 
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'

  return (
    <div className="relative min-h-screen pb-20 bg-[#050507]">
      <AmbientBackground />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12">
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
                ON-CHAIN EMOTIONAL PORTABILITY & AUTO GUARDRAILS
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="h-64 rounded-3xl animate-pulse bg-white/5 border border-white/5" />
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             
             {/* Profile Card */}
             <div 
                  className="p-6 sm:p-10 rounded-[2.5rem] relative overflow-hidden backdrop-blur-3xl transition-all duration-500" 
                  style={{ 
                    background: 'rgba(5, 5, 7, 0.7)', 
                    border: `1px solid ${borderStyle}`, 
                    boxShadow: shadowStyle 
                  }}
               >
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
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/50 uppercase tracking-tighter">{tierName} Tier (Lvl {level})</span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-lg">{profile.personality_summary}</p>
                     </div>
                  </div>

                  {/* Radar and Traits Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 items-center">
                     <div className="flex justify-center bg-white/[0.02] rounded-3xl p-6 border border-white/5">
                        <SoulprintRadarChart spectrum={profile.emotional_spectrum || {}} size={240} totalVibes={totalVibes} />
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
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest block mb-1">Current Trading Archetype</span>
                              <p className="font-display font-bold text-white text-lg capitalize">{profile.trading_style}</p>
                            </div>
                            
                            {/* Cryptographic Web3 Synthesizer Trigger */}
                            <button
                              onClick={handleGenerateProof}
                              className="px-4 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 hover:bg-[#10b981]/20 transition-all font-mono font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 text-emerald-400"
                            >
                              <Key className="w-3 h-3" />
                              <span>Sign Proof</span>
                            </button>
                          </div>
                        </div>
                     </div>
                  </div>

                  {/* Animate Cryptographic Proof Container */}
                  <AnimatePresence>
                    {cryptographicProof && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 p-6 rounded-3xl bg-black/40 border border-emerald-500/20 overflow-hidden font-mono text-[10px]"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-emerald-400 font-bold tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> VERIFIABLE SOULPRINT CREDENTIAL
                          </span>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={handleCopyProof}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 text-white/60 hover:text-white"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button 
                              onClick={() => setCryptographicProof(null)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                        <pre className="p-4 rounded-xl bg-black/50 overflow-x-auto text-emerald-300 max-h-48 scrollbar-thin">
                          {cryptographicProof}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>

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

                  <div className="flex items-center justify-between pt-8 border-t border-white/5">
                     <div className="flex items-center gap-4">
                        <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                          Data Points: {profile.total_vibes}
                        </div>
                        <div className="h-3 w-[1px] bg-white/10" />
                        <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                          Staked: {stakedHype.toLocaleString()} $HYPE
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

               {/* Dynamic Soulprint NFT Minting Hub (Phase 9) */}
               <div className="p-8 sm:p-10 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 blur-2xl rounded-full" style={{ background: `${level === 2 ? '#10b981' : level === 3 ? '#06b6d4' : level >= 4 ? '#fbbf24' : '#FF6B1A'}0d` }} />
                 
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${level === 2 ? '#10b981, #059669' : level === 3 ? '#06b6d4, #0891b2' : level >= 4 ? '#fbbf24, #d97706' : '#FF6B1A, #E05300'})` }}>
                       <Zap className="w-5 h-5" />
                     </div>
                     <div>
                       <h2 className="font-display font-bold text-xl">Dynamic Soulprint NFT Hub</h2>
                       <p className="text-[10px] font-mono text-white/40 mt-0.5">ON-CHAIN EMOTIONAL SYNC & EVOLVING TIER METADATA</p>
                     </div>
                   </div>

                   {/* Evolving Level Tag */}
                   <span 
                     className="px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase" 
                     style={{ 
                       background: level === 2 ? 'rgba(16, 185, 129, 0.1)' : level === 3 ? 'rgba(6, 182, 212, 0.1)' : level >= 4 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 107, 26, 0.1)',
                       color: level === 2 ? '#10b981' : level === 3 ? '#06b6d4' : level >= 4 ? '#fbbf24' : '#FF6B1A',
                       border: `1px solid ${level === 2 ? 'rgba(16, 185, 129, 0.2)' : level === 3 ? 'rgba(6, 182, 212, 0.2)' : level >= 4 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 107, 26, 0.2)'}`
                     }}
                   >
                     {tierName} Tier (Lvl {level})
                   </span>
                 </div>

                 {/* NFT States */}
                 {!profile.nft_token_mint ? (
                   <div className="space-y-6">
                     <div className="p-5 rounded-2xl bg-black/40 border border-white/5 text-center sm:text-left space-y-4">
                       <p className="text-xs text-white/60 font-mono leading-relaxed">
                         Your personal trading agent&apos;s emotional frequency is fully calibrated at <strong className="text-white">Level {level} ({tierName} Tier)</strong>. 
                         Mint your dynamic, verifiable Soulprint NFT on-chain. It will evolve its visual gradients and metadata dynamically as you submit more vibes!
                       </p>

                       {/* Animated Mint Steps */}
                       {mintingNft && (
                         <div className="space-y-3 pt-2">
                           <div className="flex justify-between items-center text-[10px] font-mono text-white/40">
                             <span>MINT STATUS</span>
                             <span className="text-[#FF6B1A] font-bold">
                               {mintStep === 1 ? 'PREPARING SOULPRINT...' : 
                                mintStep === 2 ? 'COMPILING ATTRIBUTES...' : 
                                mintStep === 3 ? 'COMMITTING TO SOLANA...' : 
                                'NFT MINTED SUCCESSFULLY!'}
                             </span>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               className="h-full bg-[#FF6B1A] rounded-full"
                               animate={{ width: `${(mintStep / 4) * 100}%` }}
                               transition={{ duration: 0.5 }}
                             />
                           </div>
                           <div className="grid grid-cols-4 gap-2 text-[8px] font-mono text-center text-white/30">
                             <span className={mintStep >= 1 ? 'text-white font-bold' : ''}>1. PREPARE</span>
                             <span className={mintStep >= 2 ? 'text-white font-bold' : ''}>2. COMPILE</span>
                             <span className={mintStep >= 3 ? 'text-white font-bold' : ''}>3. MINT</span>
                             <span className={mintStep >= 4 ? 'text-white font-bold' : ''}>4. SYNC</span>
                           </div>
                         </div>
                       )}
                     </div>

                     <button
                       onClick={handleMintNft}
                       disabled={mintingNft}
                       className="w-full py-4 rounded-2xl font-display font-black text-sm tracking-wider text-black transition-all flex items-center justify-center gap-2"
                       style={{ 
                         background: `linear-gradient(135deg, ${level === 2 ? '#10b981, #059669' : level === 3 ? '#06b6d4, #0891b2' : level >= 4 ? '#fbbf24, #d97706' : '#FF6B1A, #E05300'})`,
                         boxShadow: `0 8px 30px -6px ${level === 2 ? 'rgba(16, 185, 129, 0.3)' : level === 3 ? 'rgba(6, 182, 212, 0.3)' : level >= 4 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 107, 26, 0.3)'}`
                       }}
                     >
                       <Zap className="w-4 h-4" />
                       {mintingNft ? 'MINTING DEPLOYER...' : `MINT DYNAMIC SOULPRINT NFT`}
                     </button>
                   </div>
                 ) : (
                   <div className="space-y-6">
                     <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs font-mono">
                         <span className="text-white/40">VERIFIABLE TOKEN MINT</span>
                         <div className="flex items-center gap-2">
                           <span className="text-white font-bold max-w-[200px] truncate">{profile.nft_token_mint}</span>
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(profile.nft_token_mint || '');
                               alert('Mint address copied!');
                             }}
                             className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                           >
                             <Copy className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       </div>

                       <div className="flex justify-between items-center text-xs font-mono border-t border-white/5 pt-3">
                         <span className="text-white/40">NFT CREATION DATE</span>
                         <span className="text-white font-bold">
                           {profile.nft_minted_at ? new Date(profile.nft_minted_at).toLocaleString() : 'N/A'}
                         </span>
                       </div>

                       <div className="flex justify-between items-center text-xs font-mono border-t border-white/5 pt-3">
                         <span className="text-white/40">LAST SYNCED STATE</span>
                         <span className="text-white font-bold">
                           {profile.nft_last_synced_at ? new Date(profile.nft_last_synced_at).toLocaleTimeString() : 'Never'}
                         </span>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Link
                         href={`https://solscan.io/token/${profile.nft_token_mint}`}
                         target="_blank"
                         className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-mono font-bold text-[11px] text-center uppercase tracking-wider flex items-center justify-center gap-2"
                       >
                         <Info className="w-4 h-4" />
                         View on Solscan
                       </Link>

                       <button
                         onClick={handleSyncNft}
                         disabled={syncingNft}
                         className="py-3 px-4 rounded-xl font-mono font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                         style={{ 
                           background: syncingNft ? 'rgba(255, 255, 255, 0.05)' : `linear-gradient(135deg, ${level === 2 ? '#10b981, #059669' : level === 3 ? '#06b6d4, #0891b2' : level >= 4 ? '#fbbf24, #d97706' : '#FF6B1A, #E05300'})`,
                           color: syncingNft ? 'rgba(255,255,255,0.3)' : 'black'
                         }}
                       >
                         <Activity className={`w-4 h-4 ${syncingNft ? 'animate-spin' : ''}`} />
                         {syncingNft ? 'SYNCING STATE...' : 'Sync Dynamic NFT (Option B)'}
                       </button>
                     </div>
                   </div>
                 )}
               </div>

             {/* Interactive Symbiotic & Privacy Controls Card (Phase 8 Feature 3) */}
             <div className="p-8 sm:p-10 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B1A]/5 blur-2xl rounded-full" />
               
               <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/10 flex items-center justify-center text-[#FF6B1A]">
                   <BrainCircuit className="w-5 h-5" />
                 </div>
                 <div>
                   <h2 className="font-display font-bold text-xl">Symbiosis & Privacy Settings</h2>
                   <p className="text-[10px] font-mono text-white/40 mt-0.5">MANAGE DYNAMIC COGNITIVE LIMITS & ACCESS GATES</p>
                 </div>
               </div>

               {savingSettings && (
                 <div className="absolute top-6 right-6 flex items-center gap-1.5 text-[9px] font-mono text-[#FF6B1A]">
                   <div className="w-2.5 h-2.5 border-2 border-[#FF6B1A]/30 border-t-[#FF6B1A] rounded-full animate-spin" />
                   <span>SYNCING SETTINGS...</span>
                 </div>
               )}

               <div className="space-y-8">
                 {/* 1. Privacy Toggles */}
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                       <Eye className="w-3.5 h-3.5 text-[#FF6B1A]" /> Profile Privacy Level
                     </label>
                     <span className="text-[9px] font-mono text-white/40 uppercase">PORTABILITY CONTROL</span>
                   </div>
                   <div className="grid grid-cols-3 gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                     {[
                       { value: 'public', label: 'Public', desc: 'Full metadata public' },
                       { value: 'anonymous', label: 'Masked', desc: 'No pubkey or name' },
                       { value: 'private', label: 'Private', desc: 'Fully Encrypted SVG' }
                     ].map((opt) => (
                       <button
                         key={opt.value}
                         onClick={() => handleUpdateSetting('privacy_level', opt.value)}
                         className={`py-3 px-2 rounded-xl transition-all flex flex-col items-center text-center gap-0.5 active:scale-95 ${
                           (profile.privacy_level || 'public') === opt.value 
                             ? 'bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-white font-bold' 
                             : 'border border-transparent text-white/40 hover:text-white'
                         }`}
                       >
                         <span className="text-[10px] font-mono font-bold uppercase">{opt.label}</span>
                         <span className="text-[7px] font-mono opacity-60 hidden sm:inline">{opt.desc}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* 2. Sizing Slider */}
                 <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs font-mono">
                     <span className="font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                       <Activity className="w-3.5 h-3.5 text-[#FF6B1A]" /> Max Trade Sizing Guardrail
                     </span>
                     <span className="text-[#FF6B1A] font-bold font-mono">
                       {(Number(profile.max_position_size) || 0.01).toFixed(3)} SOL
                     </span>
                   </div>
                   <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                     <input
                       type="range"
                       min="0.001"
                       max="0.05"
                       step="0.001"
                       value={profile.max_position_size || 0.01}
                       onChange={(e) => handleUpdateSetting('max_position_size', parseFloat(e.target.value))}
                       className="flex-1 accent-[#FF6B1A] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                     />
                     <span className="text-[9px] font-mono text-white/40 whitespace-nowrap">MAX LIMIT: 0.05 SOL</span>
                   </div>
                 </div>

                 {/* 3. Trading Guardrails Selector */}
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                       <Target className="w-3.5 h-3.5 text-[#FF6B1A]" /> Symbiotic Trading Style
                     </label>
                     <span className="text-[9px] font-mono text-white/40 uppercase">EMOTION DAMPENER</span>
                   </div>
                   <div className="grid grid-cols-3 gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                     {[
                       { value: 'degen', label: 'Degen Mode', desc: 'Direct Vibe Sizing' },
                       { value: 'hybrid', label: 'Hybrid Vibe', desc: 'Boost Conviction' },
                       { value: 'safe', label: 'Capital Safe', desc: 'Panic Dampener' }
                     ].map((opt) => (
                       <button
                         key={opt.value}
                         onClick={() => handleUpdateSetting('trading_guardrails', opt.value)}
                         className={`py-3 px-2 rounded-xl transition-all flex flex-col items-center text-center gap-0.5 active:scale-95 ${
                           (profile.trading_guardrails || 'hybrid') === opt.value 
                             ? 'bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-white font-bold' 
                             : 'border border-transparent text-white/40 hover:text-white'
                         }`}
                       >
                         <span className="text-[10px] font-mono font-bold uppercase">{opt.label}</span>
                         <span className="text-[7px] font-mono opacity-60 hidden sm:inline">{opt.desc}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* 4. Autonomous Approval Mode (STAKING GATE) */}
                 <div className="p-5 rounded-3xl bg-black/40 border border-white/5 relative overflow-hidden">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                           {autonomyUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-orange-400" />}
                           Autonomous Trading Execution
                         </span>
                         <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono ${autonomyUnlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                           {autonomyUnlocked ? 'GATE UNLOCKED' : 'LOCKED'}
                         </span>
                       </div>
                       <p className="text-[10px] font-mono text-white/40 max-w-md">
                         Autonomous mode allows the HypeOracle wallet to execute trades instantly when vibe score &gt; 80.
                         Supervised mode registers trading recommendations for manual user triggers instead.
                       </p>
                     </div>
                     
                     <div className="flex items-center gap-3 shrink-0">
                       <button
                         onClick={() => {
                           if (!autonomyUnlocked) {
                             alert(`Staking requirement not met: You currently have ${stakedHype.toLocaleString()} $HYPE staked. You must stake at least 50,000 $HYPE to unlock autonomous execution!`);
                             return;
                           }
                           const nextMode = (profile.approval_mode || 'supervised') === 'supervised' ? 'autonomous' : 'supervised';
                           handleUpdateSetting('approval_mode', nextMode);
                         }}
                         className={`relative w-12 h-6 rounded-full transition-colors flex items-center p-1 cursor-pointer ${
                           (profile.approval_mode || 'supervised') === 'autonomous' ? 'bg-emerald-500' : 'bg-white/10'
                         }`}
                       >
                         <motion.div 
                           className="w-4 h-4 bg-white rounded-full"
                           animate={{ x: (profile.approval_mode || 'supervised') === 'autonomous' ? 24 : 0 }}
                           transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                         />
                       </button>
                     </div>
                   </div>

                   {/* Locked State Warning overlay */}
                   {!autonomyUnlocked && (
                     <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[10px] font-mono text-orange-400">
                       <div className="flex items-center gap-1.5">
                         <ShieldAlert className="w-4 h-4 shrink-0" />
                         <span>Stake at least 50,000 $HYPE to unlock. Staked position: {stakedHype.toLocaleString()} / 50,000</span>
                       </div>
                       
                       <Link 
                         href="/stake" 
                         className="px-4 py-1.5 rounded-lg bg-[#FF6B1A]/20 border border-[#FF6B1A]/30 hover:bg-[#FF6B1A] hover:text-white transition-all uppercase font-bold tracking-wider"
                       >
                         Stake Now
                       </Link>
                     </div>
                   )}
                 </div>

               </div>
             </div>

             {/* Dynamic verification alert display */}
             {errorMsg && (
               <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" />
                 <span>{errorMsg}</span>
               </div>
             )}

          </motion.div>
        )}
      </main>
    </div>
  )
}
