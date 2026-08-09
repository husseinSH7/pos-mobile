import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'NEW_ORDER' | 'KITCHEN_READY' | 'SHIFT_REMINDER' | 'TABLE_UPDATE' | 'PAYMENT_COMPLETE';
  orderId?: string;
  tableId?: string;
  restaurantId: string;
  title: string;
  body: string;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Platform.OS === 'ios') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId 
      ?? (await Notifications.getExpoPushTokenAsync()).data;
    token = projectId;
  } catch (e) {
    console.error('Error getting push token:', e);
  }

  return token;
}

export async function sendLocalNotification(data: NotificationData): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: {
          type: data.type,
          orderId: data.orderId,
          tableId: data.tableId,
          restaurantId: data.restaurantId,
        },
        sound: true,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
}

export async function scheduleShiftReminder(shiftStartTime: Date): Promise<string> {
  const trigger = new Date(shiftStartTime);
  trigger.setMinutes(trigger.getMinutes() - 15); // 15 minutes before shift

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Shift Starting Soon',
      body: 'Your shift starts in 15 minutes',
      data: { type: 'SHIFT_REMINDER' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });

  return identifier;
}

export function addNotificationListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function removeSubscription(subscription: Notifications.Subscription): void {
  subscription.remove();
}

export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getBadgeCountAsync(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCountAsync(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// Notification helpers for specific events
export async function notifyOrderStatusChanged(orderId: string, status: string, tableNumber?: string): Promise<void> {
  const title = 'Order Status Updated';
  const body = tableNumber 
    ? `Table ${tableNumber} order is now ${status}`
    : `Order ${orderId.slice(-6)} is now ${status}`;
  
  await sendLocalNotification({
    type: 'TABLE_UPDATE',
    orderId,
    restaurantId: '',
    title,
    body,
  });
}

export async function notifyKitchenReady(orderId: string, tableNumber?: string): Promise<void> {
  const title = 'Order Ready!';
  const body = tableNumber 
    ? `Table ${tableNumber} order is ready for pickup`
    : `Order ${orderId.slice(-6)} is ready for pickup`;
  
  await sendLocalNotification({
    type: 'KITCHEN_READY',
    orderId,
    restaurantId: '',
    title,
    body,
  });
}

export async function notifyPaymentComplete(orderId: string, tableNumber?: string): Promise<void> {
  const title = 'Payment Complete';
  const body = tableNumber 
    ? `Table ${tableNumber} payment has been processed`
    : `Order ${orderId.slice(-6)} payment has been processed`;
  
  await sendLocalNotification({
    type: 'PAYMENT_COMPLETE',
    orderId,
    restaurantId: '',
    title,
    body,
  });
}

export async function notifyNewOrder(orderId: string, tableNumber?: string): Promise<void> {
  const title = 'New Order Received';
  const body = tableNumber 
    ? `New order for Table ${tableNumber}`
    : `New order ${orderId.slice(-6)} received`;
  
  await sendLocalNotification({
    type: 'NEW_ORDER',
    orderId,
    restaurantId: '',
    title,
    body,
  });
}
