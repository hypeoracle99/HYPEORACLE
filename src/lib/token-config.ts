/**
 * HypeOracle - Official Token Configuration
 * 
 * UPDATE THIS FILE once you have launched your token on Bags.fm.
 * This centrally controls the dashboard charts, units, and live price feeds.
 */

export const OFFICIAL_TOKEN = {
  // 1. SET YOUR MINT ADDRESS HERE
  // Example: "HYPE1234567890..."
  mint: "5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS", 

  // 2. TOGGLE TO TRUE TO ENABLE LIVE DATA
  isLive: true,

  // 3. METADATA
  symbol: "HYPE",
  name: "HypeOracle",
  
  // 4. EXTERNAL LINKS
  bagsUrl: (mint: string) => `https://bags.fm/${mint}`,
  solscanUrl: (mint: string) => `https://solscan.io/token/${mint}`,
  
  // 5. PROTOCOL DEFAULTS (SIMULATION OVERRIDES)
  defaults: {
    maxPosition: 0.01, // SOL (Scales with Vibe 2.0 logic)
    oracleFuel: 0.52,  // Initial Simulation Value
  }
}

/**
 * Helper to identify if a token is our official asset
 */
export const isOfficialToken = (mint: string) => {
  return OFFICIAL_TOKEN.mint !== "LAUNCH_PENDING" && mint === OFFICIAL_TOKEN.mint;
}
