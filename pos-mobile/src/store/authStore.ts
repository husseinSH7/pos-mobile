import { create } from "zustand";
import { setAuthToken } from "../services/api";
import {
  getTokens,
  saveTokens,
  clearTokens,
  saveUser,
  getUser,
  clearUser,
} from "../services/secureStorage";

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  login: async (user, token, refreshToken) => {
    setAuthToken(token);
    try {
      await saveTokens(token, refreshToken || '');
      await saveUser(user);
    } catch (error) {
      console.warn("Failed to save tokens/user:", error);
    }
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
      await clearTokens();
      await clearUser();
    } catch (error) {
      console.warn("Failed to clear tokens/user:", error);
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
      const { accessToken, refreshToken } = await getTokens();
      const user = await getUser();
      if (accessToken && user) {
        setAuthToken(accessToken);
        set({
          user,
          token: accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    }
  },
}));