import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Polyfill PRNG for tweetnacl in React Native environment where global.crypto is missing
nacl.setPRNG((x, n) => {
  for (let i = 0; i < n; i++) {
    x[i] = Math.floor(Math.random() * 256) ^ (Date.now() & 0xff) ^ (i & 0xff);
  }
});

const KEYPAIR_STORAGE_KEY = 'hypeoracle_depin_secret_key';

export interface DePINIdentity {
  publicKey: string;
  secretKey: string;
  rawPublicKey: Uint8Array;
  rawSecretKey: Uint8Array;
  isExternal?: boolean;
}

/**
 * Retrieves the active staker's DePIN keypair from SecureStore or provisions a new one.
 */
export async function getOrCreateDePINKeypair(): Promise<DePINIdentity> {
  try {
    const savedSecret = await SecureStore.getItemAsync(KEYPAIR_STORAGE_KEY);
    
    if (savedSecret) {
      const rawSecretKey = bs58.decode(savedSecret);
      const keypair = nacl.sign.keyPair.fromSecretKey(rawSecretKey);
      
      return {
        publicKey: bs58.encode(keypair.publicKey),
        secretKey: savedSecret,
        rawPublicKey: keypair.publicKey,
        rawSecretKey: keypair.secretKey,
      };
    }
    
    // Create new Ed25519 keypair
    const newKeypair = nacl.sign.keyPair();
    const encodedSecret = bs58.encode(newKeypair.secretKey);
    
    await SecureStore.setItemAsync(KEYPAIR_STORAGE_KEY, encodedSecret);
    
    return {
      publicKey: bs58.encode(newKeypair.publicKey),
      secretKey: encodedSecret,
      rawPublicKey: newKeypair.publicKey,
      rawSecretKey: newKeypair.secretKey,
    };
  } catch (error) {
    console.error('[SecureStore] Failed to retrieve/create DePIN keypair:', error);
    throw error;
  }
}

/**
 * Resets/Overwrites the active keypair with a custom private key string.
 */
export async function importPrivateWalletKey(base58Key: string): Promise<DePINIdentity> {
  try {
    const rawSecretKey = bs58.decode(base58Key);
    
    // Validate key length (Solana raw private keys are 64 bytes)
    if (rawSecretKey.length !== 64) {
      throw new Error('Invalid key length. Private keys must be 64 bytes raw (base58 encoded).');
    }
    
    const keypair = nacl.sign.keyPair.fromSecretKey(rawSecretKey);
    await SecureStore.setItemAsync(KEYPAIR_STORAGE_KEY, base58Key);
    
    return {
      publicKey: bs58.encode(keypair.publicKey),
      secretKey: base58Key,
      rawPublicKey: keypair.publicKey,
      rawSecretKey: keypair.secretKey,
    };
  } catch (error) {
    console.error('[SecureStore] Failed to import keypair:', error);
    throw error;
  }
}

/**
 * Deletes the stored keypair from SecureStore.
 */
export async function clearStoredDePINKeypair(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYPAIR_STORAGE_KEY);
  } catch (error) {
    console.error('[SecureStore] Failed to delete DePIN keypair:', error);
    throw error;
  }
}
