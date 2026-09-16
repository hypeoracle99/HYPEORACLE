/**
 * HypeOracle DePIN Contribution & Sensor Interface
 * 
 * Modular architectural interface allowing verified physical emotion and ambient
 * hardware/sensor nodes to contribute data into the community reputation & quest system.
 */

export interface DePINNodeInfo {
  nodeId: string;
  nodeType: 'browser_pwa_sensor' | 'mobile_audio_stream' | 'ambient_hardware_rig';
  ownerPubkey: string;
  status: 'active' | 'standby' | 'degraded';
  firmwareOrVersion: string;
  reputationScore: number;
  dataPointsContributed: number;
  lastHeartbeat: string;
}

export interface DePINReadingPayload {
  nodeId: string;
  timestamp: number;
  sensorType: 'mic_volume_frequency' | 'accelerometer_energy' | 'ambient_noise_db' | 'collective_vibe';
  metrics: {
    energyLevel: number; // 0 to 100
    frequencyPeakHz?: number;
    motionIntensity?: number;
    rawSampleCount?: number;
  };
  signature?: string; // Optional cryptographic signature from edge node
}

export interface DePINVerificationResult {
  isValid: boolean;
  scoreAwarded: number;
  anomalyDetected: boolean;
  rejectionReason?: string;
}

/**
 * Abstract Provider Interface
 * Implementations can plug into physical hardware (Helium, Solana Mobile, custom IoT)
 * without touching quest or community logic.
 */
export interface DePINProvider {
  getProviderName(): string;
  isLive(): boolean;
  verifyContribution(payload: DePINReadingPayload): Promise<DePINVerificationResult>;
  registerNode(pubkey: string, deviceType: string): Promise<DePINNodeInfo>;
  getNodeStats(nodeId: string): Promise<DePINNodeInfo | null>;
}

/**
 * Standard HypeOracle Browser Sensor Adapter (Current Implementation)
 * Integrates Web Audio and DeviceMotionEvent captured in PWA recorder.
 */
export class BrowserSensorDePINAdapter implements DePINProvider {
  private providerName = "HypeOracle PWA Emotional Sensor Node";

  getProviderName(): string {
    return this.providerName;
  }

  isLive(): boolean {
    // Current live capability: PWA browser sensor stream
    return true;
  }

  async verifyContribution(payload: DePINReadingPayload): Promise<DePINVerificationResult> {
    // Basic anti-spam validation on live mobile sensor stream
    if (!payload.metrics || payload.metrics.energyLevel < 0 || payload.metrics.energyLevel > 100) {
      return {
        isValid: false,
        scoreAwarded: 0,
        anomalyDetected: true,
        rejectionReason: "Sensor metric reading out of permissible bounds (0-100)."
      };
    }

    // Reward points scaled by legitimate physical energy reading
    const score = Math.round(payload.metrics.energyLevel * 0.5) + 10;
    return {
      isValid: true,
      scoreAwarded: score,
      anomalyDetected: false
    };
  }

  async registerNode(pubkey: string, deviceType: string): Promise<DePINNodeInfo> {
    return {
      nodeId: `node_pwa_${pubkey.slice(0, 6)}_${Date.now().toString(36)}`,
      nodeType: 'browser_pwa_sensor',
      ownerPubkey: pubkey,
      status: 'active',
      firmwareOrVersion: 'v1.2.0-pwa',
      reputationScore: 100,
      dataPointsContributed: 1,
      lastHeartbeat: new Date().toISOString()
    };
  }

  async getNodeStats(nodeId: string): Promise<DePINNodeInfo | null> {
    return null;
  }
}

/**
 * Hardware Dedicated DePIN Adapter (Interface Stub for future physical devices)
 */
export class ExternalHardwareDePINAdapter implements DePINProvider {
  getProviderName(): string {
    return "HypeOracle Physical Hardware Rig (Planned v2)";
  }

  isLive(): boolean {
    // Declares clearly that physical hardware nodes are scheduled for future rollout
    return false;
  }

  async verifyContribution(): Promise<DePINVerificationResult> {
    return {
      isValid: false,
      scoreAwarded: 0,
      anomalyDetected: false,
      rejectionReason: "External hardware provider bridge not yet connected to physical oracle nodes."
    };
  }

  async registerNode(): Promise<DePINNodeInfo> {
    throw new Error("External hardware registration offline. Connect PWA sensor node instead.");
  }

  async getNodeStats(): Promise<DePINNodeInfo | null> {
    return null;
  }
}

export const activeDePINAdapter = new BrowserSensorDePINAdapter();
