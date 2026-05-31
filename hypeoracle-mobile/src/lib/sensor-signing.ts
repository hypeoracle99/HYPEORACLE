import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { DePINIdentity } from './secure-store';

export interface SignedTelemetry {
  avg_volume: number;
  accel_magnitude: number;
  device_status: string;
  sample_count: number;
  timestamp: number;
  sensor_pubkey: string;
  sensor_signature: string;
}

/**
 * Encodes a string into a Uint8Array. Safe for all React Native environments.
 */
function stringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

/**
 * Sign sensor telemetry cryptographically to prevent spoofing.
 */
export function signSensorTelemetry(
  identity: DePINIdentity,
  avgVolume: number,
  accelMagnitude: number,
  deviceStatus: string,
  sampleCount: number,
  timestamp: number
): SignedTelemetry {
  // format strict telemetry message string
  const message = `HypeOracleSensorySync:${timestamp}:${accelMagnitude.toFixed(4)}:${avgVolume.toFixed(4)}`;
  const messageBytes = stringToUint8Array(message);
  
  // sign using staker keypair
  const signatureBytes = nacl.sign.detached(messageBytes, identity.rawSecretKey);
  const signatureString = bs58.encode(signatureBytes);
  
  return {
    avg_volume: parseFloat(avgVolume.toFixed(4)),
    accel_magnitude: parseFloat(accelMagnitude.toFixed(4)),
    device_status: deviceStatus,
    sample_count: sampleCount,
    timestamp: timestamp,
    sensor_pubkey: identity.publicKey,
    sensor_signature: signatureString,
  };
}
