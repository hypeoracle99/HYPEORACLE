'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { Zap, Wallet, ShieldCheck, Activity, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { ScoreGauge } from './ui-primitives'
import { INSFORGE_CONFIG } from '@/lib/constants'

const client = createClient(INSFORGE_CONFIG)

const CHANNEL = 'oracle_status'

export function OracleStatus() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const subscribedRef = useRef(false)

  async function fetchStatus() {
    try {
      const { data, error } = await client.functions.invoke('get-oracle-status')
      if (error) throw error
      setStatus(data)
    } catch (e) {
      console.error('[OracleStatus] fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Always get fresh data on mount
    fetchStatus()

    async function setupRealtime() {
      if (subscribedRef.current) return
      try {
        await client.realtime.connect()
        await client.realtime.subscribe(CHANNEL)
        subscribedRef.current = true
        setConnected(true)

        // Listen for live balance / status pushes from oracle engine
        client.realtime.on('status_updated', (payload: any) => {
          if (payload) setStatus((prev: any) => ({ ...prev, ...payload }))
        })

        // Generic message wrapper fallback
        client.realtime.on('message', (msg: any) => {
          if (msg?.event === 'status_updated' && msg?.data) {
            setStatus((prev: any) => ({ ...prev, ...msg.data }))
          }
        })

        client.realtime.on('connect', () => setConnected(true))
        client.realtime.on('disconnect', () => {
          setConnected(false)
          // Fallback: re-poll every 30s if WS drops
          const id = setInterval(fetchStatus, 30000)
          client.realtime.on('connect', () => clearInterval(id))
        })
      } catch (err) {
        console.warn('[OracleStatus] Realtime unavailable, polling fallback:', err)
        setConnected(false)
        const id = setInterval(fetchStatus, 30000)
        return () => clearInterval(id)
      }
    }

    setupRealtime()

    return () => {
      if (subscribedRef.current) {
        client.realtime.unsubscribe(CHANNEL)
        subscribedRef.current = false
      }
    }
  }, [])

  const isActive = status?.status === 'active'
  const balancePct = Math.min(100, ((status?.balance || 0) / 1) * 100)

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-card"
        >
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="mono-label">Syncing Consensus Engine...</span>
        </motion.div>
      ) : (
        <motion.div
          key="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl glass-card"
        >
          {/* Top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: isActive
                ? 'linear-gradient(90deg, transparent, rgba(255,107,26,0.6), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)',
            }}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5">
            {/* Left: Status */}
            <div className="flex items-center gap-4">
              <div
                className="relative flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: isActive ? 'rgba(255,107,26,0.12)' : 'rgba(239,68,68,0.1)' }}
              >
                {isActive ? (
                  <>
                    <Zap className="w-5 h-5 text-orange-500" />
                    <div className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-orange-500" />
                  </>
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-sm text-white tracking-wide">
                    HypeOracle Engine
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                    style={{
                      background: isActive ? 'rgba(255,107,26,0.15)' : 'rgba(239,68,68,0.12)',
                      color: isActive ? '#FF8C42' : '#F87171',
                      border: `1px solid ${isActive ? 'rgba(255,107,26,0.3)' : 'rgba(239,68,68,0.25)'}`,
                    }}
                  >
                    {isActive ? '● LIVE' : '● LOW FUEL'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Wallet className="w-3 h-3 text-[var(--text-muted)]" />
                  <span className="mono-label">
                    {status?.address ? `${status.address.slice(0, 6)}...${status.address.slice(-4)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center gap-6">
              {/* Balance */}
              <div className="text-right">
                <p className="mono-label mb-1">Engine Liquidity</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-xl text-white">
                    {(status?.balance || 0).toFixed(3)}
                  </span>
                  <span className="text-xs font-mono text-orange-500">SOL</span>
                </div>
                {/* Balance bar */}
                <div className="mt-1 h-1 w-24 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${balancePct}%`,
                      background: isActive
                        ? 'linear-gradient(90deg, #FF6B1A, #FFD700)'
                        : 'linear-gradient(90deg, #EF4444, #F97316)',
                    }}
                  />
                </div>
              </div>

              <div className="h-10 w-px bg-white/5 hidden sm:block" />

              {/* Safety + Realtime connection dot */}
              <div className="text-right">
                <p className="mono-label mb-1">Safety Caps</p>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                    0.005 MAX · 5m COOL
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connected ? (
                    <Wifi className="w-3 h-3 text-green-500/70" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-orange-500/50" />
                  )}
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: connected ? 'rgba(34,197,94,0.7)' : 'rgba(255,107,26,0.6)' }}
                  >
                    {connected ? 'Live ⚡' : 'Polling'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
