'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Zap, Coins, BrainCircuit, Wallet, ChevronRight 
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { createClient } from '@insforge/sdk'
import { INSFORGE_CONFIG } from '@/lib/constants'

const client = createClient(INSFORGE_CONFIG)

function NavItem({ href, children, icon: Icon, active, color }: any) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        if (!active) {
          startTransition(() => {
            router.push(href)
          })
        }
      }}
      disabled={isPending}
      className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all active:scale-95 disabled:opacity-70`}
      style={{
        background: active ? `${color}15` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
        color: active ? color : 'rgba(255,255,255,0.6)',
      }}
    >
      {isPending ? (
        <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      <span>{children}</span>
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `0 0 15px ${color}10` }}
        />
      )}
    </button>
  )
}

export function NavHeader() {
  const { publicKey } = useWallet()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [oracleWallet, setOracleWallet] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    fetchOracleWallet()
  }, [])

  async function fetchOracleWallet() {
    try {
      const { data } = await client.database
        .from('oracle_fuel')
        .select('oracle_pubkey')
        .limit(1)
        .single()
      if (data?.oracle_pubkey) setOracleWallet(data.oracle_pubkey)
    } catch {}
  }

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/[0.06] bg-black/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
             <div className="relative">
               <div className="absolute inset-0 bg-[#FF6B1A]/20 blur-xl rounded-full group-hover:bg-[#FF6B1A]/40 transition-all animate-pulse" />
               <div className="relative w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all">
                 <img 
                   src="/logo.png" 
                   alt="HypeOracle" 
                   className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,107,26,0.3)]"
                 />
               </div>
             </div>
             <div className="flex flex-col -space-y-1">
               <span className="font-display font-black tracking-tight text-lg md:text-xl md:tracking-[0.1em]">
                 HYPE<span className="text-[#FF6B1A] hidden xs:inline">ORACLE</span>
                 <span className="text-[#FF6B1A] xs:hidden">O</span>
               </span>
               <span className="hidden sm:block text-[8px] font-mono tracking-[0.2em] text-white/30 uppercase">Vibe-to-Asset Protocol</span>
             </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-2">
            <NavItem 
              href="/" 
              icon={Zap} 
              active={pathname === '/'} 
              color="#FF8C42"
            >
              Dashboard
            </NavItem>
            {publicKey && (
              <>
                <NavItem 
                  href="/my-agent" 
                  icon={BrainCircuit} 
                  active={pathname === '/my-agent'} 
                  color="#10b981"
                >
                  My Agent
                </NavItem>
                <NavItem 
                  href="/stake" 
                  icon={Zap} 
                  active={pathname === '/stake'} 
                  color="#FF8C42"
                >
                  Stake $HYPE
                </NavItem>
                <NavItem 
                  href="/earnings" 
                  icon={Coins} 
                  active={pathname === '/earnings'} 
                  color="#ffffff"
                >
                  Earnings
                </NavItem>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {mounted && oracleWallet && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(oracleWallet)
                alert(`Oracle Address Saved: ${oracleWallet}`)
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 text-[9px] font-mono transition-all hover:bg-white/[0.06] active:scale-95"
            >
              <div className="w-1 h-1 rounded-full bg-[#FF6B1A] animate-pulse" />
              {oracleWallet.slice(0, 4)}...{oracleWallet.slice(-4)}
            </button>
          )}

          <div className="flex items-center">
            {mounted ? (
              <WalletMultiButton className="!bg-[#FF6B1A]/10 !border !border-[#FF6B1A]/20 !rounded-xl !h-10 md:!h-11 !px-3 md:!px-5 !text-[11px] !font-display !font-bold !transition-all hover:!bg-[#FF6B1A]/20 !text-[#FF8C42]" />
            ) : (
              <div className="w-28 md:w-36 h-10 rounded-xl bg-white/5 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
