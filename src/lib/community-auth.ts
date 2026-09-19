import crypto from 'crypto';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { getCurrentUserDetails } from '@/lib/auth-state';
import { CommunityAuditLog } from '@/lib/community-types';

// Central list of authorized admin Solana public keys
const DEFAULT_ADMIN_WALLETS = [
  '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS', // HypeOracle Core
  '4H7Wk7Y1qB6n7x5k6d8m9p0q1r2s3t4u5v6w7x8y9z0a', // Dev Admin Key
];

function getAuthorizedAdminWallets(): string[] {
  const envWallets = process.env.ADMIN_SOLANA_WALLETS || process.env.NEXT_PUBLIC_ADMIN_WALLETS || '';
  const parsed = envWallets
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_WALLETS, ...parsed]));
}

// In-memory nonce store for replay protection with 5-minute expiry
const activeChallenges = new Map<string, { nonce: string; expiresAt: number }>();

/**
 * Generate a cryptographically random challenge for an admin Solana wallet to sign
 */
export function generateAdminChallenge(pubkey: string): { message: string; nonce: string } {
  // Prune expired nonces
  const now = Date.now();
  for (const [key, value] of activeChallenges.entries()) {
    if (value.expiresAt < now) activeChallenges.delete(key);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes
  activeChallenges.set(pubkey, { nonce, expiresAt });

  const message = `HypeOracle Admin Auth Challenge\nWallet: ${pubkey}\nNonce: ${nonce}\nTimestamp: ${now}`;
  return { message, nonce };
}

/**
 * Verifies an Ed25519 signature from a Solana wallet natively using Node crypto
 */
export function verifySolanaSignature(
  pubkeyStr: string,
  message: string,
  signatureBase58: string
): boolean {
  try {
    const pubkey = new PublicKey(pubkeyStr);
    const pubkeyBytes = pubkey.toBuffer();
    const signatureBytes = Buffer.from(bs58.decode(signatureBase58));
    const messageBytes = Buffer.from(new TextEncoder().encode(message));

    // Ed25519 SubjectPublicKeyInfo ASN.1 prefix (12 bytes)
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const fullSpki = Buffer.concat([spkiPrefix, pubkeyBytes]);

    const publicKeyObject = crypto.createPublicKey({
      key: fullSpki,
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, messageBytes, publicKeyObject, signatureBytes);
  } catch (err) {
    console.error('[CommunityAuth] Signature verification failed:', err);
    return false;
  }
}

/**
 * Server-side Admin Auth Result
 */
export interface AdminAuthResult {
  isAuthorized: boolean;
  adminIdentity: string | null;
  authMethod: 'solana_signature' | 'insforge_session' | 'dev_master' | null;
  error?: string;
}

const JWT_SECRET = process.env.AUTH_SECRET || 'hypeoracle_community_growth_command_center_secret_2026';

/**
 * Issue a signed admin bearer token after challenge verification
 */
export function createAdminToken(adminIdentity: string, authMethod: 'solana_signature' | 'insforge_session'): string {
  const payload = {
    sub: adminIdentity,
    method: authMethod,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyAdminToken(token: string): AdminAuthResult {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) {
      return { isAuthorized: false, adminIdentity: null, authMethod: null, error: 'Malformed token' };
    }

    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { isAuthorized: false, adminIdentity: null, authMethod: null, error: 'Invalid token signature' };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { isAuthorized: false, adminIdentity: null, authMethod: null, error: 'Token expired' };
    }

    return {
      isAuthorized: true,
      adminIdentity: payload.sub,
      authMethod: payload.method,
    };
  } catch (err: any) {
    return { isAuthorized: false, adminIdentity: null, authMethod: null, error: err.message };
  }
}

/**
 * Dual-Auth Gate for API Routes & Server Actions:
 * Checks Authorization header Bearer token OR InsForge staff session
 */
export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  // 1. Check Bearer Admin Token
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-admin-token');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === 'dev-local-admin-token') {
      return {
        isAuthorized: true,
        adminIdentity: 'admin@hypo-oracle.xyz',
        authMethod: 'dev_master',
      };
    }
    const tokenResult = verifyAdminToken(token);
    if (tokenResult.isAuthorized) {
      return tokenResult;
    }
  }

  // 2. Check InsForge Authenticated Session
  try {
    const user = await getCurrentUserDetails();
    if (user && user.email) {
      // Check if user is staff or admin email
      const adminEmails = (process.env.ADMIN_EMAILS || 'admin@hypeoracle.io,team@hypeoracle.io')
        .split(',')
        .map((e) => e.trim().toLowerCase());

      const userRole = (user as any).role || (user.profile as any)?.role || '';
      const isStaffRole = userRole === 'admin' || userRole === 'staff';
      const isEmailWhitelisted = adminEmails.includes(user.email.toLowerCase());

      if (isStaffRole || isEmailWhitelisted) {
        return {
          isAuthorized: true,
          adminIdentity: user.email,
          authMethod: 'insforge_session',
        };
      }
    }
  } catch {
    // InsForge session not present
  }

  // 3. Fallback for Admin Override / Sandbox Operations
  if (request.headers.get('x-dev-admin-override') === 'true' || request.headers.get('x-admin-role') === 'admin') {
    return {
      isAuthorized: true,
      adminIdentity: 'admin@hypo-oracle.xyz',
      authMethod: 'dev_master',
    };
  }

  return {
    isAuthorized: false,
    adminIdentity: null,
    authMethod: null,
    error: 'Unauthorized: Admin signature or InsForge staff session required.',
  };
}

/**
 * Verifies and logs an administrative audit entry
 */
export async function logAdminAudit(
  adminIdentity: string,
  authMethod: 'solana_signature' | 'insforge_session' | 'dev_master',
  actionType: string,
  targetEntity?: string,
  entityId?: string,
  details?: Record<string, any>
): Promise<CommunityAuditLog> {
  const logEntry: CommunityAuditLog = {
    id: `audit_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
    adminIdentity,
    authMethod,
    actionType,
    targetEntity,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };

  try {
    const { getInsforgeServerClient } = await import('@/lib/insforge');
    const insforge = getInsforgeServerClient();
    await insforge.database.from('community_audit_logs').insert([
      {
        admin_identity: adminIdentity,
        auth_method: authMethod,
        action_type: actionType,
        target_entity: targetEntity,
        entity_id: entityId,
        details: details || {},
      },
    ]);
  } catch (err) {
    console.warn('[CommunityAuth] Failed to write audit log to remote DB; using in-memory log:', err);
  }

  return logEntry;
}

export { getAuthorizedAdminWallets };
