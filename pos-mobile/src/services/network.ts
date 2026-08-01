import NetInfo from '@react-native-community/netinfo';

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

export async function initializeNetworkMonitoring(): Promise<void> {
  const state = await NetInfo.fetch();
  currentNetworkState = {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    type: state.type ?? 'unknown'
  };

  // Subscribe to network changes
  NetInfo.addEventListener((networkState) => {
    const newState: NetworkState = {
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

export function getCurrentNetworkState(): NetworkState {
  return { ...currentNetworkState };
}

export function isOnline(): boolean {
  return currentNetworkState.isConnected && currentNetworkState.isInternetReachable;
}

export function addNetworkListener(listener: (state: NetworkState) => void): () => void {
  networkListeners.add(listener);
  // Immediately call with current state
  listener(getCurrentNetworkState());
  
  // Return unsubscribe function
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

export async function checkConnectivity(): Promise<boolean> {
  try {
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