import { SolanaProvider } from '@/components/solana-provider'
import { EarningsDashboard } from '@/components/earnings-dashboard'

export const metadata = {
  title: 'My Hype Earnings | HypeOracle',
  description: 'Claim your oracle fee share earned from vibe submissions on HypeOracle.',
}

export default function EarningsPage() {
  return (
    <SolanaProvider>
      <EarningsDashboard />
    </SolanaProvider>
  )
}
