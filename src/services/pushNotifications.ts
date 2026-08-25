import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { mobileProfileApi } from './mobileProfileApi';

const PUSH_DEVICE_ID_KEY = 'gorodapp_push_device_id';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Returns a stable deviceId generated once and stored in SecureStore.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(PUSH_DEVICE_ID_KEY);
    if (existing && existing.trim() !== '') {
      return existing.trim();
    }
  } catch (err) {
    console.warn('[Push] Error reading deviceId from SecureStore:', err);
  }

  const newId = Crypto.randomUUID ? Crypto.randomUUID() : `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  try {
    await SecureStore.setItemAsync(PUSH_DEVICE_ID_KEY, newId);
  } catch (err) {
    console.warn('[Push] Error writing deviceId to SecureStore:', err);
  }
  return newId;
}

/**
 * Sets up Android notification channels if running on Android.
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Уведомления GorodApp',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    } catch (err) {
      console.warn('[Push] Error setting up Android notification channel:', err);
    }
  }
}

/**
 * Checks system notification permissions.
 */
export async function checkNotificationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return {
      status: settings.status,
      granted: settings.granted || settings.status === Notifications.PermissionStatus.GRANTED,
      canAskAgain: settings.canAskAgain,
    };
  } catch (err) {
    console.warn('[Push] Error checking notification permission:', err);
    return {
      status: Notifications.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
    };
  }
}

/**
 * Requests system notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === Notifications.PermissionStatus.GRANTED;
  } catch (err) {
    console.warn('[Push] Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Registers device push notification token on the backend.
 * Failure must NOT throw or break auth/profile flows.
 */
export async function registerDevicePushToken(options?: {
  forceRequestPermission?: boolean;
  enabled?: boolean;
}): Promise<{ success: boolean; token?: string; reason?: string }> {
  try {
    if (!Device.isDevice) {
      console.log('[Push] Push notifications are not supported on simulator/emulator');
      return { success: false, reason: 'unsupported_device' };
    }

    await setupAndroidNotificationChannel();

    let perm = await Notifications.getPermissionsAsync();
    let finalStatus = perm.status;

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      if (options?.forceRequestPermission) {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }
    }

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      console.log('[Push] Notification permission not granted:', finalStatus);
      return { success: false, reason: 'permission_denied' };
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenResponse?.data;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      console.warn('[Push] Could not obtain valid Expo push token');
      return { success: false, reason: 'token_acquisition_failed' };
    }

    const deviceId = await getOrCreateDeviceId();
    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const enabled = options?.enabled ?? true;

    const response = await mobileProfileApi.registerPush({
      expoPushToken,
      deviceId,
      platform,
      appVersion,
      enabled,
    });

    console.log('[Push] Push registration response from backend:', response);
    return { success: true, token: expoPushToken };
  } catch (err) {
    console.warn('[Push] Push registration failed gracefully:', err);
    return { success: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Bootstraps device push notification token on app launch or auth success.
 */
export async function bootstrapDevicePushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const deviceId = await getOrCreateDeviceId();
    const settings = await mobileProfileApi.getPushSettings(deviceId);
    
    if (settings.registered) {
      if (settings.enabled === false) {
        // do NOT register, preserve disabled state
        console.log('[Push] Bootstrap: preserved disabled state');
        return;
      }
      // registered and enabled, refresh token
      await registerDevicePushToken({ forceRequestPermission: false, enabled: true });
    } else {
      // not registered, check OS permission only
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status === Notifications.PermissionStatus.GRANTED) {
        // already granted -> register enabled=true
        await registerDevicePushToken({ forceRequestPermission: false, enabled: true });
      }
    }
  } catch (err) {
    console.warn('[Push] Bootstrap failed gracefully:', err);
  }
}

/**
 * Updates device notification settings on backend.
 */
export async function updateDevicePushSettings(enabled: boolean): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const response = await mobileProfileApi.updatePushSettings({
      deviceId,
      enabled,
    });
    console.log('[Push] Update push settings response:', response);
    return response.success;
  } catch (err) {
    console.warn('[Push] Update push settings failed:', err);
    throw err;
  }
}

/**
 * Unregisters device push notification token on backend.
 * Failure must NOT throw.
 */
export async function unregisterDevicePushToken(): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const response = await mobileProfileApi.unregisterPush({ deviceId });
    console.log('[Push] Unregister push token response:', response);
    return response.success;
  } catch (err) {
    console.warn('[Push] Unregister push token failed gracefully:', err);
    return false;
  }
}

/**
 * Attaches notification listeners for foreground reception and tap response.
 */
export function setupNotificationListeners(
  onNotificationTapped?: (payload: any) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Push] Notification received in foreground:', notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Push] Notification response received (tapped):', response);
    const data = response?.notification?.request?.content?.data;
    if (data && onNotificationTapped) {
      try {
        onNotificationTapped(data);
      } catch (err) {
        console.warn('[Push] Error in onNotificationTapped callback:', err);
      }
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
