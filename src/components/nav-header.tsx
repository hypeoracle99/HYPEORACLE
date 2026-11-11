'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Zap, Coins, BrainCircuit, Wallet, ChevronRight, Globe, TrendingUp, Users, Bot, Activity
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
        background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
        color: active ? color : 'rgba(255,255,255,0.65)',
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
          style={{ boxShadow: `0 0 15px ${color}25` }}
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
    <header className="sticky top-0 z-[100] w-full border-b border-[#00FF88]/15 bg-[#050709]/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
             <div className="relative">
               <div className="absolute inset-0 bg-[#00FF88]/20 blur-xl rounded-full group-hover:bg-[#00FF88]/40 transition-all animate-pulse" />
               <div className="relative w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all">
                 <img 
                   src="/logo.png" 
                   alt="HypeOracle" 
                   className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,255,136,0.35)]"
                 />
               </div>
             </div>
             <div className="flex flex-col -space-y-1">
               <span className="font-display font-black tracking-tight text-lg md:text-xl md:tracking-[0.1em] text-white">
                 HYPE<span className="text-[#00FF88] hidden xs:inline">ORACLE</span>
                 <span className="text-[#00FF88] xs:hidden">O</span>
               </span>
               <div className="hidden sm:flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                 <span className="text-[8px] font-mono tracking-[0.2em] text-[#00FF88]/70 uppercase">Oracle Online • Solana Mainnet</span>
               </div>
             </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-2">
            <NavItem 
              href="/" 
              icon={Activity} 
              active={pathname === '/'} 
              color="#00FF88"
            >
              Dashboard
            </NavItem>
            <NavItem 
              href="/predict" 
              icon={TrendingUp} 
              active={pathname === '/predict'} 
              color="#00FF88"
            >
              Predict
            </NavItem>
            <NavItem 
              href="/sandbox" 
              icon={BrainCircuit} 
              active={pathname === '/sandbox'} 
              color="#00FF88"
            >
              Sandbox
            </NavItem>
            <NavItem 
              href="/market" 
              icon={Globe} 
              active={pathname === '/market'} 
              color="#00FF88"
            >
              Market
            </NavItem>
            <NavItem 
              href="/community" 
              icon={Users} 
              active={pathname.startsWith('/community')} 
              color="#00FF88"
            >
              Community
            </NavItem>
            <NavItem 
              href="/admin/x-manager" 
              icon={Bot} 
              active={pathname.startsWith('/admin/x-manager')} 
              color="#00FF88"
            >
              AI X Manager
            </NavItem>
            {publicKey && (
              <>
                <NavItem 
                  href="/my-agent" 
                  icon={BrainCircuit} 
                  active={pathname === '/my-agent'} 
                  color="#00FF88"
                >
                  My Agent
                </NavItem>
                <NavItem 
                  href="/stake" 
                  icon={Zap} 
                  active={pathname === '/stake'} 
                  color="#00FF88"
                >
                  Stake $HYPE
                </NavItem>
                <NavItem 
                  href="/earnings" 
                  icon={Coins} 
                  active={pathname === '/earnings'} 
                  color="#00FF88"
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-[#00FF88]/20 text-[#00FF88]/70 text-[9px] font-mono transition-all hover:bg-[#00FF88]/10 active:scale-95"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
              {oracleWallet.slice(0, 4)}...{oracleWallet.slice(-4)}
            </button>
          )}

          <div className="flex items-center">
            {mounted ? (
              <WalletMultiButton className="!bg-[#00FF88]/15 !border !border-[#00FF88]/30 !rounded-xl !h-10 md:!h-11 !px-3 md:!px-5 !text-[11px] !font-display !font-bold !transition-all hover:!bg-[#00FF88]/25 !text-[#00FF88]" />
            ) : (
              <div className="w-28 md:w-36 h-10 rounded-xl bg-white/5 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
