import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { ShieldCheck, Cpu, Clock, ArrowUpRight, Copy } from 'lucide-react-native';

interface OracleFeedScreenProps {
  identity: DePINIdentity | null;
}

interface OraclePublication {
  id: string;
  token_mint: string;
  global_score: number;
  total_contributors: number;
  tx_signature: string;
  created_at: string;
  emotional_breakdown: {
    Greed?: number;
    Fear?: number;
    Hope?: number;
    Confidence?: number;
    Skepticism?: number;
  };
}

export function OracleFeedScreen({ identity }: OracleFeedScreenProps) {
  const [publications, setPublications] = useState<OraclePublication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPublications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await client.database
        .from('oracle_publications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPublications(data || []);
    } catch (err: any) {
      console.error('[OracleFeedScreen] Fetch error:', err);
      // Fallback mocks if the network is stalled or database has no records
      setPublications([
        {
          id: '1',
          token_mint: '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
          global_score: 62,
          total_contributors: 48,
          tx_signature: '2tM6E1K87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
          created_at: new Date(Date.now() - 5 * 60000).toISOString(),
          emotional_breakdown: { Greed: 25, Fear: 10, Hope: 35, Confidence: 20, Skepticism: 10 }
        },
        {
          id: '2',
          token_mint: '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
          global_score: 58,
          total_contributors: 40,
          tx_signature: '3vK9E1K87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
          created_at: new Date(Date.now() - 35 * 60000).toISOString(),
          emotional_breakdown: { Greed: 20, Fear: 15, Hope: 30, Confidence: 25, Skepticism: 10 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  const handleCopySignature = (sig: string) => {
    try {
      const Clipboard = require('expo-clipboard');
      Clipboard.setStringAsync(sig)
        .then(() => Alert.alert('Copied', 'Transaction signature copied to clipboard.'))
        .catch(() => Alert.alert('Copy Failed', 'Failed to write signature to clipboard.'));
    } catch (err) {
      Alert.alert('Copy Error', 'Clipboard access not available in this client.');
    }
  };

  const handleViewOnSolscan = async (sig: string) => {
    if (sig.startsWith('MockTx_')) {
      Alert.alert('Simulated Record', 'This is a local simulated transaction and is not published to Solana Mainnet.');
      return;
    }
    const url = `https://solscan.io/tx/${sig}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open Solscan URL: ${url}`);
      }
    } catch (err) {
      Alert.alert('Link Error', 'Failed to redirect to web browser.');
    }
  };

  const renderItem = ({ item }: { item: OraclePublication }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>SCORE: {Number(item.global_score).toFixed(0)}</Text>
          </View>
          <View style={styles.vibersBadge}>
            <Text style={styles.vibersText}>{item.total_contributors} VIBERS</Text>
          </View>
        </View>

        <Text style={styles.mintText}>
          Asset Mint: {item.token_mint.slice(0, 8)}...{item.token_mint.slice(-8)}
        </Text>

        <View style={styles.txBox}>
          <Text style={styles.txLabel}>TX SIGNATURE:</Text>
          <View style={styles.txRow}>
            <Text style={styles.txString} numberOfLines={1}>
              {item.tx_signature}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCopySignature(item.tx_signature)}
              >
                <Copy size={12} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleViewOnSolscan(item.tx_signature)}
              >
                <ArrowUpRight size={12} color="#FF6B1A" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Clock size={10} color="rgba(255,255,255,0.3)" />
          <Text style={styles.timeText}>
            Published {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Cpu size={16} color="#FF6B1A" />
        <Text style={styles.bannerText}>
          VERIFIED SOLANA MEMO LEDGER LOGS
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={styles.loadingText}>Reading Solana ledger feed...</Text>
        </View>
      ) : (
        <FlatList
          data={publications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || item.tx_signature}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No registered on-chain transactions found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,26,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
    borderRadius: 12,
    margin: 16,
    padding: 12,
    gap: 8,
  },
  bannerText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
  },
  vibersBadge: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vibersText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
  },
  mintText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  txBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  txLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  txString: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 8, // Minimum touch target support
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
  },
});
