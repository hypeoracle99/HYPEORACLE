'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  Shield, Zap, Play, Square, Bell, RefreshCw, 
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Activity 
} from 'lucide-react';
import { createClient } from '@insforge/sdk';
import { INSFORGE_CONFIG } from '@/lib/constants';
import { AmbientBackground } from '@/components/ui-primitives';

const client = createClient(INSFORGE_CONFIG);

interface LogEntry {
  timestamp: string;
  type: 'info' | 'trade' | 'sensor' | 'alert';
  message: string;
}

export default function VibeSandbox() {
  const { publicKey } = useWallet();
  
  // Staking & Personality Profiles
  const [profile, setProfile] = useState<any>({
    agent_name: 'Personal Vibe Agent',
    fomo_index: 50,
    panic_index: 50,
    conviction_index: 50,
    risk_tolerance: 50,
    trading_style: 'Balanced',
    personality_summary: 'Evolving emotional intelligence node.'
  });
  
  // Notification States
  const [permission, setPermission] = useState<string>('default');
  const [pushSubmitting, setPushSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulation States
  const [simActive, setSimActive] = useState<boolean>(false);
  const [simBalance, setSimBalance] = useState<number>(10.0); // Starting capital: 10 SOL
  const [simHoldings, setSimHoldings] = useState<number>(0);   // Starting token holdings
  const [simTokenPrice, setSimTokenPrice] = useState<number>(0.001); // Simulated token price in SOL
  const [simLogs, setSimLogs] = useState<LogEntry[]>([]);
  const [equityHistory, setEquityHistory] = useState<number[]>([10.0]);
  
  const simIntervalRef = useRef<any | null>(null);
  const sensorActiveRef = useRef<boolean>(false);
  const lastShakeTimeRef = useRef<number>(0);

  // Fetch Notification Permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Fetch Custom Vibe Profile from database
  const fetchProfile = useCallback(async () => {
    if (!publicKey) return;
    try {
      const { data, error } = await client.database
        .from('user_vibe_profiles')
        .select('*')
        .eq('user_pubkey', publicKey.toBase58())
        .limit(1);

      if (!error && data && data.length > 0) {
        setProfile(data[0]);
      }
    } catch (err) {
      console.warn('[VibeSandbox] Profile fetch failed, using fallback:', err);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Request Notification Permissions
  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setErrorMsg('This browser does not support desktop notifications.');
      return;
    }
    
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setSuccessMsg('Web Push notifications successfully authorized!');
        triggerLocalAlert('Vibe Prophet Calibrated', 'HypeOracle alerts are now successfully linked to this node.');
      } else {
        setErrorMsg('Notification permission was blocked or denied.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Permission request failed.');
    }
  };

  // Helper to trigger a Local Browser Notification instantly
  const triggerLocalAlert = (title: string, body: string, url: string = '/sandbox') => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // 1. Try displaying via Service Worker (Best for PWA mode)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          const notificationOptions: any = {
            body,
            icon: '/logo.png',
            badge: '/favicon.ico',
            tag: 'hypeoracle-alert',
            renotify: true,
            data: { url }
          };
          reg.showNotification(title, notificationOptions);
        });
      } else {
        // 2. Fallback to standard web notification
        new Notification(title, { body, icon: '/logo.png' });
      }
    }
  };

  // Dispatch a simulated Push notification to the API
  const handleSendTestPush = async () => {
    if (!publicKey) {
      setErrorMsg('Connect your Solana wallet to send a test alert.');
      return;
    }
    
    setPushSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/automation/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[${profile.agent_name}] Vibe Consensus Met`,
          body: `Verification completed for staker. Active multiplier boost Calibrated.`,
          userPubkey: publicKey.toBase58(),
          url: '/sandbox'
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Push failed');

      setSuccessMsg(json.message || 'Push alert triggered successfully!');
      
      // Physically display the notification payload returned from the API
      if (json.payload) {
        triggerLocalAlert(json.payload.title, json.payload.body, json.payload.url);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch alert.');
    } finally {
      setPushSubmitting(false);
    }
  };

  // Add Log Entry helper
  const addLog = useCallback((type: 'info' | 'trade' | 'sensor' | 'alert', message: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setSimLogs((prev) => [{ timestamp: timeStr, type, message }, ...prev.slice(0, 49)]);
  }, []);

  // Physical motion (Device Shaking) sensor detection inside sandbox
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!simActive) return;
    
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    
    const totalForce = Math.sqrt(x*x + y*y + z*z);
    const shakeThreshold = 16.0; // Force threshold (m/s2)

    if (totalForce > shakeThreshold) {
      const now = Date.now();
      if (now - lastShakeTimeRef.current > 3000) { // Throttle alerts to once every 3 seconds
        lastShakeTimeRef.current = now;
        
        addLog('sensor', `[Physical Sensor Event] Device shaken! Force: ${totalForce.toFixed(1)} m/s² detected.`);
        
        // Execute dynamic transaction based on calibrated staker profile
        if (profile.panic_index >= 60) {
          // Panic Selling Trigger
          setSimHoldings((prevHoldings) => {
            if (prevHoldings <= 0) return 0;
            const saleValue = prevHoldings * simTokenPrice;
            setSimBalance((prevBal) => {
              const nextBal = prevBal + saleValue;
              setEquityHistory((prev) => [...prev, nextBal]);
              return nextBal;
            });
            addLog('trade', `🚨 PANIC LIQUIDATION: Accelerometer force spiked! Panic index (${profile.panic_index}%) active. Sold all holdings to secure ${saleValue.toFixed(4)} SOL.`);
            triggerLocalAlert(
              `🚨 [${profile.agent_name}] Panic Liquidation`,
              `Physical shaking detected! Sold holdings immediately to secure simulated capital.`
            );
            return 0;
          });
        } else if (profile.fomo_index >= 60) {
          // FOMO Buying Trigger
          const buyAmount = 1.5;
          const purchasedTokens = buyAmount / simTokenPrice;
          
          setSimBalance((prevBal) => {
            if (prevBal <= 0.5) {
              addLog('info', `[Simulation warning] FOMO buy skipped. Insufficient SOL capital.`);
              return prevBal;
            }
            setSimHoldings((prev) => prev + purchasedTokens);
            const nextBal = prevBal - buyAmount;
            setEquityHistory((prev) => [...prev, nextBal]);
            return nextBal;
          });
          addLog('trade', `🚀 FOMO ACCUMULATION: Physical shaking captured! FOMO index (${profile.fomo_index}%) active. Executed immediate market buy of ${purchasedTokens.toFixed(0)} tokens for 1.5 SOL.`);
          triggerLocalAlert(
            `🚀 [${profile.agent_name}] FOMO Purchase`,
            `Physical movement triggered staker FOMO! Sim-purchased tokens for 1.5 SOL.`
          );
        } else {
          addLog('info', `[Vibe Balance] Shaking force captured. Agent personality is 'Balanced' (${profile.trading_style}). No immediate execution required.`);
        }
      }
    }
  }, [simActive, profile, simTokenPrice, addLog]);

  // Request accelerometer sensor access
  const handleRequestMotion = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // iOS Safari requires explicit requestPermission triggers
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion);
          sensorActiveRef.current = true;
          addLog('info', 'Secure iOS accelerometer sensor connection established.');
        } else {
          addLog('info', 'Accelerometer access declined by iOS safety.');
        }
      } else {
        // Standard browsers
        window.addEventListener('devicemotion', handleDeviceMotion);
        sensorActiveRef.current = true;
        addLog('info', 'Android/Chrome motion sensor calibration completed.');
      }
    } catch (err) {
      console.warn('DeviceMotionEvent permissions error:', err);
    }
  };

  // Start Simulation Loop
  const handleStartSimulation = () => {
    if (simActive) return;
    
    setErrorMsg(null);
    setSimActive(true);
    setSimBalance(10.0);
    setSimHoldings(0);
    setSimTokenPrice(0.001);
    setEquityHistory([10.0]);
    setSimLogs([]);
    
    addLog('info', `[Simulation Initialized] Trained Agent '${profile.agent_name}' connected to sandbox.`);
    addLog('info', `[Staking Level Active] Risk tolerance: ${profile.risk_tolerance}%. Starting Capital: 10.00 SOL.`);
    
    // Connect accelerometer sensor if supported
    handleRequestMotion();

    let counter = 0;
    
    simIntervalRef.current = setInterval(() => {
      counter++;
      
      // 1. Simulate price movements (random walk with volatility scale)
      setSimTokenPrice((prevPrice) => {
        const volatility = 0.15; // 15% volatility
        const drift = (profile.risk_tolerance - 50) / 1000; // high risk stakers induce simulated market upward drifts
        const multiplier = 1 + (Math.random() - 0.5) * volatility + drift;
        const nextPrice = Math.max(0.0001, prevPrice * multiplier);
        return nextPrice;
      });

      // 2. Let the Agent execute trade decisions based on random interval waves and personality stats
      const decisionSeed = Math.random() * 100;
      
      if (decisionSeed < profile.fomo_index / 5) {
        // Buy Decision triggered by FOMO
        const currentHoldings = simHoldings;
        const currentPrice = simTokenPrice;
        
        setSimBalance((prevBal) => {
          if (prevBal <= 0.2) return prevBal;
          const buySize = parseFloat((prevBal * 0.2).toFixed(2)); // spend 20% of remaining SOL
          const purchased = buySize / currentPrice;
          
          setSimHoldings((prev) => prev + purchased);
          const nextBal = prevBal - buySize;
          setEquityHistory((prev) => [...prev, nextBal + (currentHoldings + purchased) * currentPrice]);
          addLog('trade', `🟢 AGENT BUY: FOMO trigger activated! Personality profile is highly reactive. Purchased ${purchased.toFixed(0)} tokens for ${buySize} SOL.`);
          
          return nextBal;
        });
      } else if (decisionSeed < (profile.fomo_index + profile.panic_index) / 5) {
        // Sell Decision triggered by Panic
        const currentHoldings = simHoldings;
        const currentPrice = simTokenPrice;
        
        if (currentHoldings > 0) {
          const sellPct = 0.5; // Sell 50% on standard panic triggers
          const sellAmount = currentHoldings * sellPct;
          const saleProceeds = sellAmount * currentPrice;

          setSimHoldings((prev) => prev - sellAmount);
          setSimBalance((prevBal) => {
            const nextBal = prevBal + saleProceeds;
            setEquityHistory((prev) => [...prev, nextBal + (currentHoldings - sellAmount) * currentPrice]);
            return nextBal;
          });
          addLog('trade', `🔴 AGENT SELL: Panic threshold crossed! Personality index (${profile.panic_index}%) triggered. Sold ${sellAmount.toFixed(0)} tokens for ${saleProceeds.toFixed(4)} SOL.`);
        }
      }

      // Periodically log updates
      if (counter % 4 === 0) {
        addLog('info', `[Heartbeat Diagnostic] Consensus block verified. Node is calibrating ambient sensory data...`);
      }

    }, 3000); // Trigger simulation iteration every 3 seconds
  };

  // Stop Simulation Loop
  const handleStopSimulation = useCallback(() => {
    if (!simActive) return;
    
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setSimActive(false);
    
    // Disconnect motion sensor
    if (sensorActiveRef.current) {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      sensorActiveRef.current = false;
    }

    addLog('info', `[Simulation Terminated] Results stored inside local staker cache.`);
  }, [simActive, handleDeviceMotion, addLog]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  // Compute final net worth (SOL + holdings value in SOL)
  const currentNetWorth = useMemo(() => {
    return simBalance + simHoldings * simTokenPrice;
  }, [simBalance, simHoldings, simTokenPrice]);

  // Render reactive premium SVG equity curve (Color rule compliant)
  const svgLinePoints = useMemo(() => {
    const width = 500;
    const height = 150;
    const padding = 10;
    
    if (equityHistory.length === 0) return '';
    const minVal = Math.min(...equityHistory) * 0.95;
    const maxVal = Math.max(...equityHistory) * 1.05;
    const range = maxVal - minVal || 1.0;
    
    const step = (width - padding * 2) / Math.max(1, equityHistory.length - 1);
    
    return equityHistory.map((val, idx) => {
      const x = padding + idx * step;
      // Invert Y axis
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [equityHistory]);

  return (
    <div className="relative min-h-screen pb-20">
      <AmbientBackground />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-24">
        
        {/* Header Section */}
        <section className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <Activity className="w-3.5 h-3.5" /> DEPIN AUTONOMOUS WORKSPACE
            </div>
          </div>
          <h1 className="display-heading text-[clamp(2rem,6vw,4.5rem)] mb-3 leading-[1] font-sans tracking-tighter">
            <span className="gradient-text-fire">VIBE</span> <span className="text-white">SANDBOX</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto leading-relaxed">
            Test and simulate your custom calibrated **Vibe Agent** under volatile market swings. Connect device sensors and test native PWA Web Push alerts.
          </p>
        </section>

        {/* Global Alert Banners */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl border bg-red-950/10 border-red-500/20 text-red-400 flex items-start gap-3 w-full"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs font-mono text-left">
                <span className="font-bold">SYSTEM WARNING</span>: {errorMsg}
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl border bg-green-950/10 border-green-500/20 text-green-400 flex items-start gap-3 w-full"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs font-mono text-left">
                <span className="font-bold">TRANSACTION SUCCESS</span>: {successMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Multi-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-left">
          
          {/* Column 1: Staking Agent Configuration & Push Status */}
          <div className="space-y-6">
            
            {/* Calibrated Vibe Agent Profile Card */}
            <div className="p-5 rounded-2xl border bg-black/40" style={{ borderColor: 'rgba(255,107,26,0.15)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-orange-500" />
                <h2 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                  Calibrated Vibe Node
                </h2>
              </div>

              {!publicKey ? (
                <div className="text-center py-6">
                  <p className="text-[10px] font-mono text-white/40 mb-3 uppercase">Node offline. Connect wallet to load staker stats.</p>
                  <WalletMultiButton className="!h-8 !py-0 !px-4 !text-xs !bg-orange-500/10 hover:!bg-orange-500/20 !border !border-orange-500/30 !rounded-xl !text-orange-400 !font-display !font-bold transition-all" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Active Agent Name</span>
                    <p className="font-display font-extrabold text-sm text-orange-400 mt-0.5">{profile.agent_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                    <div>
                      <span className="text-[8px] font-mono text-white/40 uppercase">FOMO Index</span>
                      <p className="font-mono text-xs text-white font-bold">{profile.fomo_index}%</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-white/40 uppercase">Panic Index</span>
                      <p className="font-mono text-xs text-white font-bold">{profile.panic_index}%</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-white/40 uppercase">Conviction</span>
                      <p className="font-mono text-xs text-white font-bold">{profile.conviction_index}%</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-white/40 uppercase">Trading Style</span>
                      <p className="font-mono text-xs text-orange-400 font-bold uppercase">{profile.trading_style}</p>
                    </div>
                  </div>

                  <p className="text-[9px] font-mono text-white/50 leading-relaxed pt-3 border-t border-white/5 italic">
                    &ldquo;{profile.personality_summary}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* PWA Web Push Notification Settings */}
            <div className="p-5 rounded-2xl border bg-black/40 border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-orange-400" />
                <h2 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                  PWA Push Notifications
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[9px] font-mono text-white/50 uppercase">Permission Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold ${
                    permission === 'granted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                    permission === 'denied' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                    'bg-white/5 text-white/50 border border-white/10'
                  }`}>
                    {permission}
                  </span>
                </div>

                {permission !== 'granted' ? (
                  <button
                    onClick={handleRequestPermission}
                    className="w-full py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 hover:border-orange-500/40 text-orange-400 font-display font-extrabold text-xs tracking-wider transition-all"
                  >
                    AUTHORIZE NOTIFICATIONS
                  </button>
                ) : (
                  <button
                    onClick={handleSendTestPush}
                    disabled={pushSubmitting || !publicKey}
                    className="w-full py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 hover:border-green-500/40 text-green-400 font-display font-extrabold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {pushSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    TEST PWA PUSH ALERT
                  </button>
                )}
                
                <p className="text-[8.5px] font-mono text-white/30 leading-snug">
                  Native Web Push triggers local browser notification payloads. Highly responsive on iOS Safari PWA standalone layouts.
                </p>
              </div>
            </div>

          </div>

          {/* Column 2 & 3: Volatility sandbox simulator */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Chart & Control Board */}
            <div className="p-5 rounded-2xl border bg-black/40 flex flex-col justify-between" style={{ borderColor: 'rgba(255,107,26,0.08)' }}>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                    Autonomous Trade Console
                  </h2>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">Physical accelerometer motion acts as simulated manual triggers</p>
                </div>

                <div className="flex gap-2">
                  {!simActive ? (
                    <button
                      onClick={handleStartSimulation}
                      className="py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-display font-extrabold text-xs tracking-wide transition-colors flex items-center gap-1 shadow-[0_0_15px_rgba(255,107,26,0.15)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-white text-white" /> START RUN
                    </button>
                  ) : (
                    <button
                      onClick={handleStopSimulation}
                      className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-display font-extrabold text-xs tracking-wide transition-colors flex items-center gap-1"
                    >
                      <Square className="w-3.5 h-3.5 fill-white text-white" /> HALT LOOP
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation balance parameters */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-black/50 border border-white/5">
                <div>
                  <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Sim-Balance (SOL)</span>
                  <p className="font-mono text-base font-extrabold text-white mt-0.5">{simBalance.toFixed(2)} SOL</p>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Sim-Holdings</span>
                  <p className="font-mono text-base font-extrabold text-orange-400 mt-0.5">{simHoldings.toFixed(0)}</p>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Net Value (SOL)</span>
                  <p className="font-mono text-base font-extrabold text-green-400 mt-0.5">{currentNetWorth.toFixed(4)} SOL</p>
                </div>
              </div>

              {/* SVG Equity Line Chart */}
              <div className="relative h-[150px] w-full bg-black/60 rounded-xl border border-white/5 overflow-hidden flex items-end">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Glowing background gradient */}
                  <defs>
                    <linearGradient id="sim-equity-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B1A" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#FF6B1A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  
                  {/* Dynamic path */}
                  {equityHistory.length > 1 && (
                    <>
                      <path
                        d={`M 10,150 L ${svgLinePoints} L 490,150 Z`}
                        fill="url(#sim-equity-grad)"
                      />
                      <polyline
                        fill="none"
                        stroke="#FF6B1A"
                        strokeWidth="2"
                        points={svgLinePoints}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                </svg>

                {equityHistory.length <= 1 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/35 font-mono text-[9px] uppercase tracking-wider gap-2">
                    <TrendingUp className="w-5 h-5 text-white/20 animate-pulse" />
                    Waiting to initialize simulation equity curve...
                  </div>
                )}
              </div>

            </div>

            {/* Sandbox Simulation Console Logs */}
            <div className="p-5 rounded-2xl border bg-black/40 border-white/5 flex flex-col h-[280px]">
              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest mb-3">
                SYSTEM SIMULATOR TERMINAL
              </span>

              <div className="flex-1 overflow-y-auto font-mono text-[10px] text-white/60 space-y-2 pr-1 select-text scrollbar-thin">
                {simLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-white/25 uppercase tracking-wider text-[9px]">
                    Console idle. Start volatility simulation to begin logging metrics.
                  </div>
                ) : (
                  simLogs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`p-1.5 rounded flex items-start gap-2 text-left leading-normal ${
                        log.type === 'trade' ? 'bg-orange-500/5 text-orange-400/90 border-l border-orange-500' :
                        log.type === 'sensor' ? 'bg-cyan-500/5 text-cyan-400 border-l border-cyan-500' :
                        log.type === 'alert' ? 'bg-green-500/5 text-green-400 border-l border-green-500' :
                        'text-white/40'
                      }`}
                    >
                      <span className="text-white/20 select-none">[{log.timestamp}]</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
