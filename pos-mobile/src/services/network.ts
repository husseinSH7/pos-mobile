import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

let currentNetworkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown'
};

const networkListeners: Set<(state: NetworkState) => void> = new Set();

export function isOnline(): boolean {
  if (Platform.OS === 'web') {
    return navigator.onLine;
  }
  return currentNetworkState.isConnected && currentNetworkState.isInternetReachable;
}

export function getCurrentNetworkState(): NetworkState {
  return { ...currentNetworkState };
}

export function addNetworkListener(listener: (state: NetworkState) => void): () => void {
  networkListeners.add(listener);
  listener(getCurrentNetworkState());
  return () => {
    networkListeners.delete(listener);
  };
}

function notifyListeners(): void {
  networkListeners.forEach(listener => {
    try {
      listener(getCurrentNetworkState());
    } catch (error) {
      console.error('Network listener error:', error);
    }
  });
}

export async function initializeNetworkMonitoring(): Promise<void> {
  if (Platform.OS === 'web') {
    const updateState = () => {
      const online = navigator.onLine;
      const newState: NetworkState = {
        isConnected: online,
        isInternetReachable: online,
        type: online ? 'wifi' : 'none'
      };
      currentNetworkState = newState;
      notifyListeners();
    };
    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);
    updateState();
    return;
  }

  const state = await NetInfo.fetch();
  currentNetworkState = {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    type: state.type ?? 'unknown'
  };

  NetInfo.addEventListener((networkState) => {
    const newState = {
      isConnected: networkState.isConnected ?? false,
      isInternetReachable: networkState.isInternetReachable ?? false,
      type: networkState.type ?? 'unknown'
    };
    if (newState.isConnected !== currentNetworkState.isConnected ||
        newState.isInternetReachable !== currentNetworkState.isInternetReachable) {
      currentNetworkState = newState;
      notifyListeners();
    }
  });
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    }
    const state = await NetInfo.fetch();
    currentNetworkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type ?? 'unknown'
    };
    return isOnline();
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return false;
  }
}