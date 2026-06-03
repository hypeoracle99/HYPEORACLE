import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white px-4 font-mono">
      <h2 className="text-4xl font-bold text-orange-500 mb-4 uppercase tracking-wider">404 - Not Found</h2>
      <p className="text-sm text-white/50 mb-8">The requested sensory node or dashboard path does not exist.</p>
      <Link 
        href="/"
        className="px-6 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/20 transition-all uppercase text-xs tracking-widest"
      >
        Return Home
      </Link>
    </div>
  );
}
