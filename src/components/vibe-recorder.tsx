'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@insforge/sdk'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { PublicKey } from '@solana/web3.js'
import { Mic, MicOff, Zap, ExternalLink, Loader2, Radio, CheckCircle2, AlertCircle, Sparkles, Activity, ShieldAlert } from 'lucide-react'
import { ScoreGauge } from './ui-primitives'
import { 
  BAGS_API_KEY, 
  INSFORGE_CONFIG, 
  GET_CONNECTION 
} from '@/lib/constants'

const client = createClient(INSFORGE_CONFIG)

interface VibeRecorderProps {
  tokenMint: string
  onVibeSubmitted: () => void
}

export function VibeRecorder({ tokenMint, onVibeSubmitted }: VibeRecorderProps) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  
  // App States
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [trading, setTrading] = useState(false)
  const [tradeSig, setTradeSig] = useState<string | null>(null)
  const [lastVibeScore, setLastVibeScore] = useState<number | null>(null)
  const [emotion, setEmotion] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  
  // Live indicator states for HUD display
  const [vibeImpact, setVibeImpact] = useState<number>(0)
  const [vocalEnergy, setVocalEnergy] = useState<number>(0)
  const [sensorStatus, setSensorStatus] = useState<'calibrating' | 'live' | 'mock'>('mock')

  // Refs for media recording
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  
  // Refs for Web Audio API
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null)
  
  // High-performance canvas and animation refs
  const audioCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameId = useRef<number | null>(null)
  
  // Sensor Tracking Refs (keeps render footprint zero during active sampling)
  const motionHistory = useRef<number[]>(Array(80).fill(0))
  const lastMotionVal = useRef<number>(0)
  const hasSensorPermission = useRef<boolean>(false)
  
  // Aggregation refs for final payload
  const totalVolume = useRef<number>(0)
  const totalMotion = useRef<number>(0)
  const sampleCount = useRef<number>(0)
  const maxVolume = useRef<number>(0)
  const maxMotion = useRef<number>(0)
  
  const countdownInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Request accelerometer permissions (user-triggered iOS constraint)
  const requestSensorPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission()
        if (permissionState === 'granted') {
          hasSensorPermission.current = true
          setSensorStatus('live')
          window.addEventListener('devicemotion', handleDeviceMotion)
        } else {
          setSensorStatus('mock')
        }
      } catch (err) {
        console.warn('[PWA Sensors] Accelerometer permission rejected:', err)
        setSensorStatus('mock')
      }
    } else if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      // Android / non-iOS standard browsers
      hasSensorPermission.current = true
      setSensorStatus('live')
      window.addEventListener('devicemotion', handleDeviceMotion)
    } else {
      setSensorStatus('mock')
    }
  }

  // Device Motion Handler
  const handleDeviceMotion = (event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity
    if (accel) {
      const x = accel.x || 0
      const y = accel.y || 0
      const z = accel.z || 0
      
      // Calculate shake magnitude
      const mag = Math.sqrt(x * x + y * y + z * z)
      
      // Filter out base gravity constant (~9.8 m/s²) and scale
      const netMag = Math.max(0, mag - 9.8)
      lastMotionVal.current = netMag
      
      if (netMag > maxMotion.current) {
        maxMotion.current = netMag
      }
    }
  }

  // Double cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams()
    }
  }, [])

  const stopAllStreams = () => {
    // Stop recording timer
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
    }
    
    // Stop and release service event listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleDeviceMotion)
    }
    
    // Cancel rendering animations
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
    
    // Release active audio contexts
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close()
    }
    
    if (sourceNode.current) {
      sourceNode.current.disconnect()
    }
  }

  // Unified start handler
  async function startRecording() {
    if (isRecording || submitting) return
    setError(null)
    setTradeSig(null)
    setLastVibeScore(null)
    
    // Reset sensory aggregates
    totalVolume.current = 0
    totalMotion.current = 0
    sampleCount.current = 0
    maxVolume.current = 0
    maxMotion.current = 0
    motionHistory.current = Array(80).fill(0)
    lastMotionVal.current = 0
    
    try {
      // 1. Initialize sensors
      await requestSensorPermission()
      
      // 2. Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 3. Initialize Audio Analyser inside interaction context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      audioContext.current = new AudioCtx()
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 256
      
      sourceNode.current = audioContext.current.createMediaStreamSource(stream)
      sourceNode.current.connect(analyser.current)
      
      // 4. Initialize Media Recorder
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.current.push(e.data)
        }
      }
      
      mediaRecorder.current.onstop = () => {
        const mimeType = mediaRecorder.current?.mimeType || 'audio/webm'
        const blob = new Blob(audioChunks.current, { type: mimeType })
        
        // Stop raw stream tracks to release microphone light
        stream.getTracks().forEach(t => t.stop())
        submitVibe(blob)
      }
      
      mediaRecorder.current.start()
      setIsRecording(true)
      
      // Start visualization and sampling loop
      startSensorVisualizers()
      
      // Standard 5-second capture interval
      let secs = 5
      setCountdown(secs)
      countdownInterval.current = setInterval(() => {
        secs -= 1
        if (secs <= 0) {
          clearInterval(countdownInterval.current)
          setCountdown(null)
          if (mediaRecorder.current?.state === 'recording') {
            mediaRecorder.current.stop()
          }
          setIsRecording(false)
          stopAllStreams()
        } else {
          setCountdown(secs)
        }
      }, 1000)
      
    } catch (err: any) {
      console.warn('[PWA Sensors] Sensory capture error:', err)
      stopAllStreams()
      setIsRecording(false)
      
      if (!navigator.mediaDevices) {
        setError('Browser security blocked sensory capture. Please use an HTTPS context.')
      } else if (err.name === 'NotFoundError') {
        setError('No active microphone found! Connect voice node or allow standard permissions.')
      } else if (err.name === 'NotReadableError') {
        setError('Microphone is locked by another system application.')
      } else {
        setError(`Sensory capture blocked: ${err.message || err.name}`)
      }
    }
  }

  function stopRecording() {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
    }
    setCountdown(null)
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop()
    }
    setIsRecording(false)
    stopAllStreams()
  }

  // Draw Audio Waveform and Accelerometer Graphs
  const startSensorVisualizers = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
    
    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw)
      
      // Get HTML Canvas contexts
      const audioCanvas = audioCanvasRef.current
      const motionCanvas = motionCanvasRef.current
      
      const audioCtx = audioCanvas?.getContext('2d')
      const motionCtx = motionCanvas?.getContext('2d')
      
      // 1. Process Voice Amplitude Data
      let currentVol = 0
      if (analyser.current && audioCanvas && audioCtx) {
        const bufferLength = analyser.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyser.current.getByteFrequencyData(dataArray)
        
        // Calculate average amplitude
        const sum = dataArray.reduce((acc, v) => acc + v, 0)
        currentVol = sum / bufferLength / 255
        
        // Push stats
        totalVolume.current += currentVol
        if (currentVol > maxVolume.current) {
          maxVolume.current = currentVol
        }
        setVocalEnergy(Math.round(currentVol * 100))
        
        // Clear canvas
        audioCtx.clearRect(0, 0, audioCanvas.width, audioCanvas.height)
        
        // Draw Glowing Audio Bars (Dark Orange Gradient #FF6B1A)
        const barWidth = (audioCanvas.width / bufferLength) * 1.5
        let barHeight
        let x = 0
        
        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * audioCanvas.height * 0.95
          
          // Make it sound-responsive and center-balanced
          const grad = audioCtx.createLinearGradient(0, audioCanvas.height, 0, audioCanvas.height - barHeight)
          grad.addColorStop(0, 'rgba(255, 107, 26, 0.15)')
          grad.addColorStop(0.5, '#FF8C42')
          grad.addColorStop(1, '#FF6B1A')
          
          audioCtx.fillStyle = grad
          
          // Draw elegant rounded bars
          audioCtx.beginPath()
          audioCtx.roundRect(x, audioCanvas.height - barHeight, barWidth - 1.5, barHeight, [2, 2, 0, 0])
          audioCtx.fill()
          
          x += barWidth
        }
      }
      
      // 2. Process Physical Vibration Data
      if (motionCanvas && motionCtx) {
        let currentMotion = lastMotionVal.current
        
        // Desktop / Mock simulation fallback
        if (sensorStatus === 'mock') {
          const t = Date.now() / 150
          const mockVibe = 0.15 * Math.sin(t * 1.5) + 0.08 * Math.cos(t * 3.2) + 0.12 * Math.sin(t * 0.4)
          // Scale it so it matches real-world accelerometer magnitude swings (around 1 - 4 m/s²)
          currentMotion = Math.max(0.1, mockVibe * 2.5)
        }
        
        // Aggregate statistics
        totalMotion.current += currentMotion
        if (currentMotion > maxMotion.current) {
          maxMotion.current = currentMotion
        }
        setVibeImpact(parseFloat(currentMotion.toFixed(2)))
        
        // Push motion data point to history ref
        motionHistory.current.shift()
        motionHistory.current.push(currentMotion)
        
        sampleCount.current += 1
        
        // Clear canvas
        motionCtx.clearRect(0, 0, motionCanvas.width, motionCanvas.height)
        
        // Paint Glowing Motion Rolling Line (Gold/Amber #fbbf24 to Orange #FF6B1A)
        motionCtx.beginPath()
        motionCtx.lineWidth = 2.5
        
        const strokeGrad = motionCtx.createLinearGradient(0, 0, motionCanvas.width, 0)
        strokeGrad.addColorStop(0, '#FF8C42')
        strokeGrad.addColorStop(0.5, '#fbbf24')
        strokeGrad.addColorStop(1, '#FF6B1A')
        motionCtx.strokeStyle = strokeGrad
        
        // Subtly fill under the vibration curve
        const fillGrad = motionCtx.createLinearGradient(0, 0, 0, motionCanvas.height)
        fillGrad.addColorStop(0, 'rgba(251, 191, 36, 0.18)')
        fillGrad.addColorStop(1, 'rgba(255, 107, 26, 0)')
        
        const sliceWidth = motionCanvas.width / motionHistory.current.length
        let mx = 0
        
        motionCtx.moveTo(0, motionCanvas.height)
        
        for (let i = 0; i < motionHistory.current.length; i++) {
          // Normalize accelerometer height based on max range (0 - 8 m/s²)
          const val = motionHistory.current[i]
          const my = motionCanvas.height - Math.min(motionCanvas.height * 0.9, (val / 8) * motionCanvas.height + 4)
          
          if (i === 0) {
            motionCtx.moveTo(mx, my)
          } else {
            motionCtx.lineTo(mx, my)
          }
          mx += sliceWidth
        }
        
        motionCtx.stroke()
        
        // Fill area
        motionCtx.lineTo(motionCanvas.width, motionCanvas.height)
        motionCtx.lineTo(0, motionCanvas.height)
        motionCtx.fillStyle = fillGrad
        motionCtx.fill()
      }
    }
    
    // Trigger loop
    draw()
  }

  // Submit sensory data to backend
  async function submitVibe(voiceBlob: Blob) {
    setSubmitting(true)
    setError(null)
    
    try {
      if (voiceBlob.size === 0) {
        throw new Error('Recorded sensory payload is empty. Speak or shake again.')
      }
      
      // Calculate raw averages
      const avgVol = totalVolume.current / (sampleCount.current || 1)
      const avgMotion = totalMotion.current / (sampleCount.current || 1)
      
      // Map visual emoji trigger based on combined impact (vocal + physical vibe)
      const compoundScore = (avgVol * 0.5) + (avgMotion * 0.5)
      const emoji = compoundScore > 0.6 ? '🔥' : compoundScore > 0.35 ? '🚀' : '🐂'
      setEmotion(emoji)
      
      const formData = new FormData()
      const extension = voiceBlob.type.includes('mp4') || voiceBlob.type.includes('m4a') ? 'm4a' : 'webm'
      formData.append('voice', voiceBlob, `depin-sensor-oracle.${extension}`)
      formData.append('emoji', emoji)
      formData.append('token_mint', tokenMint)
      formData.append('user_pubkey', publicKey?.toBase58() || 'ANON')
      
      // Verifiable sensor metadata payload
      const sensoryMetadata = {
        avg_volume: parseFloat(maxVolume.current.toFixed(4)),
        accel_magnitude: parseFloat(maxMotion.current.toFixed(4)),
        device_status: sensorStatus,
        sample_count: sampleCount.current,
        timestamp: Date.now()
      }
      
      formData.append('sensor_data', JSON.stringify(sensoryMetadata))
      
      const res = await fetch(
        'https://9s8ct2b5.functions.insforge.app/submit-vibe',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY}`,
          },
          body: formData,
        }
      )
      
      const responseText = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(responseText)
      } catch {
        data = { error: responseText }
      }
      
      if (!res.ok || data.error) {
        throw new Error(data.error || `Sensor sync error: ${responseText}`)
      }
      
      if (data?.vibeScore !== undefined) {
        setLastVibeScore(data.vibeScore)
      }
      onVibeSubmitted()
      
    } catch (err: any) {
      console.error('[PWA Sensors] Submit failed:', err)
      setError(err?.message || 'Verification connection failed. Retrying sync.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualTrade() {
    if (!publicKey) {
      setError('Verify your Solana node wallet in the header first.')
      return
    }
    setTrading(true)
    setTradeSig(null)
    setError(null)
    
    try {
      const sdk = new BagsSDK(BAGS_API_KEY, connection, 'processed')
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
      setError(err?.message || 'Bags trade failed. Verify gas/liquidity limits.')
    } finally {
      setTrading(false)
    }
  }

  const isHot = (lastVibeScore ?? 0) > 80

  return (
    <div className="flex flex-col items-center gap-4 pt-1 w-full max-w-md mx-auto">
      
      {/* Inline HUD Sensory Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-start gap-2.5 p-3.5 rounded-xl border"
            style={{
              background: 'rgba(239, 68, 68, 0.04)',
              borderColor: 'rgba(239, 68, 68, 0.15)',
            }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs font-display font-bold text-red-400 tracking-wider uppercase">
                SENSOR METRIC CRITICAL EXCEPTION
              </p>
            </div>
            <p className="text-[10px] font-mono text-red-300 leading-normal">
              {error}
            </p>
            {error.includes('microphone') || error.includes('Microphone') ? (
              <button 
                onClick={startRecording}
                className="mt-1 px-4 py-2 w-full text-[10px] font-mono font-bold text-red-400 bg-red-950/20 hover:bg-red-950/40 rounded-lg border border-red-500/20 transition-all flex justify-center items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-red-500" />
                RE-INITIALIZE INTERACTION & RE-TRY
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DUAL CANVAS REAL-TIME SENSORY RADAR MAP */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full grid grid-cols-1 gap-2 border p-3 rounded-2xl bg-black/40"
            style={{ borderColor: 'rgba(255, 107, 26, 0.12)' }}
          >
            {/* Audio Waveform Canvas Box */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-mono text-orange-400/80 tracking-widest flex items-center gap-1">
                  <Mic className="w-2.5 h-2.5" /> VOICE NODE STREAM
                </span>
                <span className="text-[9px] font-mono text-orange-300/80">
                  {vocalEnergy}% ENERGIZED
                </span>
              </div>
              <div className="relative h-14 bg-black/50 rounded-xl overflow-hidden border border-orange-500/10">
                <canvas 
                  ref={audioCanvasRef} 
                  width={340} 
                  height={56} 
                  className="w-full h-full block"
                />
              </div>
            </div>

            {/* Accelerometer Chart Box */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-mono text-amber-400/80 tracking-widest flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5" /> DEPIN ACCELEROMETER
                </span>
                <span className="text-[9px] font-mono text-amber-300/80 uppercase">
                  {sensorStatus === 'live' ? `⚡ ${vibeImpact} M/S² ACTIVE` : '✨ SUBTLE VIBE CHECK'}
                </span>
              </div>
              <div className="relative h-14 bg-black/50 rounded-xl overflow-hidden border border-amber-500/10">
                <canvas 
                  ref={motionCanvasRef} 
                  width={340} 
                  height={56} 
                  className="w-full h-full block"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECORDING CONSOLE TRIGGER */}
      <div className="relative flex flex-col items-center gap-2.5 w-full">
        {/* Ambient background glows during active record */}
        {isRecording && (
          <>
            <div
              className="absolute inset-0 rounded-full animate-pulse opacity-15 blur-xl"
              style={{ background: '#FF6B1A', transform: 'scale(1.3)', width: 140, height: 140, margin: 'auto' }}
            />
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-10"
              style={{ background: '#fbbf24', transform: 'scale(1.6)', width: 80, height: 80, margin: 'auto', animationDuration: '2s' }}
            />
          </>
        )}

        <div className="relative z-10">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={submitting}
            className="flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-40"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: isRecording
                ? 'linear-gradient(135deg, #FF3D00, #FF6B1A)'
                : 'rgba(255, 107, 26, 0.05)',
              border: `1.5px dashed ${isRecording ? '#FF6B1A' : 'rgba(255, 107, 26, 0.3)'}`,
              boxShadow: isRecording 
                ? '0 0 25px rgba(255, 107, 26, 0.45), inset 0 0 15px rgba(255, 61, 0, 0.3)' 
                : 'none',
              transform: isRecording ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {submitting ? (
              <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
            ) : isRecording ? (
              countdown !== null ? (
                <div className="flex flex-col items-center">
                  <span className="text-white font-display font-extrabold text-xl leading-none">{countdown}</span>
                  <span className="text-[8px] font-mono text-white/60 tracking-wider mt-0.5">REC</span>
                </div>
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-orange-500/80 hover:text-orange-400">
                <Mic className="w-6 h-6 animate-pulse" />
              </div>
            )}
          </button>
        </div>

        {/* Live HUD feedback details */}
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-[9px] font-mono text-center tracking-widest text-orange-400/70 uppercase">
            {isRecording
              ? `● CAPTURING SENSORY DATA NODE ...`
              : submitting
                ? '⚡ SECURELY VERIFYING HARDSYNC ENVELOPE ...'
                : 'ACTIVATE NEURAL STREAM ORACLE'}
          </p>
          <span className="text-[8px] font-mono text-white/40 tracking-normal">
            {isRecording 
              ? 'Voice amplitude + physical device motion aggregates are live-calculated.' 
              : 'Requires voice stream + physical accelerometer permission (5-second block).'}
          </span>
        </div>
      </div>

      {/* SCORE GAUGE & DECISION OUTPUT */}
      <AnimatePresence>
        {lastVibeScore !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center gap-2 w-full p-4 rounded-xl border bg-black/30"
            style={{
              borderColor: isHot ? 'rgba(255, 107, 26, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <div className="flex items-center gap-4 w-full justify-center">
              <ScoreGauge score={lastVibeScore} size={64} />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <p className="font-display font-extrabold text-sm text-white tracking-wide uppercase">
                    HARDSYNC DECISION CALIBRATED
                  </p>
                </div>
                <p className="text-[10px] font-mono text-orange-400/80 uppercase tracking-widest mt-0.5">
                  SIGNAL EMITTED {emotion} Score: {lastVibeScore}
                </p>
                <p className="text-[9px] font-mono text-white/50 leading-relaxed mt-1">
                  {isHot 
                    ? '🏆 EXTREME CO-SENTIMENT DETECTED. BAGS.FM TRADE ORDER EXECUTING.' 
                    : 'Oracle aggregate submitted to decentralized consensus pool.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SWAP ORACLE TRIGGER */}
      <button
        onClick={handleManualTrade}
        disabled={trading || !publicKey}
        className="w-full py-3 px-4 rounded-xl font-display font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-2 tracking-wider"
        style={{
          background: publicKey
            ? trading
              ? 'rgba(255, 107, 26, 0.08)'
              : 'linear-gradient(135deg, rgba(255, 107, 26, 0.15), rgba(255, 61, 0, 0.05))'
            : 'rgba(255, 255, 255, 0.01)',
          border: `1.5px solid ${publicKey ? 'rgba(255, 107, 26, 0.3)' : 'rgba(255, 255, 255, 0.04)'}`,
          color: publicKey ? '#FF8C42' : 'rgba(255, 255, 255, 0.15)',
          cursor: publicKey ? 'pointer' : 'not-allowed',
        }}
      >
        {trading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" /> : <Zap className="w-3.5 h-3.5 text-orange-400 animate-pulse" />}
        {trading ? 'SWAPPING DEPIN LIQUIDITY...' : 'INITIATE MANUAL HARDSYNC SWAP (0.1 SOL)'}
      </button>

      {/* SOLSCAN RECEIPT */}
      <AnimatePresence>
        {tradeSig && (
          <motion.a
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            href={`https://solscan.io/tx/${tradeSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[9px] font-mono text-green-400 hover:text-green-300 transition-colors uppercase tracking-widest border border-green-500/10 px-3 py-1.5 rounded-lg bg-green-500/5 mt-0.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
            Oracle Verified Proof · View Solscan
            <ExternalLink className="w-3 h-3 text-green-400 shrink-0" />
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  )
}
