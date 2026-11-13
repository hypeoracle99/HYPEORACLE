import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric Security Engine for HypeOracle Mobile
 * Guards private key export, seed phrases, and high-value wallet operations.
 */

export async function checkBiometricsAvailable(): Promise<{ hasHardware: boolean; isEnrolled: boolean }> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return { hasHardware, isEnrolled };
  } catch (err) {
    console.warn('[Biometrics] Availability check error:', err);
    return { hasHardware: false, isEnrolled: false };
  }
}

export async function authenticateWithBiometrics(
  reason = 'Verify your identity to access secured Solana credentials'
): Promise<boolean> {
  try {
    const { hasHardware, isEnrolled } = await checkBiometricsAvailable();

    // If hardware is not present or user has no biometrics set up, allow PIN or proceed
    if (!hasHardware || !isEnrolled) {
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Device PIN / Password',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch (err) {
    console.warn('[Biometrics] Authentication prompt failed:', err);
    return false;
  }
}

