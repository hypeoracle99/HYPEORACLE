import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import * as Audio from 'expo-audio';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { Accelerometer } from 'expo-sensors';
import { DePINIdentity } from '../lib/secure-store';
import { signSensorTelemetry } from '../lib/sensor-signing';
import { client, INSFORGE_CONFIG } from '../lib/insforge';
import { Mic, Circle, Square, Zap, HelpCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SHAKE_THRESHOLD = 2.0; // 2.0g calibrated baseline

interface RecordScreenProps {
  identity: DePINIdentity | null;
  onVibeSubmitted: () => void;
}

export function RecordScreen({ identity, onVibeSubmitted }: RecordScreenProps) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 100);
  const isRecording = recorderState.isRecording;
  const [submitting, setSubmitting] = useState(false);
  const [lastVibeScore, setLastVibeScore] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('TAP TO RECORD VIBE');

  // Live Telemetry states
  const [liveVolume, setLiveVolume] = useState(0); // 0-1 scale
  const [liveMotion, setLiveMotion] = useState(1.0); // g-force magnitude
  const [maxVolume, setMaxVolume] = useState(0);
  const [maxMotion, setMaxMotion] = useState(1.0);

  // Dynamic waveform bars
  const [waveBars, setWaveBars] = useState<number[]>(Array(18).fill(4));

  // Capture aggregates
  const sampleCount = useRef(0);
  const totalVolume = useRef(0);
  const totalMotion = useRef(0);
  const motionSubscription = useRef<any>(null);

  useEffect(() => {
    // Request microphone permissions on startup
    Audio.requestRecordingPermissionsAsync();
    
    return () => {
      // Cleanup subscriptions on unmount
      if (motionSubscription.current) {
        motionSubscription.current.remove();
      }
    };
  }, []);

  // Sync metering values with state for live volume and visual waveform
  useEffect(() => {
    if (recorderState.isRecording && recorderState.metering !== undefined && recorderState.metering !== null) {
      const metering = recorderState.metering;
      const normalizedVol = Math.max(0, (metering + 160) / 160);
      setLiveVolume(normalizedVol);
      totalVolume.current += normalizedVol;
      setMaxVolume(prev => Math.max(prev, normalizedVol));

      // update visual neon waveform bars dynamically
      setWaveBars(prev => {
        const next = [...prev];
        next.shift();
        next.push(Math.max(4, normalizedVol * 45));
        return next;
      });
    }
  }, [recorderState.isRecording, recorderState.metering]);

  // Set up accelerometer telemetry capture
  const startAccelerometer = () => {
    sampleCount.current = 0;
    totalVolume.current = 0;
    totalMotion.current = 0;
    setMaxVolume(0);
    setMaxMotion(1.0);
    
    Accelerometer.setUpdateInterval(100);
    
    motionSubscription.current = Accelerometer.addListener(data => {
      // Calculate overall physical magnitude
      const mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      setLiveMotion(mag);
      
      sampleCount.current += 1;
      totalMotion.current += mag;
      
      setMaxMotion(prev => Math.max(prev, mag));
    });
  };

  const stopAccelerometer = () => {
    if (motionSubscription.current) {
      motionSubscription.current.remove();
      motionSubscription.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Microphone access is required to record vibes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      await audioRecorder.record();

      setStatusText('RECORDING ACTIVE — SPEAK OR SHAKE');
      
      // Start accelerometer DePIN telemetry
      startAccelerometer();
    } catch (err: any) {
      console.error('[Mic Recorder] Start failure:', err);
      Alert.alert('Microphone Error', 'Failed to initialize audio capture node.');
    }
  };

  const stopAndSubmit = async () => {
    if (!recorderState.isRecording || !identity) return;

    setStatusText('COMPILING CRYPTOGRAPHIC SIGNATURE...');
    setSubmitting(true);

    try {
      // 1. Terminate native sensory listeners
      stopAccelerometer();
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error('sensory payload uri empty');

      // Calculate calibrated averages
      const avgVol = totalVolume.current / (sampleCount.current || 1);
      const avgMotion = totalMotion.current / (sampleCount.current || 1);

      // Map dynamic emoji sentiment based on combined sensory score
      const compoundScore = (avgVol * 0.5) + (avgMotion * 0.5);
      const emoji = compoundScore > 0.6 ? '🔥' : compoundScore > 0.35 ? '🚀' : '🐂';

      // 2. Cryptographic Telemetry Signature (Anti-Spoofing)
      const timestamp = Date.now();
      const signedMetadata = signSensorTelemetry(
        identity,
        avgVol,
        maxMotion,
        'verified_mobile_sensors',
        sampleCount.current,
        timestamp
      );

      // 3. Formulate raw DePIN submission payload
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // Convert local audio URI to a standard Blob for Web compatibility
        const audioRes = await fetch(uri);
        const audioBlob = await audioRes.blob();
        formData.append('voice', audioBlob, 'depin-sensor-oracle.m4a');
      } else {
        // Native mobile expects React Native's custom FormData object format for files
        formData.append('voice', {
          uri: uri,
          name: 'depin-sensor-oracle.m4a',
          type: 'audio/m4a',
        } as any);
      }
      formData.append('emoji', emoji);
      formData.append('token_mint', 'So11111111111111111111111111111111111111112'); // Mock SOL mint
      formData.append('user_pubkey', identity.publicKey);
      formData.append('sensor_data', JSON.stringify(signedMetadata));

      // 4. Secure submission using XMLHttpRequest to avoid native fetch FormDataPart errors in React Native 0.85
      const responseText = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://9s8ct2b5.functions.insforge.app/submit-vibe');
        xhr.setRequestHeader('Authorization', `Bearer ${INSFORGE_CONFIG.anonKey}`);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Server returned status code ${xhr.status}: ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network request failed'));
        };
        
        xhr.send(formData);
      });

      let resJson: any = {};
      try {
        resJson = JSON.parse(responseText);
      } catch {
        resJson = { error: responseText };
      }

      if (resJson.error) {
        throw new Error(resJson.error || 'Server validation failed.');
      }

      if (resJson.vibeScore !== undefined) {
        setLastVibeScore(resJson.vibeScore);
      }

      Alert.alert('Sensory Vibe Logged!', `Calibrated Score: ${resJson.vibeScore || 50}\nMultiplier boost applied.`);
      onVibeSubmitted();
    } catch (err: any) {
      console.error('[RecordScreen] Submission aborted:', err);
      Alert.alert('Verification Failed', err.message || 'Telemetry transmission stalled. Re-syncing node.');
    } finally {
      setSubmitting(false);
      setStatusText('TAP TO RECORD VIBE');
      setLiveVolume(0);
      setLiveMotion(1.0);
      setWaveBars(Array(18).fill(4));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.telemetryPanel}>
        <Text style={styles.panelTitle}>DEPIN SENSOR TELEMETRY</Text>
        
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryMetric}>
            <Text style={styles.metricLabel}>LIVE VOLUME</Text>
            <Text style={styles.metricValue}>{(liveVolume * 100).toFixed(0)}%</Text>
          </View>
          
          <View style={styles.telemetryMetric}>
            <Text style={styles.metricLabel}>LIVE MOTION</Text>
            <Text style={[styles.metricValue, liveMotion >= SHAKE_THRESHOLD && styles.highlightValue]}>
              {liveMotion.toFixed(2)}g
            </Text>
          </View>
        </View>
      </View>

      {/* dynamic Dynamic Waveform visualizer */}
      <View style={styles.waveformContainer}>
        {waveBars.map((barHeight, idx) => (
          <View
            key={idx}
            style={[
              styles.waveBar,
              {
                height: barHeight,
                backgroundColor: isRecording 
                  ? (liveMotion >= SHAKE_THRESHOLD ? '#fbbf24' : '#FF6B1A') 
                  : 'rgba(255,255,255,0.06)',
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.statusLabel}>{statusText}</Text>

      {/* Primary Record Button in Thumb Zone */}
      <View style={styles.controlCenter}>
        {submitting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B1A" />
            <Text style={styles.signingText}>SIGNING PAYLOAD...</Text>
          </View>
        ) : isRecording ? (
          <TouchableOpacity
            style={[styles.recordButton, styles.recordingActive, { width: 88, height: 88 }]}
            onPress={stopAndSubmit}
          >
            <Square size={28} color="#050507" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.recordButton, { width: 88, height: 88 }]}
            onPress={startRecording}
          >
            <Mic size={32} color="#050507" />
          </TouchableOpacity>
        )}
      </View>

      {lastVibeScore !== null && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>LAST SYNTAX SCORE</Text>
          <Text style={styles.scoreVal}>{lastVibeScore}</Text>
          <View style={styles.boostBadge}>
            <Zap size={10} color="#fbbf24" />
            <Text style={styles.boostText}>CALIBRATED STAKER MULTIPLIER ACTIVE</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  telemetryPanel: {
    width: width - 32,
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  panelTitle: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  telemetryMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#06b6d4',
  },
  highlightValue: {
    color: '#fbbf24',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    width: width - 64,
    gap: 6,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
    minHeight: 4,
  },
  statusLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginVertical: 12,
  },
  controlCenter: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16, // Natural thumb reach layout
  },
  recordButton: {
    backgroundColor: '#FF6B1A',
    borderRadius: 44, // Perfectly rounded touch trigger (minimum 44pt/48dp)
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  recordingActive: {
    backgroundColor: '#fbbf24',
    shadowColor: '#fbbf24',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  signingText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#FF6B1A',
    letterSpacing: 1.5,
  },
  scoreCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
    borderRadius: 16,
    padding: 16,
    width: width - 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreVal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B1A',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 8,
  },
  boostText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
});
