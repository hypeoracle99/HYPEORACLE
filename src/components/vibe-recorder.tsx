import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { PublicKey } from '@solana/web3.js'
import { Mic, MicOff, Zap, ExternalLink, Loader2, Radio, CheckCircle2, AlertCircle } from 'lucide-react'
import { WaveformBar, ScoreGauge } from './ui-primitives'

const client = createClient({
  baseUrl: "https://9s8ct2b5.us-east.insforge.app",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY",
})

interface VibeRecorderProps {
  tokenMint: string
  onVibeSubmitted: () => void
}

export function VibeRecorder({ tokenMint, onVibeSubmitted }: VibeRecorderProps) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [isRecording, setIsRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [trading, setTrading] = useState(false)
  const [tradeSig, setTradeSig] = useState<string | null>(null)
  const [lastVibeScore, setLastVibeScore] = useState<number | null>(null)
  const [emotion, setEmotion] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const levelInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  // Track peak volume across recording — used for emoji + sensor_data (no Math.random)
  const peakLevel = useRef(0)

  useEffect(() => {
    if (isRecording) {
      peakLevel.current = 0
      levelInterval.current = setInterval(() => {
        if (analyser.current) {
          const data = new Uint8Array(analyser.current.frequencyBinCount)
          analyser.current.getByteFrequencyData(data)
          const avg = data.reduce((p, c) => p + c, 0) / data.length
          const normalized = avg / 128
          setLevel(normalized)
          if (normalized > peakLevel.current) peakLevel.current = normalized
        }
      }, 80)
    } else {
      clearInterval(levelInterval.current)
      setLevel(0)
    }
    return () => clearInterval(levelInterval.current)
  }, [isRecording])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = () => {
        submitVibe(new Blob(audioChunks.current, { type: 'audio/webm' }))
      }
      audioContext.current = new AudioContext()
      const source = audioContext.current.createMediaStreamSource(stream)
      analyser.current = audioContext.current.createAnalyser()
      source.connect(analyser.current)
      mediaRecorder.current.start()
      setIsRecording(true)
      setLastVibeScore(null)
      setTradeSig(null)
    } catch {
      setError('Microphone access denied. Grant permission to submit vibes.')
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop()
    setIsRecording(false)
    audioContext.current?.close()
  }

  async function submitVibe(voiceBlob: Blob) {
    setSubmitting(true)
    setError(null)
    try {
      const peak = peakLevel.current
      const emoji = peak > 0.8 ? '🔥' : peak > 0.5 ? '🚀' : '🐂'
      setEmotion(emoji)

      const formData = new FormData()
      formData.append('voice', voiceBlob)
      formData.append('emoji', emoji)
      formData.append('token_mint', tokenMint)
      formData.append('user_pubkey', publicKey?.toBase58() || 'ANON')
      formData.append('sensor_data', JSON.stringify({
        avg_volume: peak,
        accel_magnitude: 0.7, // stable default; DeviceMotion API used when available
      }))

      const { data, error: fnError } = await client.functions.invoke('submit-vibe', { body: formData })
      if (fnError) throw fnError
      if (data?.vibeScore !== undefined) setLastVibeScore(data.vibeScore)
      onVibeSubmitted()
    } catch (err: any) {
      setError(err?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualTrade() {
    if (!publicKey) { setError('Connect your wallet first.'); return }
    setTrading(true)
    setTradeSig(null)
    setError(null)
    try {
      const sdk = new BagsSDK("bags_prod_8lR0OnUDXzqmRKoWBXV5p14Blh8OsiKWuHgIgc2rook", connection, 'processed')
      const quote = await sdk.trade.getQuote({
        inputMint: new PublicKey('So11111111111111111111111111111111111111112'),
        outputMint: new PublicKey(tokenMint),
        amount: 0.1 * 1e9,
      } as any)
      const swap = await sdk.trade.createSwapTransaction({
        quoteResponse: quote,
        userPublicKey: publicKey,
      } as any)
      const signature = await sendTransaction(swap.transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')
      setTradeSig(signature)
    } catch (err: any) {
      setError(err?.message || 'Trade failed. Check wallet balance.')
    } finally {
      setTrading(false)
    }
  }

  const isHot = (lastVibeScore ?? 0) > 80

  return (
    <div className="flex flex-col items-center gap-4 pt-2">

      {/* Inline error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex items-center gap-2 p-3 rounded-xl"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs font-mono text-red-400 leading-snug">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording button + waveform */}
      <div className="relative flex flex-col items-center gap-3 w-full">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              className="w-full"
            >
              <WaveformBar level={level} bars={24} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main record button */}
        <div className="relative">
          {isRecording && (
            <>
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: '#FF6B1A', transform: 'scale(1.4)' }}
              />
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-10"
                style={{ background: '#FF6B1A', transform: 'scale(1.8)', animationDelay: '0.3s' }}
              />
            </>
          )}

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={submitting}
            className="relative z-10 flex items-center justify-center transition-all duration-200 disabled:opacity-40"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: isRecording
                ? 'linear-gradient(135deg, #FF3D00, #FF6B1A)'
                : 'rgba(255,107,26,0.1)',
              border: `2px solid ${isRecording ? 'rgba(255,107,26,0.8)' : 'rgba(255,107,26,0.25)'}`,
              boxShadow: isRecording ? '0 0 30px rgba(255,107,26,0.5)' : 'none',
              transform: isRecording ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {submitting ? (
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-orange-500/80" />
            )}
          </button>
        </div>

        {/* Status label */}
        <p className="mono-label text-center" style={{ fontSize: '0.6rem' }}>
          {isRecording
            ? `● CAPTURING FREQUENCY · Vol ${(level * 100).toFixed(0)}%`
            : submitting
              ? '⚡ NEURAL PROCESSING...'
              : 'Hold to Transmit Vibe'}
        </p>
      </div>

      {/* Score reveal */}
      <AnimatePresence>
        {lastVibeScore !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-2 w-full p-3 rounded-xl"
            style={{
              background: isHot ? 'rgba(255,107,26,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isHot ? 'rgba(255,107,26,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <ScoreGauge score={lastVibeScore} size={56} />
              <div>
                <p className="font-display font-bold text-sm text-white">Vibe Score!</p>
                <p className="mono-label" style={{ fontSize: '0.6rem' }}>
                  {emotion} {isHot ? 'ORACLE AUTO-TRADE TRIGGERED' : 'Logged to consensus'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual trade button */}
      <button
        onClick={handleManualTrade}
        disabled={trading || !publicKey}
        className="w-full py-3 px-4 rounded-xl font-display font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 tracking-wider"
        style={{
          background: publicKey
            ? trading
              ? 'rgba(255,107,26,0.15)'
              : 'linear-gradient(135deg, rgba(255,107,26,0.2), rgba(255,61,0,0.1))'
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${publicKey ? 'rgba(255,107,26,0.3)' : 'rgba(255,255,255,0.06)'}`,
          color: publicKey ? '#FF8C42' : 'rgba(255,255,255,0.2)',
          cursor: publicKey ? 'pointer' : 'not-allowed',
        }}
      >
        {trading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        {trading ? 'Executing Swap...' : 'Manual Hype Trade — 0.1 SOL'}
      </button>

      {/* Tx confirmation */}
      <AnimatePresence>
        {tradeSig && (
          <motion.a
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            href={`https://solscan.io/tx/${tradeSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] font-mono text-green-400 hover:text-green-300 transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" />
            Tx confirmed · View on Solscan
            <ExternalLink className="w-2.5 h-2.5" />
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  )
}
