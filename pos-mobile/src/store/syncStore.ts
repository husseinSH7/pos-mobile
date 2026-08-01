import { create } from 'zustand';
import { getSyncStatus, type SyncStatus } from '../services/database';
import { isOnline } from '../services/network';
import { getSyncService, type SyncProgress } from '../services/sync';

interface SyncState {
  syncStatus: SyncStatus | null;
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncResult: any | null;
  
  loadSyncStatus: () => Promise<void>;
  refreshOnlineStatus: () => Promise<void>;
  startSync: () => Promise<any>;
  toggleAutoSync: (enabled: boolean) => void;
  setSyncProgress: (progress: SyncProgress | null) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  syncStatus: null,
  isOnline: true,
  isSyncing: false,
  syncProgress: null,
  lastSyncResult: null,

  loadSyncStatus: async () => {
    try {
      const status = await getSyncStatus();
      const online = isOnline();
      set({
        syncStatus: status,
        isOnline: online
      });
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  },

  refreshOnlineStatus: async () => {
    const online = isOnline();
    set({ isOnline: online });
  },

  startSync: async () => {
    const syncService = getSyncService();
    
    if (syncService.isCurrentlySyncing()) {
      return { success: false, error: 'Sync already in progress' };
    }

    set({ isSyncing: true, syncProgress: null });

    // Add progress listener
    const unsubscribe = syncService.addProgressListener((progress) => {
      set({ syncProgress: progress });
    });

    try {
      const result = await syncService.sync();
      set({ 
        lastSyncResult: result,
        syncProgress: { current: 3, total: 3, stage: 'complete' }
      });
      
      // Reload sync status after sync
      await get().loadSyncStatus();
      
      return result;
    } finally {
      set({ isSyncing: false });
      unsubscribe();
    }
  },

  toggleAutoSync: (enabled: boolean) => {
    const syncService = getSyncService();
    syncService.setAutoSync(enabled);
  },

  setSyncProgress: (progress: SyncProgress | null) => {
    set({ syncProgress: progress });
  },
}));