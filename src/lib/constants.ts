/**
 * HypeOracle - Centralized Project Constants
 * Used to avoid duplication and resolve TypeScript compiler errors with hardcoded literals.
 */

import { Connection } from '@solana/web3.js';

// --- BAGS.FM API CONFIG ---
export const BAGS_API_KEY = "bags_prod_8lR0OnUDXzqmRKoWBXV5p14Blh8OsiKWuHgIgc2rook";

// --- SOLANA RPC CONFIG ---
// We use a prioritized list to bypass rate limits on Vercel
export const RPC_ENDPOINTS = [
  "https://solana-mainnet.g.alchemy.com/v2/jq4Zj9Zjor_oxzeIl_tx8",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://api.mainnet-beta.solana.com",
  "https://mainnet.helius-rpc.com/?api-key=your_helius_key"
];

export const GET_CONNECTION = (index = 0, commitment: any = 'processed') => {
  // Use environment variable if available (only on first attempt), otherwise use rotation
  const rpcUrl = (index === 0 && process.env.NEXT_PUBLIC_SOLANA_RPC_URL) 
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL 
    : RPC_ENDPOINTS[index % RPC_ENDPOINTS.length];
  
  return new Connection(rpcUrl, commitment);
};

// --- INSFORGE CONFIG ---
export const INSFORGE_CONFIG = {
  baseUrl: "https://9s8ct2b5.us-east.insforge.app",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY",
};

// --- FALLBACK DATA (To ensure UI never breaks on RPC failure) ---
export const FALLBACK_TICKER_DATA = [
  {
    token: "GAS",
    tokenInfo: { symbol: "GAS", usdPrice: 0.00001554, stats24h: { priceChange: -5.7 } }
  },
  {
    token: "ALPHA",
    tokenInfo: { symbol: "ALPHA", usdPrice: 0.00000422, stats24h: { priceChange: -0.3 } }
  },
  {
    token: "INFRA",
    tokenInfo: { symbol: "INFRA", usdPrice: 0.00001170, stats24h: { priceChange: 2.1 } }
  },
  {
    token: "BATER",
    tokenInfo: { symbol: "BATER", usdPrice: 0.00000222, stats24h: { priceChange: 0.8 } }
  },
  {
    token: "LOTUS",
    tokenInfo: { symbol: "LOTUS", usdPrice: 0.001150, stats24h: { priceChange: -4.2 } }
  }
];
