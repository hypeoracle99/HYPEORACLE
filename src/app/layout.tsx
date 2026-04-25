import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SolanaProvider } from '@/components/solana-provider';
import { NavHeader } from '@/components/nav-header';
import { MobileNav } from '@/components/mobile-nav';

export const metadata: Metadata = {
  title: 'HypeOracle | Real Human Vibes → On-Chain Trades',
  description: 'Collective Emotion Oracle for Bags.fm — DePIN voice sensors + AI scoring = automated Solana trading signals.',
  keywords: ['DePIN', 'Solana', 'Bags.fm', 'Oracle', 'Trading', 'AI', 'Hype'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HypeOracle',
  },
  openGraph: {
    title: 'HypeOracle — Real Human Vibes → On-Chain Trades',
    description: 'DePIN voice + AI emotion scoring → automated Solana trading signals on Bags.fm',
    type: 'website',
    siteName: 'HypeOracle',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HypeOracle',
    description: 'Real human hype & vibes → live on-chain trading signals',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const themeScript = `
  try {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased font-body bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
        <SolanaProvider>
          <NavHeader />
          <main className="pb-24 lg:pb-0">
            {children}
          </main>
          <MobileNav />
        </SolanaProvider>
      </body>
    </html>
  );
}
