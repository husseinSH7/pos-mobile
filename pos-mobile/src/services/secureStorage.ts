import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const RESTAURANT_ID_KEY = 'restaurant_id';
const PIN_KEY = 'user_pin';

export const secureStorage = {
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  },

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  async saveUser(user: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async saveRestaurantId(restaurantId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(RESTAURANT_ID_KEY, restaurantId);
    } catch (error) {
      console.error('Error saving restaurant ID:', error);
      throw error;
    }
  },

  async getRestaurantId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(RESTAURANT_ID_KEY);
    } catch (error) {
      console.error('Error getting restaurant ID:', error);
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(RESTAURANT_ID_KEY);
      await SecureStore.deleteItemAsync(PIN_KEY);
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      throw error;
    }
  },

  async savePIN(pin: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
    } catch (error) {
      console.error('Error saving PIN:', error);
      throw error;
    }
  },

  async getPIN(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(PIN_KEY);
    } catch (error) {
      console.error('Error getting PIN:', error);
      return null;
    }
  },

  async deletePIN(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
    } catch (error) {
      console.error('Error deleting PIN:', error);
      throw error;
    }
  },
};
