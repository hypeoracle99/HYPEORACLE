'use client'

import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Zap, Coins, BrainCircuit, Activity
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'

export function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { connected } = useWallet()

  const navItems = [
    { href: '/', icon: Zap, label: 'Dashboard', color: '#FF6B1A' },
    { href: '/stake', icon: Activity, label: 'Stake', color: '#FF8C42' },
    { href: '/earnings', icon: Coins, label: 'Earnings', color: '#ffffff' },
    { href: '/my-agent', icon: BrainCircuit, label: 'Agent', color: '#10b981' },
  ]

  if (!connected) return null

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-black/60 backdrop-blur-2xl border border-white/[0.08] rounded-[24px] p-2 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`relative flex flex-col items-center gap-1 p-2 transition-all active:scale-90 ${active ? 'text-white' : 'text-white/40'}`}
            >
              <div className={`relative p-2 rounded-xl transition-all ${active ? 'bg-white/5' : ''}`}>
                <Icon className="w-5 h-5" style={{ color: active ? item.color : undefined }} />
                {active && (
                  <motion.div 
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-white/5 rounded-xl -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              <span className={`text-[8px] font-mono font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
