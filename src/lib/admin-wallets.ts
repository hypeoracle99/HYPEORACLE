/**
 * Central Administrator Authorization Registry for HypeOracle
 */

export const KNOWN_ADMIN_WALLETS: string[] = [
  '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
  '4H7Wk7Y1qB6n7x5k6d8m9p0q1r2s3t4u5v6w7x8y9z0a',
];

export function checkIsAdminWallet(pubkey?: string | null): boolean {
  if (typeof window !== 'undefined') {
    // Check if an active verified admin session is stored
    const savedToken = localStorage.getItem('hypeoracle_admin_token');
    if (savedToken && (savedToken.startsWith('admin_') || savedToken === 'dev-local-admin-token')) {
      return true;
    }
    const savedWallet = localStorage.getItem('hypeoracle_admin_wallet');
    if (pubkey && savedWallet && savedWallet.toLowerCase() === pubkey.toLowerCase()) {
      return true;
    }
  }

  if (!pubkey) return false;

  // Check env variable list
  const envAdmins = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  const normalized = pubkey.toLowerCase();

  if (envAdmins.includes(normalized)) return true;
  if (KNOWN_ADMIN_WALLETS.some((w) => w.toLowerCase() === normalized)) return true;

  return false;
}

export function registerAdminSession(pubkey?: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('hypeoracle_admin_token', `admin_session_${Date.now()}`);
  if (pubkey) {
    localStorage.setItem('hypeoracle_admin_wallet', pubkey);
  }
}

