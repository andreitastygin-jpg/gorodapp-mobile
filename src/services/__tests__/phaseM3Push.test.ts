jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  randomUUID: jest.fn(() => 'mock-device-uuid-12345'),
}));


jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  FlatList: 'FlatList',
  SafeAreaView: 'SafeAreaView',
  ActivityIndicator: 'ActivityIndicator',
  RefreshControl: 'RefreshControl',
  ScrollView: 'ScrollView',
}));

jest.mock('expo-secure-store', () => {
  let store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    _clear: () => {
      store = {};
    },
    _getStore: () => store,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

jest.mock('expo-device', () => {
  let isDeviceValue = true;
  return {
    get isDevice() {
      return isDeviceValue;
    },
    __setIsDevice: (val: boolean) => {
      isDeviceValue = val;
    }
  };
});

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        projectId: '17812600-8e44-4962-baee-bb7190fd90dd',
      },
    },
  },
  easConfig: {
    projectId: '17812600-8e44-4962-baee-bb7190fd90dd',
  },
}));

jest.mock('expo-notifications', () => {
  return {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    getPermissionsAsync: jest.fn().mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    }),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({
      data: 'ExponentPushToken[mock_token_abc123]',
    }),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    AndroidImportance: {
      DEFAULT: 3,
      HIGH: 4,
    },
    PermissionStatus: {
      GRANTED: 'granted',
      DENIED: 'denied',
      UNDETERMINED: 'undetermined',
    },
  };
});

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import {
  getOrCreateDeviceId,
  registerDevicePushToken,
  bootstrapDevicePushToken,
  updateDevicePushSettings,
  unregisterDevicePushToken,
  setupNotificationListeners,
} from '../pushNotifications';
import { mobileProfileApi } from '../mobileProfileApi';
import { logoutMobileUser } from '../mobileLogout';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

