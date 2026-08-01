import { create } from "zustand";
import { setAuthToken } from "../services/api";
import { initializeWebSocket, disconnectWebSocket } from "../services/websocket";
import { useRealtimeStore } from "./realtimeStore";
import { initializeNetworkMonitoring } from "../services/network";

export interface User {
  id: string;
  name: string;
  role: "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN";
  restaurantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    setAuthToken(token);
    
    // Initialize WebSocket connection
    initializeWebSocket(token);
    
    // Connect realtime store
    useRealtimeStore.getState().connect();

    // Initialize network monitoring
    initializeNetworkMonitoring();

    set({
      user,
      token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    setAuthToken(null);
    
    // Disconnect WebSocket
    disconnectWebSocket();
    
    // Disconnect realtime store
    useRealtimeStore.getState().disconnect();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));