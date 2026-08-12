import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'syncQueue';

export type PendingAction = {
  id: string;
  type: 'CREATE_ORDER' | 'UPDATE_TABLE' | 'ADD_ORDER_ITEM' | 'PAY_ORDER';
  payload: any;
  timestamp: number;
};

export async function addToSyncQueue(action: Omit<PendingAction, 'id' | 'timestamp'>) {
  const queue = await getQueue();
  const newAction: PendingAction = {
    ...action,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  queue.push(newAction);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<PendingAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeFromQueue(actionId: string) {
  const queue = await getQueue();
  const updated = queue.filter(a => a.id !== actionId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}