import nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface PhantomSession {
  appKeyPairSecret: string; // Base58 ephemeral X25519 secret key
  phantomEncryptionPublicKey?: string;
  sessionToken?: string;
  userPublicKey?: string;
}

/**
 * Generates an ephemeral X25519 keypair for app-to-wallet encryption.
 */
export function generateEphemeralKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: bs58.encode(keyPair.publicKey),
    secretKey: bs58.encode(keyPair.secretKey),
  };
}

/**
 * Constructs the Phantom connection deep link URL.
 */
export function buildConnectUrl(appEncryptionPublicKey: string): string {
  const appUrl = 'https://hypeoracle.xyz';
  const redirectLink = 'exp+hypeoracle-mobile://phantomConnect';

  const params = [
    `app_url=${encodeURIComponent(appUrl)}`,
    `dapp_encryption_public_key=${encodeURIComponent(appEncryptionPublicKey)}`,
    `redirect_link=${encodeURIComponent(redirectLink)}`
  ].join('&');

  return `https://phantom.app/ul/v1/connect?${params}`;
}

/**
 * Decrypts the callback response payload returned by Phantom.
 */
export function decryptPhantomResponse(
  dataBase58: string,
  nonceBase58: string,
  phantomPublicKeyBase58: string,
  dappSecretKeyBase58: string
): { public_key: string; session: string } {
  try {
    const sharedSecret = nacl.box.before(
      bs58.decode(phantomPublicKeyBase58),
      bs58.decode(dappSecretKeyBase58)
    );

    const decrypted = nacl.box.open.after(
      bs58.decode(dataBase58),
      bs58.decode(nonceBase58),
      sharedSecret
    );

    if (!decrypted) {
      throw new Error('Failed to decrypt response payload (invalid decryption result).');
    }

    // Convert Uint8Array to string safely without TextDecoder dependencies
    let decryptedStr = '';
    for (let i = 0; i < decrypted.length; i++) {
      decryptedStr += String.fromCharCode(decrypted[i]);
    }

    return JSON.parse(decryptedStr);
  } catch (error: any) {
    console.error('[Phantom] Decryption error:', error);
    throw new Error(`Phantom connection decrypt failed: ${error.message || error}`);
  }
}
