import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSyncStore } from '../store/syncStore';
import { COLORS } from '../utils/colors';

export default function SyncStatusIndicator() {
  const { syncStatus, isOnline, isSyncing, syncProgress, startSync } = useSyncStore();

  const handleSync = async () => {
    if (!isSyncing) {
      await startSync();
    }
  };

  if (!syncStatus) return null;

  const pendingOrders = syncStatus.pendingOrders || 0;
  const hasPendingData = pendingOrders > 0;

  return (
    <View style={[
      styles.container,
      !isOnline && styles.offline,
      hasPendingData && styles.hasPending
    ]}>
      <View style={styles.statusRow}>
        <View style={[
          styles.statusDot,
          isOnline ? styles.online : styles.offlineDot
        ]} />
        <Text style={[
          styles.statusText,
          !isOnline && styles.offlineText
        ]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
        
        {hasPendingData && (
          <Text style={styles.pendingText}>
            ({pendingOrders} pending)
          </Text>
        )}
      </View>

      {isSyncing && syncProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Syncing {syncProgress.stage}... ({syncProgress.current}/{syncProgress.total})
          </Text>
        </View>
      )}

      {(hasPendingData || !isOnline) && !isSyncing && (
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={handleSync}
        >
          <Text style={styles.syncButtonText}>
            {isOnline ? 'Sync Now' : 'Retry'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  offline: {
    backgroundColor: '#FEF2F2',
  },
  hasPending: {
    backgroundColor: '#FFF7ED',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  offlineText: {
    color: '#EF4444',
  },
  pendingText: {
    fontSize: 12,
    color: '#F97316',
    marginLeft: 4,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
});