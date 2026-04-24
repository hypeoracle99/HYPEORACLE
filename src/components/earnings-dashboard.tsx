'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import {
  Coins, TrendingUp, Clock, CheckCircle2, Zap,
  ExternalLink, ArrowUpRight, Sparkles, ChevronLeft, BrainCircuit
} from 'lucide-react'
import { AmbientBackground } from './ui-primitives'
import { INSFORGE_CONFIG } from '@/lib/constants'

const client = createClient(INSFORGE_CONFIG)

const CHANNEL = 'fee_claims'

interface Claim {
  id: string
  token_mint: string
  bps: number
  claimed: boolean
  claimed_at?: string
  created_at: string
}

function StatCard({
  label, value, sub, icon: Icon, hot,
}: {
  label: string
  value: string
  sub?: string
  icon: any
  hot?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-5 rounded-2xl overflow-hidden"
      style={{
        background: hot
          ? 'linear-gradient(135deg, rgba(255,107,26,0.08), rgba(255,61,0,0.04))'
          : 'var(--bg-card)',
        border: `1px solid ${hot ? 'rgba(255,107,26,0.25)' : 'var(--border-subtle)'}`,
      }}
    >
      {hot && (
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,26,0.7), transparent)' }}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="mono-label mb-2" style={{ fontSize: '0.55rem' }}>{label}</p>
          <p className="font-display font-bold text-2xl text-white">{value}</p>
          {sub && <p className="mono-label mt-1" style={{ fontSize: '0.55rem' }}>{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: hot ? 'rgba(255,107,26,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          <Icon className={`w-4 h-4 ${hot ? 'text-orange-500' : 'text-[var(--text-muted)]'}`} />
        </div>
      </div>
    </motion.div>
  )
}

function ClaimRow({ claim, index }: { claim: Claim; index: number }) {
  const TRADE_SOL = 0.005
  const earnedSol = ((claim.bps / 10000) * TRADE_SOL).toFixed(6)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center justify-between p-3 rounded-xl transition-all"
      style={{
        background: claim.claimed
          ? 'rgba(34,197,94,0.04)'
          : 'rgba(255,107,26,0.04)',
        border: `1px solid ${claim.claimed ? 'rgba(34,197,94,0.12)' : 'rgba(255,107,26,0.12)'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
          style={{
            background: claim.claimed ? 'rgba(34,197,94,0.1)' : 'rgba(255,107,26,0.1)',
          }}
        >
          {claim.claimed ? '✅' : '⏳'}
        </div>
        <div>
          <p className="font-mono text-xs text-white">
            {claim.token_mint?.slice(0, 6)}...{claim.token_mint?.slice(-4)}
          </p>
          <p className="mono-label mt-0.5" style={{ fontSize: '0.5rem' }}>
            {new Date(claim.created_at).toLocaleString()} · {claim.bps} bps
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className="font-mono text-xs font-bold"
          style={{ color: claim.claimed ? '#22c55e' : '#FF8C42' }}
        >
          +{earnedSol} SOL
        </p>
        <p className="mono-label mt-0.5" style={{ fontSize: '0.5rem' }}>
          {claim.claimed ? 'Claimed' : 'Pending'}
        </p>
      </div>
    </motion.div>
  )
}

export function EarningsDashboard() {
  const { publicKey } = useWallet()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<any>(null)
  const subscribedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const unclaimed = claims.filter((c) => !c.claimed)
  const claimedList = claims.filter((c) => c.claimed)

  const TRADE_SOL = 0.005
  const pendingSol = unclaimed.reduce((sum, c) => sum + (c.bps / 10000) * TRADE_SOL, 0)
  const totalEarned = claims.reduce((sum, c) => sum + (c.bps / 10000) * TRADE_SOL, 0)

  async function fetchClaims(pubkey: string) {
    setLoading(true)
    const { data } = await client.database
      .from('fee_share_claims')
      .select('*')
      .eq('contributor_pubkey', pubkey)
      .order('created_at', { ascending: false })
    if (data) setClaims(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!publicKey) return
    const key = publicKey.toBase58()
    fetchClaims(key)

    // Realtime: update list when fees get claimed
    async function setupRealtime() {
      if (subscribedRef.current) return
      try {
        await client.realtime.connect()
        await client.realtime.subscribe(CHANNEL)
        subscribedRef.current = true

        client.realtime.on('fees_claimed', (payload: any) => {
          if (payload?.contributor_pubkey === key) fetchClaims(key)
        })
        client.realtime.on('message', (msg: any) => {
          if (msg?.event === 'fees_claimed' && msg?.data?.contributor_pubkey === key) {
            fetchClaims(key)
          }
        })
      } catch {
        // no-op: realtime optional for this page
      }
    }
    setupRealtime()

    return () => {
      if (subscribedRef.current) {
        client.realtime.unsubscribe(CHANNEL)
        subscribedRef.current = false
      }
    }
  }, [publicKey])

  async function handleClaim() {
    if (!publicKey || unclaimed.length === 0) return
    setClaiming(true)
    setClaimResult(null)
    try {
      const { data, error } = await client.functions.invoke('claim-fees', {
        body: { user_pubkey: publicKey.toBase58() },
      })
      if (error) throw error
      setClaimResult(data)
      if (data?.success) fetchClaims(publicKey.toBase58())
    } catch (e: any) {
      setClaimResult({ success: false, error: e.message })
    } finally {
      setClaiming(false)
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
          <div className="text-5xl">💰</div>
          <div>
            <h2 className="font-display font-bold text-xl text-white mb-2">My Hype Earnings</h2>
            <p className="mono-label text-sm">Connect your wallet to view your oracle fee earnings.</p>
          </div>
          <div className="flex justify-center">
            {mounted ? <WalletMultiButton /> : <div className="h-[48px] w-[150px] rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex justify-between items-center mb-8">
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF3D00)' }}
            >
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">My Hype Earnings</h1>
              <p className="mono-label" style={{ fontSize: '0.6rem' }}>
                {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-6)}
              </p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fee share from oracle trades you triggered by submitting vibes.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <StatCard
            label="Total Earned"
            value={`${totalEarned.toFixed(5)} SOL`}
            sub={`${claims.length} vibes`}
            icon={TrendingUp}
            hot
          />
          <StatCard
            label="Pending Claim"
            value={`${pendingSol.toFixed(5)} SOL`}
            sub={`${unclaimed.length} unclaimed`}
            icon={Clock}
          />
          <StatCard
            label="Total Claimed"
            value={`${(totalEarned - pendingSol).toFixed(5)} SOL`}
            sub={`${claimedList.length} claims`}
            icon={CheckCircle2}
          />
        </div>

        {/* Claim button */}
        <AnimatePresence>
          {unclaimed.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6"
            >
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-4 rounded-2xl font-display font-bold text-sm text-white transition-all relative overflow-hidden"
                style={{
                  background: claiming
                    ? 'rgba(255,107,26,0.3)'
                    : 'linear-gradient(135deg, #FF6B1A, #FF3D00)',
                  border: '1px solid rgba(255,107,26,0.4)',
                  cursor: claiming ? 'not-allowed' : 'pointer',
                }}
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing Claim...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Claim {pendingSol.toFixed(5)} SOL ({unclaimed.length} earnings)
                    <Zap className="w-4 h-4" />
                  </span>
                )}
              </button>

              {/* Claim result */}
              {claimResult && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl flex items-center justify-between"
                  style={{
                    background: claimResult.success
                      ? 'rgba(34,197,94,0.08)'
                      : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${claimResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <p
                    className="text-xs font-mono"
                    style={{ color: claimResult.success ? '#22c55e' : '#f87171' }}
                  >
                    {claimResult.message || claimResult.error}
                  </p>
                  {claimResult.signature && (
                    <a
                      href={`https://solscan.io/tx/${claimResult.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Solscan <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Claims list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="mono-label" style={{ fontSize: '0.65rem' }}>Earnings History</h3>
            <span className="mono-label" style={{ fontSize: '0.55rem' }}>{claims.length} total</span>
          </div>

          <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  />
                ))}
              </div>
            ) : claims.length > 0 ? (
              <AnimatePresence>
                {claims.map((claim, i) => (
                  <ClaimRow key={claim.id} claim={claim} index={i} />
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-4xl">🌊</span>
                <p className="font-display font-bold text-sm text-white">No Earnings Yet</p>
                <p className="mono-label" style={{ fontSize: '0.6rem' }}>
                  Submit vibes that push a token above 80 to earn fee share from oracle trades.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
