'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share2, Plus, MonitorSmartphone } from 'lucide-react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const checkStandalone = () => {
      const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isSafariStandalone = (navigator as any).standalone === true;
      setIsStandalone(isMediaStandalone || isSafariStandalone);
    };

    // Check if user is on iOS device
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    };

    checkStandalone();
    checkIOS();

    // Listen for the Chrome/Android native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show banner if not already running as PWA standalone
      if (!isStandalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS and not standalone, show the custom Safari prompt after 4 seconds of dashboard activity
    const timer = setTimeout(() => {
      if (/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) && !isStandalone) {
        setShowBanner(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show native prompt
    deferredPrompt.prompt();
    
    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User response to prompt: ${outcome}`);
    
    // Clear prompt ref and hide banner
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  if (!showBanner || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50 overflow-hidden rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-orange-500/20 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.9) 0%, rgba(5, 5, 8, 0.95) 100%)',
        }}
      >
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
            <MonitorSmartphone className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-display font-extrabold text-sm text-white tracking-wide uppercase">
              INSTALL DEPIN NODE APP
            </h4>
            <p className="text-[10px] font-mono text-white/60 leading-relaxed mt-1">
              {isIOS 
                ? 'Sync directly to your homescreen for hardware-accelerated sensor feeds and real-time oracle tracking.' 
                : 'Install HypeOracle as a standalone application on your device for live sensory oracle syncing.'}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action / Guided Prompt */}
        <div className="mt-4">
          {isIOS ? (
            /* Custom Safari Install Guide */
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-black/40 border border-orange-500/10">
              <span className="text-[8px] font-mono text-orange-400/80 tracking-widest uppercase">
                SAFARI INSTALL GUIDE
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/80 text-[10px] font-mono flex items-center gap-1.5">
                  1. Tap share icon <Share2 className="w-3.5 h-3.5 text-orange-400 inline" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-[10px] font-mono flex items-center gap-1.5">
                  2. Scroll & select &quot;Add to Home Screen&quot; <Plus className="w-3.5 h-3.5 text-orange-400 border border-orange-500/20 rounded bg-orange-500/5 inline" />
                </span>
              </div>
            </div>
          ) : (
            /* Standalone Install Action Button */
            <button
              onClick={handleInstallClick}
              disabled={!deferredPrompt}
              className="w-full py-2.5 px-4 rounded-xl font-display font-extrabold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                boxShadow: '0 4px 15px rgba(255, 107, 26, 0.3)',
                color: '#ffffff',
              }}
            >
              <Download className="w-3.5 h-3.5" />
              PROVISION STANDALONE NODE
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
