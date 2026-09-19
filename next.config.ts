import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['pino', 'pino-pretty'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    };
    return config;
  },
};

export default nextConfig;
