import { Platform } from 'react-native';

/**
 * Safely requests Push Notification permissions on actual device targets,
 * falling back to local simulation during preview runtimes.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Push] Notification registrations bypassed on Web runtime');
    return null;
  }

  try {
    // Dynamic import to avoid build breaks if expo-notifications is loaded in client-only configurations
    const Notifications = await import('expo-notifications');
    
    // Configure default priority channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Push permissions denied');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({})).data;
    console.log('[Push] Registered Device Token:', token);
    return token;
  } catch (error) {
    console.warn('[Push] Registration error:', error);
    return null;
  }
}

export async function scheduleLocalTestNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.error('[Push] Test notification schedule failed:', error);
  }
}
