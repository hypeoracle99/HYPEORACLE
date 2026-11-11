import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050709] flex flex-col items-center justify-center text-white px-4 font-mono">
      <h2 className="text-4xl font-bold text-[#00FF88] mb-4 uppercase tracking-wider">404 - Not Found</h2>
      <p className="text-sm text-white/50 mb-8">The requested sensory node or dashboard path does not exist.</p>
      <Link 
        href="/"
        className="px-6 py-3 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88] font-bold hover:bg-[#00FF88]/20 transition-all uppercase text-xs tracking-widest shadow-[0_0_15px_rgba(0,255,136,0.2)]"
      >
        Return Home
      </Link>
    </div>
  );
}
