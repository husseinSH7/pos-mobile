import { create } from 'zustand';
import { api } from '../services/api';

interface Shift {
  id: string;
  restaurantId: string;
  userId: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string | null;
  openingCash?: number | null;
  closingCash?: number | null;
  notes?: string | null;
  user?: {
    fullName: string;
    role: string;
  };
  summary?: {
    totalSales: number;
    totalCash: number;
    totalCard: number;
    transactionCount?: number;
    expectedCash?: number;
    actualCash?: number;
    variance?: number;
  };
}

interface ShiftState {
  currentShift: Shift | null;
  shiftHistory: Shift[];
  isLoading: boolean;
  error: string | null;
  
  openShift: (openingCash?: number, notes?: string) => Promise<void>;
  closeShift: (shiftId: string, closingCash: number, notes?: string) => Promise<void>;
  getCurrentShift: () => Promise<void>;
  getShiftHistory: (userId?: string) => Promise<void>;
  clearCurrentShift: () => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  shiftHistory: [],
  isLoading: false,
  error: null,

  openShift: async (openingCash?: number, notes?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/shifts/open', {
        openingCash,
        notes,
      });
      set({ currentShift: response.data, error: null });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to open shift';
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  closeShift: async (shiftId: string, closingCash: number, notes?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/shifts/${shiftId}/close`, {
        closingCash,
        notes,
      });
      set({ currentShift: null, error: null });
      // Refresh history after closing
      await get().getShiftHistory();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to close shift';
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  getCurrentShift: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/shifts/current');
      set({ currentShift: response.data, error: null });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to fetch current shift';
      // 404 is expected if no shift is open
      if (error?.response?.status !== 404) {
        set({ error: message });
      }
      set({ currentShift: null });
    } finally {
      set({ isLoading: false });
    }
  },

  getShiftHistory: async (userId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = userId ? { userId } : {};
      const response = await api.get('/shifts/history', { params });
      set({ shiftHistory: response.data, error: null });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to fetch shift history';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearCurrentShift: () => {
    set({ currentShift: null });
  },
}));