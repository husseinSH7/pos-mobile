import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

// ─── Tokens ──────────────────────────────────────────────────────

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
}

export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  try {
    if (Platform.OS === 'web') {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      return { accessToken, refreshToken };
    } else {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      return { accessToken, refreshToken };
    }
  } catch (error) {
    console.error('Error getting tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
}

export async function clearTokens(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

// ─── User ──────────────────────────────────────────────────────

export async function saveUser(user: any): Promise<void> {
  try {
    const json = JSON.stringify(user);
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(USER_KEY, json);
    } else {
      await SecureStore.setItemAsync(USER_KEY, json);
    }
  } catch (error) {
    console.error('Error saving user:', error);
  }
}

export async function getUser(): Promise<any | null> {
  try {
    let json: string | null = null;
    if (Platform.OS === 'web') {
      json = await AsyncStorage.getItem(USER_KEY);
    } else {
      json = await SecureStore.getItemAsync(USER_KEY);
    }
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function clearUser(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch (error) {
    console.error('Error clearing user:', error);
  }
}

// ─── Combined ──────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  await clearTokens();
  await clearUser();
}