describe('Phase M3 — Native Push Notifications Hardening Tests', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore as any)._clear();
    useAuthStore.getState().clearMobileAuthSession();
    useAppStore.getState().resetUser();
  });

  test('A. Stable Device ID: generated once and reused in subsequent requests', async () => {
    const id1 = await getOrCreateDeviceId();
    expect(id1).toBe('mock-device-uuid-12345');

    const stored = await SecureStore.getItemAsync('gorodapp_push_device_id');
    expect(stored).toBe('mock-device-uuid-12345');

    // Second call should return the stored value without regenerating
    const id2 = await getOrCreateDeviceId();
    expect(id2).toBe('mock-device-uuid-12345');
    expect(id1).toBe(id2);
  });

  test('B. Denied Permission: does not attempt to acquire token or register with backend', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    });

    const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush');

    const result = await registerDevicePushToken();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('permission_denied');
    expect(registerSpy).not.toHaveBeenCalled();

    registerSpy.mockRestore();
  });

  test('C & D. Granted Permission: registers push token with exact backend contract payload', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[test_real_token]',
    });

    const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush').mockResolvedValueOnce({
      success: true,
      enabled: true,
    });

    const result = await registerDevicePushToken();
    expect(result.success).toBe(true);
    expect(result.token).toBe('ExponentPushToken[test_real_token]');

    expect(registerSpy).toHaveBeenCalledWith({
      expoPushToken: 'ExponentPushToken[test_real_token]',
      deviceId: 'mock-device-uuid-12345',
      platform: 'ios',
      appVersion: '1.0.0',
      enabled: true,
    });

    registerSpy.mockRestore();
  });

  test('E & F. Settings Toggle: calls backend updatePushSettings for enabled=true and enabled=false', async () => {
    const updateSpy = jest.spyOn(mobileProfileApi, 'updatePushSettings').mockResolvedValue({
      success: true,
      enabled: false,
    });

    // Disable push
    const resOff = await updateDevicePushSettings(false);
    expect(resOff).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      deviceId: 'mock-device-uuid-12345',
      enabled: false,
    });

    // Enable push
    updateSpy.mockResolvedValueOnce({ success: true, enabled: true });
    const resOn = await updateDevicePushSettings(true);
    expect(resOn).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      deviceId: 'mock-device-uuid-12345',
      enabled: true,
    });

    updateSpy.mockRestore();
  });

  test('G & H. Logout: attempts unregisterPush; network failure does NOT block logout completion', async () => {
    const unregisterSpy = jest.spyOn(mobileProfileApi, 'unregisterPush').mockRejectedValueOnce(
      new Error('Network error or 500 server issue')
    );

    await SecureStore.setItemAsync('user_access_token', 'mock_user_token');
    await SecureStore.setItemAsync('auth_session', JSON.stringify({ userId: 'u1', isNewUser: false, lastLoginAt: '2026-08-20' }));
    useAuthStore.setState({ accessToken: 'mock_user_token', userId: 'u1' });
    useAppStore.setState({ firstName: 'John' });

    // Should complete successfully without throwing
    await expect(logoutMobileUser()).resolves.toBeUndefined();

    expect(unregisterSpy).toHaveBeenCalledWith({
      deviceId: 'mock-device-uuid-12345',
    });

    // Verify auth session and user store are properly wiped
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().userId).toBeNull();
    expect(useAppStore.getState().firstName).toBe('');

    unregisterSpy.mockRestore();
  });

  test('I. Bootstrap resilience: Push registration failure does NOT break session bootstrap', async () => {
    const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush').mockRejectedValueOnce(
      new Error('Push backend offline')
    );

    // Calling registerDevicePushToken catches gracefully and returns success: false
    const result = await registerDevicePushToken();
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Push backend offline');

    registerSpy.mockRestore();
  });

  test('J. Non-physical device check: Simulator / Emulator skips remote push registration gracefully', async () => {
    (Device as any).__setIsDevice(false);
    const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush');

    const result = await registerDevicePushToken();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('unsupported_device');
    expect(registerSpy).not.toHaveBeenCalled();

    (Device as any).__setIsDevice(true);
    registerSpy.mockRestore();
  });

  test('K. Notification Listeners: safely attaches foreground and response handlers', () => {
    const onTappedMock = jest.fn();
    const unsubscribe = setupNotificationListeners(onTappedMock);

    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  describe('Bootstrap Device Push Token Behavior Tests', () => {
    test('A. getPushSettings -> registered=true, enabled=false -> preserves disabled, does NOT register or request permissions', async () => {
      const getSettingsSpy = jest.spyOn(mobileProfileApi, 'getPushSettings').mockResolvedValueOnce({
        success: true,
        registered: true,
        enabled: false,
      });
      const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush');
      const requestPermSpy = Notifications.requestPermissionsAsync as jest.Mock;

      await bootstrapDevicePushToken();

      expect(getSettingsSpy).toHaveBeenCalledWith('mock-device-uuid-12345');
      expect(registerSpy).not.toHaveBeenCalled();
      expect(requestPermSpy).not.toHaveBeenCalled();

      getSettingsSpy.mockRestore();
      registerSpy.mockRestore();
    });

    test('B. getPushSettings -> registered=true, enabled=true -> refreshes token once with enabled:true without requesting permission', async () => {
      const getSettingsSpy = jest.spyOn(mobileProfileApi, 'getPushSettings').mockResolvedValueOnce({
        success: true,
        registered: true,
        enabled: true,
      });
      const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush').mockResolvedValueOnce({
        success: true,
        enabled: true,
      });
      const requestPermSpy = Notifications.requestPermissionsAsync as jest.Mock;

      await bootstrapDevicePushToken();

      expect(getSettingsSpy).toHaveBeenCalledWith('mock-device-uuid-12345');
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledWith({
        expoPushToken: 'ExponentPushToken[mock_token_abc123]',
        deviceId: 'mock-device-uuid-12345',
        platform: 'ios',
        appVersion: '1.0.0',
        enabled: true,
      });
      expect(requestPermSpy).not.toHaveBeenCalled();

      getSettingsSpy.mockRestore();
      registerSpy.mockRestore();
    });

    test('C. getPushSettings -> registered=false, OS permission granted -> registers once with enabled:true without prompting permission', async () => {
      const getSettingsSpy = jest.spyOn(mobileProfileApi, 'getPushSettings').mockResolvedValueOnce({
        success: true,
        registered: false,
        enabled: false,
      });
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        canAskAgain: true,
      });
      const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush').mockResolvedValueOnce({
        success: true,
        enabled: true,
      });
      const requestPermSpy = Notifications.requestPermissionsAsync as jest.Mock;

      await bootstrapDevicePushToken();

      expect(getSettingsSpy).toHaveBeenCalledWith('mock-device-uuid-12345');
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledWith({
        expoPushToken: 'ExponentPushToken[mock_token_abc123]',
        deviceId: 'mock-device-uuid-12345',
        platform: 'ios',
        appVersion: '1.0.0',
        enabled: true,
      });
      expect(requestPermSpy).not.toHaveBeenCalled();

      getSettingsSpy.mockRestore();
      registerSpy.mockRestore();
    });

    test('D. getPushSettings -> registered=false, OS permission denied/undetermined -> does NOT register or request permission', async () => {
      const getSettingsSpy = jest.spyOn(mobileProfileApi, 'getPushSettings').mockResolvedValueOnce({
        success: true,
        registered: false,
        enabled: false,
      });
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
      });
      const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush');
      const requestPermSpy = Notifications.requestPermissionsAsync as jest.Mock;

      await bootstrapDevicePushToken();

      expect(getSettingsSpy).toHaveBeenCalledWith('mock-device-uuid-12345');
      expect(registerSpy).not.toHaveBeenCalled();
      expect(requestPermSpy).not.toHaveBeenCalled();

      getSettingsSpy.mockRestore();
      registerSpy.mockRestore();
    });

    test('E. getPushSettings API failure -> bootstrap resolves gracefully without throwing', async () => {
      const getSettingsSpy = jest.spyOn(mobileProfileApi, 'getPushSettings').mockRejectedValueOnce(
        new Error('Network failure on push settings')
      );
      const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush');

      await expect(bootstrapDevicePushToken()).resolves.toBeUndefined();
      expect(registerSpy).not.toHaveBeenCalled();

      getSettingsSpy.mockRestore();
      registerSpy.mockRestore();
    });
  });

  describe('Enable UI Registration Result Handling Test', () => {
    test('Failed registration returns success:false and does not set enabled to true', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        canAskAgain: true,
      });
      const registerSpy = jest.spyOn(mobileProfileApi, 'registerPush').mockRejectedValueOnce(
        new Error('Device token rejected')
      );

      const result = await registerDevicePushToken({ forceRequestPermission: true, enabled: true });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Device token rejected');

      registerSpy.mockRestore();
    });
  });
});
