import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getOrCreateDePINKeypair, importPrivateWalletKey, DePINIdentity } from './src/lib/secure-store';
import { RecordScreen } from './src/screens/RecordScreen';
import { PredictScreen } from './src/screens/PredictScreen';
import { SoulprintScreen } from './src/screens/SoulprintScreen';
import { Mic, TrendingUp, Award, Settings, Key, ShieldCheck, X } from 'lucide-react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'record' | 'predict' | 'soulprint'>('record');
  const [identity, setIdentity] = useState<DePINIdentity | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  
  // Settings / Key Import modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importedKey, setImportedKey] = useState('');
  const [importing, setImporting] = useState(false);

  const loadIdentity = async () => {
    setLoadingIdentity(true);
    try {
      const depinId = await getOrCreateDePINKeypair();
      setIdentity(depinId);
    } catch (err) {
      console.error('[App] Failed to load DePIN staker identity:', err);
    } finally {
      setLoadingIdentity(false);
    }
  };

  useEffect(() => {
    loadIdentity();
  }, []);

  const handleImportKey = async () => {
    if (!importedKey.trim()) return;
    setImporting(true);
    try {
      const imported = await importPrivateWalletKey(importedKey.trim());
      setIdentity(imported);
      Alert.alert('Identity Provisioned', 'Your Solana staker keypair has been secure-cached in Keychain.');
      setImportedKey('');
      setSettingsOpen(false);
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Check your private key formatting (base58 raw secret key expected).');
    } finally {
      setImporting(false);
    }
  };

  // Callback to trigger profile reload on vibe submissions
  const handleVibeSubmitted = () => {
    console.log('[App] Sensory Vibe sync complete.');
  };

  return (
    <SafeAreaView style={styles.safeBg}>
      <StatusBar barStyle="light-content" backgroundColor="#050507" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.headerTitle}>HYPEORACLE</Text>
          <Text style={styles.headerSub}>DEPIN SENSOR CLIENT</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsBtn}
          onPress={() => setSettingsOpen(true)}
        >
          <Settings size={20} color="#FF6B1A" />
        </TouchableOpacity>
      </View>

      {/* Main Screen views container */}
      <View style={styles.contentView}>
        {loadingIdentity ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6B1A" />
            <Text style={styles.loadingText}>Unlocking Secure Keychain...</Text>
          </View>
        ) : activeTab === 'record' ? (
          <RecordScreen identity={identity} onVibeSubmitted={handleVibeSubmitted} />
        ) : activeTab === 'predict' ? (
          <PredictScreen identity={identity} />
        ) : (
          <SoulprintScreen identity={identity} />
        )}
      </View>

      {/* Cyberpunk custom Bottom Tab Navigation in Thumb Zone */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'record' && styles.activeTabItem]}
          onPress={() => setActiveTab('record')}
        >
          <Mic size={20} color={activeTab === 'record' ? '#FF6B1A' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'record' && styles.activeTabLabel]}>
            RECORD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'predict' && styles.activeTabItem]}
          onPress={() => setActiveTab('predict')}
        >
          <TrendingUp size={20} color={activeTab === 'predict' ? '#06b6d4' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'predict' && styles.activeTabLabel]}>
            PREDICT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'soulprint' && styles.activeTabItem]}
          onPress={() => setActiveTab('soulprint')}
        >
          <Award size={20} color={activeTab === 'soulprint' ? '#fbbf24' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'soulprint' && styles.activeTabLabel]}>
            SOULPRINT
          </Text>
        </TouchableOpacity>
      </View>

      {/* Node settings and key importer modal */}
      <Modal
        visible={settingsOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>NODE IDENTITY CONFIG</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}>
                <X size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {identity && (
              <View style={styles.activeKeyBox}>
                <View style={styles.keyHeader}>
                  <ShieldCheck size={14} color="#10b981" />
                  <Text style={styles.keyHeaderText}>SECURE KEYCHAIN ACTIVE ID</Text>
                </View>
                <Text style={styles.keyString}>{identity.publicKey}</Text>
              </View>
            )}

            <View style={styles.importerBox}>
              <View style={styles.importerTitleRow}>
                <Key size={14} color="#FF6B1A" />
                <Text style={styles.importerTitleText}>IMPORT EXISTING SOLANA KEY</Text>
              </View>
              <Text style={styles.importerSub}>
                Paste your raw Base58 secret key (64 bytes) to synchronize your dynamic level on-chain:
              </Text>
              <TextInput
                style={styles.keyInput}
                secureTextEntry={true}
                value={importedKey}
                onChangeText={setImportedKey}
                placeholder="Paste raw Base58 Solana private key..."
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
              
              <TouchableOpacity
                style={styles.importBtn}
                onPress={handleImportKey}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator size="small" color="#050507" />
                ) : (
                  <Text style={styles.importBtnText}>PROVISION NODE IDENTITY</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeBg: {
    flex: 1,
    backgroundColor: '#050507',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
  },
  titleGroup: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,26,0.05)',
  },
  contentView: {
    flex: 1,
    backgroundColor: '#050507',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 12,
  },
  tabBar: {
    height: 68,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeTabItem: {
    borderTopWidth: 2,
    borderTopColor: '#FF6B1A',
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  activeTabLabel: {
    color: '#fff',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)',
    borderRadius: 24,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1.5,
  },
  activeKeyBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  keyHeaderText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 1,
  },
  keyString: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 15,
  },
  importerBox: {
    marginTop: 8,
  },
  importerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  importerTitleText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1.5,
  },
  importerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    marginBottom: 16,
  },
  keyInput: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    height: 48, // Minimum touch targets compliance
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  importBtn: {
    backgroundColor: '#FF6B1A',
    height: 48, // Touch target compliance
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 1.5,
  },
});
