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
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  login: async (user, token, refreshToken) => {
    // Set the auth token for API requests immediately
    setAuthToken(token);

    // Side effects – web/native differences are caught here to avoid blocking login
    try {
      await secureStorage.saveTokens(token, refreshToken || '');
      await secureStorage.saveUser(user);
      await secureStorage.saveRestaurantId(user.restaurantId);
    } catch (error) {
      console.warn("secureStorage failed (likely web):", error);
    }

    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        console.log("Push token registered:", pushToken);
        // TODO: Send push token to backend
      }
    } catch (error) {
      console.warn("Push notifications failed:", error);
    }

    try {
      initializeWebSocket(token);
      useRealtimeStore.getState().connect();
    } catch (error) {
      console.warn("WebSocket initialization failed:", error);
    }

    try {
      initializeNetworkMonitoring();
    } catch (error) {
      console.warn("Network monitoring failed:", error);
    }

    // Always update state – this is what triggers navigation to home
    set({
      user,
      token,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    setAuthToken(null);

    try {
      await secureStorage.clearAll();
    } catch (error) {
      console.warn("clearAll failed:", error);
    }

    try {
      disconnectWebSocket();
      useRealtimeStore.getState().disconnect();
    } catch (error) {
      console.warn("disconnect failed:", error);
    }

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

      if (token && user) {
        setAuthToken(token);

        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) console.log("Push token registered:", pushToken);
        } catch (e) { console.warn(e); }

        try {
          initializeWebSocket(token);
          useRealtimeStore.getState().connect();
        } catch (e) { console.warn(e); }

        try {
          initializeNetworkMonitoring();
        } catch (e) { console.warn(e); }

        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    }
  },
}));