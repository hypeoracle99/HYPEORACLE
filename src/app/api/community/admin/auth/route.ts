import { NextResponse } from 'next/server';
import { 
  generateAdminChallenge, 
  verifySolanaSignature, 
  createAdminToken, 
  getAuthorizedAdminWallets,
  logAdminAudit 
} from '@/lib/community-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get('pubkey');

    if (!pubkey) {
      return NextResponse.json({ error: 'Public key is required' }, { status: 400 });
    }

    const authorized = getAuthorizedAdminWallets();
    const isWhitelisted = authorized.some((w) => w.toLowerCase() === pubkey.toLowerCase());

    if (!isWhitelisted && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Wallet not authorized for admin access.' }, { status: 403 });
    }

    const challenge = generateAdminChallenge(pubkey);
    return NextResponse.json({ challenge });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pubkey, message, signature } = body;

    if (!pubkey || !message || !signature) {
      return NextResponse.json({ error: 'Missing signature verification parameters' }, { status: 400 });
    }

    const authorized = getAuthorizedAdminWallets();
    const isWhitelisted = authorized.some((w) => w.toLowerCase() === pubkey.toLowerCase());

    if (!isWhitelisted && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Wallet is not on authorized admin list.' }, { status: 403 });
    }

    // Cryptographic signature check
    const isValid = verifySolanaSignature(pubkey, message, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Cryptographic signature verification failed.' }, { status: 401 });
    }

    const token = createAdminToken(pubkey, 'solana_signature');

    await logAdminAudit(pubkey, 'solana_signature', 'admin_login_success', 'auth', pubkey, {
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      token,
      adminIdentity: pubkey,
      authMethod: 'solana_signature'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
