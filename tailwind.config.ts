import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'hype-emerald': '#00FF88',
        'hype-bright': '#05F292',
        'hype-mint': '#10B981',
        'hype-dark': '#059669',
        // Backward compatibility aliases mapped to Cyber-Emerald
        'hype-orange': '#00FF88',
        'hype-amber': '#05F292',
        'hype-fire': '#00CC6A',
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      backgroundImage: {
        'hype-gradient': 'linear-gradient(135deg, #00FF88, #05F292)',
        'hype-radial': 'radial-gradient(circle, rgba(0,255,136,0.18) 0%, transparent 70%)',
      },
      animation: {
        'ticker': 'ticker 18s linear infinite',
        'pulse-glow': 'pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
        'float': 'float 6s ease-in-out infinite',
        'equalizer': 'equalizer 0.5s ease-in-out infinite alternate',
        'shimmer': 'shimmer-text 3s linear infinite',
        'orb-float': 'orb-float 15s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'hype-glow': '0 0 30px rgba(0, 255, 136, 0.4)',
        'hype-glow-sm': '0 0 12px rgba(0, 255, 136, 0.3)',
        'hype-intense': '0 0 60px rgba(0, 255, 136, 0.55)',
      },
    },
  },
  plugins: [],
} satisfies Config;
