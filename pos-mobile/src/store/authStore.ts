import { create } from "zustand";
import { setAuthToken } from "../services/api";
import { initializeWebSocket, disconnectWebSocket } from "../services/websocket";
import { useRealtimeStore } from "./realtimeStore";
import { initializeNetworkMonitoring } from "../services/network";
import { secureStorage } from "../services/secureStorage";
import { registerForPushNotificationsAsync } from "../services/notifications";

export interface User {
  id: string;
  name: string;
  role: "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN";
  restaurantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  login: async (user, token, refreshToken) => {
    setAuthToken(token);
    
    // Save tokens to secure storage
    await secureStorage.saveTokens(token, refreshToken || '');
    await secureStorage.saveUser(user);
    await secureStorage.saveRestaurantId(user.restaurantId);
    
    // Register for push notifications
    const pushToken = await registerForPushNotificationsAsync();
    if (pushToken) {
      // TODO: Send push token to backend
      console.log('Push token registered:', pushToken);
    }
    
    // Initialize WebSocket connection
    initializeWebSocket(token);
    
    // Connect realtime store
    useRealtimeStore.getState().connect();

    // Initialize network monitoring
    initializeNetworkMonitoring();

    set({
      user,
      token,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    setAuthToken(null);
    
    // Clear secure storage
    await secureStorage.clearAll();
    
    // Disconnect WebSocket
    disconnectWebSocket();
    
    // Disconnect realtime store
    useRealtimeStore.getState().disconnect();

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  initializeAuth: async () => {
    try {
      const token = await secureStorage.getAccessToken();
      const refreshToken = await secureStorage.getRefreshToken();
      const user = await secureStorage.getUser();
      const restaurantId = await secureStorage.getRestaurantId();

      if (token && user) {
        setAuthToken(token);
        
        // Register for push notifications
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          // TODO: Send push token to backend
          console.log('Push token registered:', pushToken);
        }
        
        // Initialize WebSocket connection
        initializeWebSocket(token);
        
        // Connect realtime store
        useRealtimeStore.getState().connect();

        // Initialize network monitoring
        initializeNetworkMonitoring();

        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  },
}));