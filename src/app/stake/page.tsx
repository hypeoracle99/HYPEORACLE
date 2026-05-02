'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Shield, Coins, TrendingUp, 
  Activity, ArrowRight, Wallet, 
  Info, AlertTriangle, CheckCircle2 
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { createClient } from '@insforge/sdk'
import { INSFORGE_CONFIG } from '@/lib/constants'
import { OFFICIAL_TOKEN } from '@/lib/token-config'
import Link from 'next/link'
import { ChevronLeft, LogOut } from 'lucide-react'
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token'
import { Transaction, PublicKey } from '@solana/web3.js'
import { GET_CONNECTION } from '@/lib/constants'

const client = createClient(INSFORGE_CONFIG)

export default function StakePage() {
  const { publicKey, connected, sendTransaction } = useWallet()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [fuel, setFuel] = useState<any>(null)
  const [userStake, setUserStake] = useState<any>(null)
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [stakingStatus, setStakingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [unstakingStatus, setUnstakingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [mounted, setMounted] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [claiming, setClaiming] = useState(false)

  const [liveFuelSol, setLiveFuelSol] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [publicKey])

  async function fetchData() {
    try {
      const [statsRes, fuelRes, userRes, leaderboardRes] = await Promise.all([
        client.database.from('hype_token_stats').select('*').limit(1),
        client.database.from('oracle_fuel').select('*').limit(1),
        publicKey ? client.database.from('user_staking').select('*').eq('user_pubkey', publicKey.toBase58()).limit(1) : Promise.resolve({ data: [] }),
        client.database.from('user_staking').select('user_pubkey, staked_amount').order('staked_amount', { ascending: false }).limit(5)
      ])

      if (statsRes.data && statsRes.data[0]) setStats(statsRes.data[0])
      if (fuelRes.data && fuelRes.data[0]) {
        const fuelRow = fuelRes.data[0]
        setFuel(fuelRow)

        // Fetch live on-chain balance for the oracle wallet
        if (fuelRow.oracle_pubkey) {
          try {
            const { Connection, PublicKey: PK, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
            const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
            const lamports = await conn.getBalance(new PK(fuelRow.oracle_pubkey))
            setLiveFuelSol(lamports / LAMPORTS_PER_SOL)
          } catch (rpcErr) {
            console.warn('RPC balance fetch failed, using DB value:', rpcErr)
            setLiveFuelSol(Number(fuelRow.current_balance))
          }
        }
      }
      if (userRes.data && userRes.data[0]) {
        setUserStake(userRes.data[0])
      } else if (publicKey) {
        setUserStake({ user_pubkey: publicKey.toBase58(), staked_amount: 0, unclaimed_rewards: 0 })
      }
      if (leaderboardRes.data) setLeaderboard(leaderboardRes.data)
    } catch (err) {
      console.error('Fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim() {
    if (!publicKey) return
    setClaiming(true)
    try {
      const res = await fetch(`https://9s8ct2b5.functions.insforge.app/claim-staking-rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_pubkey: publicKey.toBase58() })
      })
      const result = await res.json()
      if (result.success) {
        alert('Rewards claimed successfully!')
        fetchData()
      }
    } catch (err) {
      console.error('Claim failed:', err)
    } finally {
      setClaiming(false)
    }
  }

  async function handleStake() {
    if (!publicKey || !stakeAmount || !fuel?.oracle_pubkey) {
      if (!fuel?.oracle_pubkey) alert("Oracle Vault Address not found. Please refresh.");
      return;
    }
    setStakingStatus('loading')
    try {
      const connection = GET_CONNECTION();
      const mintPubKey = new PublicKey(OFFICIAL_TOKEN.mint);
      const vaultPubKey = new PublicKey(fuel.oracle_pubkey);
      const amount = parseFloat(stakeAmount) * 1e9; // Assuming 9 decimals for HYPE
      
      const userAta = await getAssociatedTokenAddress(mintPubKey, publicKey);
      const vaultAta = await getAssociatedTokenAddress(mintPubKey, vaultPubKey);
      
      const transaction = new Transaction();
      
      // Ensure vault ATA exists (though it should for the Oracle)
      // For speed in MVP, we assume it exists or the user can fuel it.
      
      transaction.add(
        createTransferInstruction(
          userAta,
          vaultAta,
          publicKey,
          amount
        )
      );
      
      const signature = await sendTransaction(transaction, connection);
      console.log("Stake TX sent:", signature);
      
      const res = await fetch(`https://9s8ct2b5.functions.insforge.app/stake-hype`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: publicKey.toBase58(),
          amount_hype: parseFloat(stakeAmount),
          signature: signature // Send the real tx signature for verification
        })
      })
      const result = await res.json()
      if (result.success) {
        setStakingStatus('success')
        setStakeAmount('')
        fetchData()
        setTimeout(() => setStakingStatus('idle'), 3000)
      } else {
        setStakingStatus('error')
      }
    } catch (err: any) {
      console.error("Stake failed:", err);
      alert(`Transaction failed: ${err.message || err.name}`);
      setStakingStatus('error')
    }
  }

  async function handleUnstake() {
    if (!publicKey || !unstakeAmount) return
    setUnstakingStatus('loading')
    try {
      // Unstaking is handled by the backend because it needs the Vault's Private Key
      const res = await fetch(`https://9s8ct2b5.functions.insforge.app/unstake-hype`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: publicKey.toBase58(),
          amount_hype: parseFloat(unstakeAmount)
        })
      })
      const result = await res.json()
      if (result.success) {
        setUnstakingStatus('success')
        setUnstakeAmount('')
        fetchData()
        setTimeout(() => setUnstakingStatus('idle'), 3000)
      } else {
        alert(result.error || "Unstake failed");
        setUnstakingStatus('error')
      }
    } catch (err) {
      setUnstakingStatus('error')
    }
  }

  const currentFuelVal = liveFuelSol !== null ? liveFuelSol : fuel ? Number(fuel.current_balance) : 0
  const isLowFuel = fuel ? currentFuelVal < 0.2 : false
  const refillNeeded = fuel ? currentFuelVal < 0.5 : false

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FF6B1A]/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight mb-2">
              ${OFFICIAL_TOKEN.symbol} <span className="text-[#FF6B1A]">STAKING</span>
            </h1>
            <p className="text-[var(--text-muted)] font-mono text-sm max-w-xl">
              Stake ${OFFICIAL_TOKEN.symbol} to boost your Oracle influence, increase your personal vibe multiplier, 
              and fuel the automated trading engine.
            </p>
          </div>
          {mounted ? (
            <WalletMultiButton className="!bg-[#FF6B1A] !hover:bg-[#FF8C42] !rounded-2xl !h-12 !font-display !font-bold transition-all active:scale-[0.98]" />
          ) : (
            <div className="h-12 w-[150px] bg-white/5 rounded-2xl animate-pulse" />
          )}
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard 
            label={`Total $${OFFICIAL_TOKEN.symbol} Staked`} 
            value={stats ? `${(Number(stats.total_staked) / 1000).toFixed(1)}k` : null} 
            icon={<Coins className="w-4 h-4 text-[#FF6B1A]" />}
            status="Secured"
            loading={loading && !stats}
          />
          <StatCard 
            label="Staker Pool Share" 
            value="40.0%" 
            icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            subValue="Platform Fees"
            loading={loading}
          />
          <StatCard 
            label="Current APY" 
            value="12.5%" 
            icon={<Zap className="w-4 h-4 text-yellow-500" />}
            subValue="Estimated"
            loading={loading}
          />
          <StatCard 
            label="Oracle Fuel" 
            value={fuel ? `${currentFuelVal.toFixed(2)} SOL` : null} 
            icon={<Activity className="w-4 h-4 text-blue-500" />}
            status={isLowFuel ? 'LOW' : 'SAFE'}
            loading={loading && !fuel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Main Staking Panel */}
          <div className="space-y-6">
            <motion.div 
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/10 flex items-center justify-center text-[#FF6B1A]">
                  <Coins className="w-6 h-6" />
                </div>
                <h2 className="font-display font-bold text-2xl">Manage Stake</h2>
              </div>

              {!connected ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)] font-mono">
                  <Wallet className="w-12 h-12 mb-4 opacity-20" />
                  <p>Connect wallet to manage your ${OFFICIAL_TOKEN.symbol} position</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Stake Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="mono-label !text-[0.65rem] mb-1">Your Stake</p>
                      <p className="text-2xl font-display font-bold">
                        {userStake ? Number(userStake.staked_amount).toLocaleString() : '0'} <span className="text-xs text-[var(--text-muted)]">{OFFICIAL_TOKEN.symbol}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="mono-label !text-[0.65rem] mb-1">Vibe Multiplier</p>
                      <p className="text-2xl font-display font-bold text-[#FF6B1A]">
                        {userStake ? (1 + Math.min(0.5, userStake.staked_amount / 1_000_000)).toFixed(2) : '1.00'}x
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#FF6B1A]/5 border border-[#FF6B1A]/20 sm:col-span-2 flex items-center justify-between">
                      <div>
                        <p className="mono-label !text-[0.65rem] mb-1">Unclaimed Rewards</p>
                        <p className="text-2xl font-display font-bold text-white">
                          {userStake ? Number(userStake.unclaimed_rewards).toFixed(5) : '0.00000'} <span className="text-xs text-[var(--text-muted)]">SOL</span>
                        </p>
                      </div>
                      <button 
                        onClick={handleClaim}
                        disabled={claiming || !userStake || Number(userStake.unclaimed_rewards) <= 0}
                        className="px-6 py-2 rounded-xl bg-[#FF6B1A] text-white font-display font-bold text-xs hover:bg-[#FF8C42] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                      >
                        {claiming ? 'CLAIMING...' : 'CLAIM NOW'}
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/40">
                        <Coins className="w-5 h-5" />
                      </div>
                      <input 
                        type="number"
                        placeholder="Amount to stake..."
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="w-full bg-[#080808] border border-white/[0.08] rounded-2xl h-16 pl-14 pr-5 focus:outline-none focus:border-[#FF6B1A]/50 focus:ring-1 focus:ring-[#FF6B1A]/50 transition-all font-mono text-lg"
                      />
                    </div>

                    <button 
                      onClick={handleStake}
                      disabled={stakingStatus === 'loading' || !stakeAmount}
                      className="w-full h-16 rounded-2xl font-display font-black text-lg tracking-wide uppercase transition-all flex items-center justify-center gap-2 group relative overflow-hidden active:scale-[0.98] active:brightness-90 shadow-[0_8px_30px_rgba(255,107,26,0.3)]"
                      style={{
                        background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                      }}
                    >
                      {stakingStatus === 'loading' ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                          <span>STAKE ${OFFICIAL_TOKEN.symbol}</span>
                        </>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {stakingStatus === 'success' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 justify-center text-green-400 font-mono text-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Stake successful! Vibe power increased.
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Unstake Separator */}
                    <div className="pt-4 border-t border-white/5 opacity-50 flex items-center gap-4">
                       <div className="h-px bg-white/10 flex-1" />
                       <span className="text-[10px] font-mono whitespace-nowrap">MANAGED WITHDRAWAL</span>
                       <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="flex gap-4">
                      <div className="relative flex-1 group">
                        <input 
                          type="number"
                          placeholder="Unstake amount..."
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                          className="w-full bg-[#080808] border border-white/[0.08] rounded-2xl h-12 pl-4 pr-4 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-mono text-sm"
                        />
                      </div>
                      <button 
                        onClick={handleUnstake}
                        disabled={unstakingStatus === 'loading' || !unstakeAmount}
                        className="px-8 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all font-display font-bold text-xs uppercase disabled:opacity-30 disabled:grayscale"
                      >
                        {unstakingStatus === 'loading' ? '...' : 'Unstake'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Leaderboard Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-8"
            >
              <div className="flex items-center justify-between mb-8">
                 <h2 className="font-display font-bold text-xl flex items-center gap-3 !font-sans tracking-tight">
                   <TrendingUp className="w-6 h-6 text-[#FF6B1A]" />
                   Top Oracle Guardians
                 </h2>
                 <span className="text-[10px] font-mono text-[var(--text-muted)] px-3 py-1 rounded-full border border-white/5 bg-white/5">
                   LIVE LEADERS
                 </span>
              </div>

              <div className="space-y-3">
                {leaderboard.length > 0 ? leaderboard.map((staker, idx) => (
                  <div key={staker.user_pubkey} className="p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-xs ${idx === 0 ? 'bg-[#FF6B1A] text-white' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-mono text-white/90">{staker.user_pubkey.slice(0, 4)}...{staker.user_pubkey.slice(-4)}</p>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                          {idx === 0 ? 'Legendary Guardian' : idx < 3 ? 'Elite Protector' : 'Vibe Sentinel'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-sm">{(Number(staker.staked_amount) / 1000).toFixed(1)}k <span className="text-[10px] text-[var(--text-muted)] font-normal uppercase">{OFFICIAL_TOKEN.symbol}</span></p>
                      <p className={`text-[10px] font-mono ${(staker.staked_amount / 1_000_000) >= 0.5 ? 'text-green-500' : 'text-[#FF6B1A]'}`}>
                        +{((Math.min(0.5, staker.staked_amount / 1_000_000)) * 100).toFixed(0)}% Boost
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-[var(--text-muted)] font-mono text-xs opacity-50">
                    Leaderboard is calculating...
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar: Engine Fuel */}
          <div className="space-y-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-lg">Engine Fuel</h3>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isLowFuel ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                  {isLowFuel ? 'CRITICAL' : 'SAFE'}
                </div>
              </div>

              {/* Fuel Gauge Visual */}
              <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden mb-6">
                <motion.div 
                  className={`h-full rounded-full ${isLowFuel ? 'bg-red-500' : 'bg-[#FF6B1A]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: fuel ? `${Math.min(100, (currentFuelVal / 0.8) * 100)}%` : '0%' }}
                />
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm font-mono">
                  <span className="text-[var(--text-muted)]">Target Level:</span>
                  <span>0.50 SOL</span>
                </div>
                <div className="flex justify-between items-center text-sm font-mono font-bold">
                  <span className="text-[var(--text-muted)]">Current Level:</span>
                  <span className={isLowFuel ? 'text-red-500' : 'text-white'}>
                    {fuel ? currentFuelVal.toFixed(4) : '0.0000'} SOL
                  </span>
                </div>
              </div>

              {isLowFuel && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex gap-3 text-red-500 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Oracle Engine is low on fuel. Auto-buys are disabled until global pool reaches 0.2 SOL.</p>
                </div>
              )}

              <button 
                className="w-full py-4 rounded-2xl border border-white/10 font-display font-bold text-sm hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2 group active:scale-[0.96] active:bg-white/[0.05]"
                onClick={() => {
                  const addr = fuel?.oracle_pubkey || 'BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP'
                  navigator.clipboard.writeText(addr)
                  alert(`Oracle Wallet Address copied: ${addr}`)
                }}
              >
                <Wallet className="w-4 h-4 group-hover:text-[#FF6B1A] transition-colors" />
                FUEL THE ORACLE
              </button>
            </div>

            <div className="bg-gradient-to-br from-[#FF6B1A]/5 to-[#FF8C42]/5 border border-[#FF6B1A]/20 rounded-[32px] p-6">
               <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                 <Info className="w-4 h-4 text-[#FF6B1A]" />
                 Fee Distribution
               </h4>
               <ul className="space-y-2 text-xs font-mono text-[var(--text-muted)]">
                 <li className="flex justify-between"><span>Oracle Engine Refill</span> <span className="text-white">40%</span></li>
                 <li className="flex justify-between"><span>${OFFICIAL_TOKEN.symbol} Stakers Rewards</span> <span className="text-white">40%</span></li>
                 <li className="flex justify-between"><span>Treasury & Growth</span> <span className="text-white">20%</span></li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, subValue, status, loading }: any) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <span className="mono-label !text-[0.6rem]">{label}</span>
        {icon}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-3 w-16 bg-white/5 rounded-lg animate-pulse" />
        </div>
      ) : (
        <>
          <div className="font-display font-bold text-xl truncate">
            {value || '--'}
          </div>
          {(subValue || status) && (
            <div className="mt-2 text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
              {status && <div className={`w-1.5 h-1.5 rounded-full ${status === 'LOW' ? 'bg-red-500' : 'bg-green-500'}`} />}
              {status || subValue}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function UtilityCard({ title, desc, icon }: any) {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#FF6B1A]/20 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60 mb-4 group-hover:text-[#FF6B1A] group-hover:bg-[#FF6B1A]/10 transition-all">
        {icon}
      </div>
      <h3 className="font-display font-bold mb-2">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
    </div>
  )
}
