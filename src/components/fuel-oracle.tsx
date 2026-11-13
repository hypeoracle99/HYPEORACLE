'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Fuel, CheckCircle2, AlertCircle, Copy, ExternalLink, Wallet, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { INSFORGE_CONFIG } from '@/lib/constants'

const client = createClient(INSFORGE_CONFIG)

const AMOUNTS = [0.01, 0.05, 0.1, 0.25]

export function FuelOracle() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [oracleAddress, setOracleAddress] = useState<string | null>(null)
  const [engineBalance, setEngineBalance] = useState<number>(0.854)
  const [userSolBalance, setUserSolBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 1. Fetch User's Connected Wallet SOL Balance
  const fetchUserBalance = useCallback(async () => {
    if (!publicKey || !connection) {
      setUserSolBalance(null)
      return
    }
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed')
      setUserSolBalance(parseFloat((lamports / LAMPORTS_PER_SOL).toFixed(4)))
    } catch (err) {
      console.warn('[FuelOracle] Failed to fetch user SOL balance:', err)
    }
  }, [publicKey, connection])

  // 2. Fetch Oracle Engine Reserves (from native API with on-chain & DB fallback)
  const fetchOracleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/oracle/status')
      if (res.ok) {
        const data = await res.json()
        if (data?.address) setOracleAddress(data.address)
        if (typeof data?.balance === 'number') setEngineBalance(data.balance)
        return
      }
    } catch {}

    // Fallback: direct database query
    try {
      const { data } = await client.database
        .from('oracle_fuel')
        .select('oracle_pubkey, current_balance')
        .limit(1)
        .maybeSingle()

      if (data?.oracle_pubkey) {
        setOracleAddress(data.oracle_pubkey)
        if (typeof data.current_balance === 'number') {
          setEngineBalance(data.current_balance)
        }
        // Try on-chain lookup
        if (connection) {
          const lamports = await connection.getBalance(new PublicKey(data.oracle_pubkey), 'confirmed')
          setEngineBalance(parseFloat((lamports / LAMPORTS_PER_SOL).toFixed(4)))
        }
      }
    } catch (err) {
      console.warn('[FuelOracle] Direct fallback error:', err)
      setOracleAddress('5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS')
      setEngineBalance(0.854)
    }
  }, [connection])

  useEffect(() => {
    fetchOracleStatus()
    fetchUserBalance()
  }, [fetchOracleStatus, fetchUserBalance, txSig])

  // Subscribe to live on-chain balance changes for connected wallet
  useEffect(() => {
    if (!publicKey || !connection) return
    const subId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        const sol = parseFloat((accountInfo.lamports / LAMPORTS_PER_SOL).toFixed(4))
        setUserSolBalance(sol)
      },
      'confirmed'
    )
    return () => {
      connection.removeAccountChangeListener(subId)
    }
  }, [publicKey, connection])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchOracleStatus(), fetchUserBalance()])
    setRefreshing(false)
  }

  async function handleFuel(amount: number) {
    if (!publicKey || !oracleAddress) return

    if (userSolBalance !== null && userSolBalance < amount) {
      setError(`Insufficient balance. You need at least ${amount} SOL (Current: ${userSolBalance.toFixed(3)} SOL)`)
      return
    }

    setLoading(true)
    setError(null)
    setTxSig(null)
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(oracleAddress),
          lamports: Math.round(amount * LAMPORTS_PER_SOL),
        })
      )
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxSig(sig)
      await handleRefresh()
    } catch (err: any) {
      setError(err?.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  function copyAddress() {
    if (oracleAddress) {
      navigator.clipboard.writeText(oracleAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const balancePct = Math.min(100, Math.max(5, (engineBalance / 1.5) * 100))
  const fuelLevel = engineBalance < 0.05 ? 'critical' : engineBalance < 0.2 ? 'low' : 'good'
  const fuelColor = fuelLevel === 'critical' ? '#EF4444' : fuelLevel === 'low' ? '#F59E0B' : '#00FF88'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card, #0B0E14)',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
      }}
    >
      {/* Header with status glow */}
      <div className="relative p-4 pb-3">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top right, ${fuelColor}15, transparent 60%)`,
          }}
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: `${fuelColor}15`, border: `1px solid ${fuelColor}30` }}
            >
              <Fuel className="w-4 h-4" style={{ color: fuelColor }} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white tracking-wide">Fuel Oracle</h3>
              <p className="font-mono tracking-wider uppercase text-[10px]" style={{ color: fuelColor }}>
                {fuelLevel === 'critical' ? '⚠ CRITICAL LEVEL' : fuelLevel === 'low' ? '● LOW BALANCE' : '✓ OPERATIONAL'}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
            title="Refresh Balances"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00FF88]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* User Connected Wallet Balance Box */}
        <div
          className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
              <Wallet className="w-3 h-3 text-[#00FF88]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/50">Your Connected Wallet</span>
              <span className="text-[10px] font-mono text-white/80">
                {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : 'Not Connected'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono text-white/40 uppercase">Your Balance</span>
            <span className="text-xs font-mono font-bold text-[#00FF88]">
              {userSolBalance !== null ? `${userSolBalance.toFixed(3)} SOL` : publicKey ? 'Loading...' : '0.000 SOL'}
            </span>
          </div>
        </div>

        {/* Engine Reserves Balance Display */}
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Engine Reserves</span>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-base" style={{ color: fuelColor }}>
                {engineBalance.toFixed(3)}
              </span>
              <span className="text-[10px] font-mono text-white/40">SOL</span>
            </div>
          </div>

          {/* Fuel Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${balancePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${fuelColor}80, ${fuelColor})` }}
            />
          </div>

          {/* Oracle address display */}
          {oracleAddress && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
              <span className="font-mono text-[9px] text-white/40">
                Oracle Node: {oracleAddress.slice(0, 6)}...{oracleAddress.slice(-4)}
              </span>
              <button
                onClick={copyAddress}
                className="flex items-center gap-1 text-[9px] font-mono transition-colors text-white/40 hover:text-[#00FF88]"
              >
                <Copy className="w-2.5 h-2.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Fuel Amount quick buttons */}
        {!txSig && (
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-mono text-white/40">Refuel Autonomous Engine</span>
              <span className="text-[9px] font-mono text-white/30">1-Tap Transfer</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {AMOUNTS.map((amount) => {
                const canAfford = userSolBalance === null || userSolBalance >= amount
                return (
                  <button
                    key={amount}
                    disabled={loading || !publicKey || !canAfford}
                    onClick={() => handleFuel(amount)}
                    className="py-2 rounded-xl text-[10px] font-display font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      background: canAfford ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${canAfford ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      color: canAfford ? '#00FF88' : 'rgba(255,255,255,0.3)',
                    }}
                    onMouseEnter={(e) => {
                      if (canAfford) {
                        e.currentTarget.style.background = 'rgba(0,255,136,0.2)'
                        e.currentTarget.style.borderColor = 'rgba(0,255,136,0.5)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canAfford) {
                        e.currentTarget.style.background = 'rgba(0,255,136,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(0,255,136,0.25)'
                      }
                    }}
                  >
                    +{amount}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!publicKey && !txSig && (
          <p className="text-center font-mono text-[10px] text-white/40 pt-1">
            Connect wallet to fuel the engine & view balance
          </p>
        )}

        {/* Status Feedbacks */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-2"
            >
              <div className="w-3 h-3 rounded-full border-2 border-[#00FF88] border-t-transparent animate-spin" />
              <span className="font-mono text-[11px] text-[#00FF88]">
                Fueling Oracle Engine...
              </span>
            </motion.div>
          )}

          {txSig && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-xl space-y-2 bg-[#00FF88]/[0.08] border border-[#00FF88]/30"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF88] shrink-0" />
                <p className="text-xs font-display font-bold text-[#00FF88]">Oracle Fueled! ⚡</p>
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-white/70 hover:text-[#00FF88] transition-colors"
              >
                View on Solscan <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={() => setTxSig(null)}
                className="text-[10px] font-mono text-[#00FF88] hover:underline transition-colors block"
              >
                Fuel again →
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 rounded-xl flex items-start gap-2 bg-red-500/[0.08] border border-red-500/20"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-red-400 leading-relaxed">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
