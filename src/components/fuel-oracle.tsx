'use client'

import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Fuel, CheckCircle2, AlertCircle, Copy, ExternalLink, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'

const client = createClient({
  baseUrl: "https://9s8ct2b5.us-east.insforge.app",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY",
})

const AMOUNTS = [0.01, 0.05, 0.1, 0.25]

export function FuelOracle() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [oracleAddress, setOracleAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    client.functions.invoke('get-oracle-status')
      .then(({ data }) => {
        if (data) {
          setOracleAddress(data.address)
          setBalance(data.balance ?? 0)
        }
      })
      .catch(console.error)
  }, [txSig])

  async function handleFuel(amount: number) {
    if (!publicKey || !oracleAddress) return
    setLoading(true)
    setError(null)
    setTxSig(null)
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(oracleAddress),
          lamports: amount * LAMPORTS_PER_SOL,
        })
      )
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxSig(sig)
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
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

  const balancePct = Math.min(100, (balance / 1) * 100)
  const fuelLevel = balancePct < 20 ? 'critical' : balancePct < 50 ? 'low' : 'good'
  const fuelColor = fuelLevel === 'critical' ? '#EF4444' : fuelLevel === 'low' ? '#FFAA00' : '#22C55E'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header with glow */}
      <div className="relative p-4 pb-3">
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at top right, ${fuelColor}15, transparent 60%)`,
          }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: `${fuelColor}15`, border: `1px solid ${fuelColor}30` }}
          >
            <Fuel className="w-4 h-4" style={{ color: fuelColor }} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white tracking-wide">Fuel Oracle</h3>
            <p className="mono-label" style={{ fontSize: '0.55rem', color: fuelColor }}>
              {fuelLevel === 'critical' ? '⚠ CRITICAL LEVEL' : fuelLevel === 'low' ? '● LOW BALANCE' : '✓ OPERATIONAL'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Balance display */}
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="mono-label" style={{ fontSize: '0.55rem' }}>Engine Reserves</span>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-base" style={{ color: fuelColor }}>
                {balance.toFixed(3)}
              </span>
              <span className="mono-label" style={{ fontSize: '0.55rem' }}>SOL</span>
            </div>
          </div>
          {/* Fuel bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${balancePct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${fuelColor}80, ${fuelColor})` }}
            />
          </div>
          {/* Oracle address */}
          {oracleAddress && (
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {oracleAddress.slice(0, 8)}...{oracleAddress.slice(-6)}
              </span>
              <button
                onClick={copyAddress}
                className="flex items-center gap-1 text-[9px] font-mono transition-colors hover:text-orange-400"
                style={{ color: copied ? '#22C55E' : 'rgba(255,255,255,0.3)' }}
              >
                <Copy className="w-2.5 h-2.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Amount buttons */}
        {!txSig && (
          <div className="grid grid-cols-4 gap-1.5">
            {AMOUNTS.map((amount) => (
              <button
                key={amount}
                disabled={loading || !publicKey}
                onClick={() => handleFuel(amount)}
                className="py-2 rounded-xl text-[10px] font-display font-bold transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: 'rgba(255,107,26,0.08)',
                  border: '1px solid rgba(255,107,26,0.2)',
                  color: '#FF8C42',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,107,26,0.2)'
                  e.currentTarget.style.borderColor = 'rgba(255,107,26,0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,107,26,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,107,26,0.2)'
                }}
              >
                {amount}
              </button>
            ))}
          </div>
        )}

        {!publicKey && !txSig && (
          <p className="text-center mono-label" style={{ fontSize: '0.55rem' }}>
            Connect wallet to fuel the engine
          </p>
        )}

        {/* States */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-2"
            >
              <div className="w-3 h-3 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <span className="mono-label" style={{ fontSize: '0.6rem', color: '#FF8C42' }}>
                Fueling Oracle...
              </span>
            </motion.div>
          )}

          {txSig && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-xl space-y-2"
              style={{
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-xs font-display font-bold text-green-400">Oracle Fueled! ⚡</p>
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] font-mono text-green-600 hover:text-green-400 transition-colors"
              >
                View on Solscan <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={() => setTxSig(null)}
                className="text-[9px] font-mono text-green-700 hover:text-green-500 transition-colors"
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
              className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[9px] font-mono text-red-400 leading-relaxed">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
