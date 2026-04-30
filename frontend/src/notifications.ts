import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import api from './api';

// Maps admin-sent deep link values to Expo Router paths
export function resolveDeepLink(link: string): string {
  if (!link) return '';
  const tabMap: Record<string, string> = {
    '/home':              '/(tabs)/home',
    '/feed':              '/(tabs)/feed',
    '/culinary':          '/(tabs)/menu',
    '/menu':              '/(tabs)/menu',
    '/profile':           '/(tabs)/profile',
    '/quick-adds':        '/(tabs)/quick-adds',
    '/goals':             '/(tabs)/goals',
    '/wellness-programs': '/wellness-programs',
    '/subscription':      '/subscription',
    '/notifications':     '/notifications',
    '/settings':          '/settings',
  };
  if (tabMap[link]) return tabMap[link];
  // Pass through dynamic routes like /meal/123 or /program/456
  return link;
}

export function navigateDeepLink(link: string) {
  const resolved = resolveDeepLink(link);
  if (!resolved) return;
  try {
    router.push(resolved as any);
  } catch (e) {
    console.warn('Deep link navigation failed:', resolved, e);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BO Wellness',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Will use project from app.json
    });
    return tokenData.data;
  } catch (e) {
    console.log('Failed to get push token:', e);
    return null;
  }
}

export async function savePushToken(token: string) {
  try {
    await api.post('/v1/notifications/register', { pushToken: token, platform: Platform.OS });
  } catch (e) {
    console.error('Failed to save push token:', e);
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds: number = 1,
  data?: Record<string, any>
) {
  const boTitle = title.startsWith('BO') ? title : `BO | ${title}`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: boTitle,
      body,
      data: data || {},
      sound: 'default',
      subtitle: 'BO Wellness',
    },
    trigger: delaySeconds > 0 ? { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL } : null,
  });
}

export async function scheduleDailyReminder(
  id: string,
  title: string,
  body: string,
  hour: number,
  minute: number
) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  const boTitle = title.startsWith('BO') ? title : `BO | ${title}`;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: boTitle,
      body,
      sound: 'default',
      subtitle: 'BO Wellness',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) {
        setExpoPushToken(token);
        savePushToken(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      setNotification(n);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const link = data?.deepLink || data?.deep_link;
      if (link) {
        // Small delay lets the app fully mount before navigating
        setTimeout(() => navigateDeepLink(link), 300);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, notification };
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}
