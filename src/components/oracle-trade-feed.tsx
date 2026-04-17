'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { ExternalLink, TrendingUp, ArrowUpRight, Clock, Wifi, WifiOff } from 'lucide-react'

const client = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
})

const CHANNEL = 'oracle_trades'

export function OracleTradeFeed() {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [pulse, setPulse] = useState(false)
  const subscribedRef = useRef(false)

  // Initial fetch — get last 8 trades
  async function fetchTrades() {
    const { data } = await client.database
      .from('oracle_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)
    if (data) setTrades(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTrades()

    // Connect to InsForge Realtime and subscribe to oracle_trades
    async function setupRealtime() {
      if (subscribedRef.current) return
      try {
        await client.realtime.connect()
        await client.realtime.subscribe(CHANNEL)
        subscribedRef.current = true
        setConnected(true)

        // Listen for new_trade events broadcast from submit-vibe edge fn
        client.realtime.on('new_trade', (payload: any) => {
          setTrades((prev) => {
            // Prepend, deduplicate by id/signature, keep max 8
            const next = [payload, ...prev.filter((t) => t.id !== payload.id)].slice(0, 8)
            return next
          })
          // Flash pulse indicator
          setPulse(true)
          setTimeout(() => setPulse(false), 800)
        })

        // Also listen for generic message events (fallback)
        client.realtime.on('message', (msg: any) => {
          if (msg?.event === 'new_trade' && msg?.data) {
            setTrades((prev) =>
              [msg.data, ...prev.filter((t) => t.id !== msg.data.id)].slice(0, 8)
            )
            setPulse(true)
            setTimeout(() => setPulse(false), 800)
          }
        })

        client.realtime.on('disconnect', () => setConnected(false))
        client.realtime.on('connect', () => setConnected(true))
      } catch (err) {
        console.warn('[OracleTradeFeed] Realtime unavailable, falling back to polling:', err)
        setConnected(false)
        // Fallback: poll every 10s if realtime fails
        const id = setInterval(() => {
          fetchTrades()
          setPulse(true)
          setTimeout(() => setPulse(false), 600)
        }, 10000)
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
          <h3 className="mono-label" style={{ fontSize: '0.65rem' }}>
            Oracle Transparency Log
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-[var(--text-muted)]" />
          )}
          <div
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: connected ? '#22c55e' : 'rgba(255,107,26,0.6)',
              boxShadow: pulse ? '0 0 10px rgba(255,107,26,0.9)' : 'none',
            }}
          />
          <span className="mono-label" style={{ fontSize: '0.55rem' }}>
            {connected ? 'LIVE' : 'SYNC'}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto no-scrollbar">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.025)' }}
                />
              ))}
            </div>
          ) : trades.length > 0 ? (
            trades.map((trade, i) => (
              <motion.div
                key={trade.id || trade.signature || i}
                initial={{ opacity: 0, x: -12, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                className="flex items-center justify-between p-2.5 rounded-xl transition-all"
                style={{
                  background: i === 0 && pulse
                    ? 'rgba(255,107,26,0.06)'
                    : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${i === 0 && pulse ? 'rgba(255,107,26,0.2)' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-xs"
                    style={{ background: 'rgba(255,107,26,0.1)' }}
                  >
                    🤖
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-xs text-white">BUY</span>
                      <span className="mono-label" style={{ fontSize: '0.55rem' }}>
                        {trade.token_mint?.slice(0, 4)}...{trade.token_mint?.slice(-4)}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[9px] font-mono"
                        style={{
                          background: 'rgba(255,107,26,0.12)',
                          color: '#FF8C42',
                          border: '1px solid rgba(255,107,26,0.2)',
                        }}
                      >
                        {trade.vibe_score?.toFixed(0) ?? '??'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                      <span className="mono-label" style={{ fontSize: '0.5rem' }}>
                        {new Date(trade.created_at).toLocaleTimeString()} · {trade.amount_sol} SOL
                      </span>
                    </div>
                  </div>
                </div>
                {trade.signature && (
                  <a
                    href={`https://solscan.io/tx/${trade.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:text-orange-400"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.25)',
                    }}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-2"
              style={{
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: '12px',
              }}
            >
              <span className="text-2xl">🌊</span>
              <p className="mono-label text-center leading-relaxed" style={{ fontSize: '0.6rem' }}>
                Awaiting bullish<br />consensus signal...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
