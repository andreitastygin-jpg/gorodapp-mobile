// Mock expo and react-native modules at the very top to prevent Jest from loading their ESM source files
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'mock-redirect-uri'),
  ResponseType: { Code: 'code' },
  AuthRequest: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-secure-store', () => {
  let store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => {
      if (key === 'corrupted_trigger' || store[key] === 'corrupted_trigger') {
        throw new Error('SecureStore is corrupted!');
      }
      return store[key] || null;
    }),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    _clear: () => {
      store = {};
    }
  };
});

// Mock AsyncStorage since useAppStore persists to AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { 
  getStoredUserAccessToken, 
  getStoredMobileAuthSession, 
  clearStoredMobileAuthState,
  saveUserAccessToken,
  saveMobileAuthSession
} from '../mobileAuth';
import { logoutMobileUser } from '../mobileLogout';
import * as SecureStore from 'expo-secure-store';
import { mobileProfileApi } from '../mobileProfileApi';

describe('Session Management & Lifecycle Tests', () => {
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

  test('1. восстановление JWT: токен успешно загружается из SecureStore в Zustand', async () => {
    await SecureStore.setItemAsync('user_access_token', 'valid_jwt_token');
    
    const token = await getStoredUserAccessToken();
    expect(token).toBe('valid_jwt_token');
    expect(useAuthStore.getState().accessToken).toBe('valid_jwt_token');
  });

  test('2. отсутствие JWT: возвращает null и очищает accessToken в Zustand', async () => {
    const token = await getStoredUserAccessToken();
    expect(token).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  test('3. битый JWT: пустой токен удаляется и возвращает null', async () => {
    await SecureStore.setItemAsync('user_access_token', '   ');
    
    const token = await getStoredUserAccessToken();
    expect(token).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    
    const stored = await SecureStore.getItemAsync('user_access_token');
    expect(stored).toBeNull();
  });

  test('4. logout очищает store: сбрасывает Zustand хранилища auth и app', async () => {
    useAuthStore.setState({ 
      userId: 'user_123', 
      accessToken: 'token_123',
      pendingWebViewAccessToken: 'token_123'
    });
    useAppStore.setState({ 
      userId: 'user_123', 
      firstName: 'Ivan',
      cart: [{ id: 'item_1', name: 'Product 1', quantity: 1, price: 100 } as any]
    });

    await logoutMobileUser();

    const authState = useAuthStore.getState();
    expect(authState.userId).toBeNull();
    expect(authState.accessToken).toBeNull();
    expect(authState.pendingWebViewAccessToken).toBeNull();

    const appState = useAppStore.getState();
    expect(appState.userId).toBeNull();
    expect(appState.firstName).toBe('');
    expect(appState.cart).toEqual([]);
  });

  test('5. logout очищает SecureStore: удаляет все сохраненные сессии', async () => {
    await SecureStore.setItemAsync('user_access_token', 'token_to_clear');
    await SecureStore.setItemAsync('auth_session', JSON.stringify({ userId: 'u1' }));

    await logoutMobileUser();

    expect(await SecureStore.getItemAsync('user_access_token')).toBeNull();
    expect(await SecureStore.getItemAsync('auth_session')).toBeNull();
  });

  test('6. logout переводит на AuthScreen: обнуляет userId, что триггерит рендер AuthScreen в навигаторе', async () => {
    useAuthStore.setState({ userId: 'active_user' });

    await logoutMobileUser();

    expect(useAuthStore.getState().userId).toBeNull();
  });

  test('7. bootstrap выполняется корректно: восстанавливает сессию при наличии токена', async () => {
    const sessionObj = { userId: 'usr_999', isNewUser: false, lastLoginAt: new Date().toISOString() };
    await SecureStore.setItemAsync('user_access_token', 'jwt_val');
    await SecureStore.setItemAsync('auth_session', JSON.stringify(sessionObj));

    const token = await getStoredUserAccessToken();
    const session = await getStoredMobileAuthSession();

    expect(token).toBe('jwt_val');
    expect(session.userId).toBe('usr_999');
    expect(useAuthStore.getState().userId).toBe('usr_999');
    expect(useAuthStore.getState().accessToken).toBe('jwt_val');
  });

  test('8. повторный запуск автоматически входит без повторного ввода', async () => {
    const sessionObj = { userId: 'usr_888', isNewUser: true, lastLoginAt: new Date().toISOString() };
    await SecureStore.setItemAsync('user_access_token', 'jwt_888');
    await SecureStore.setItemAsync('auth_session', JSON.stringify(sessionObj));

    // Имитация старта приложения
    const token = await getStoredUserAccessToken();
    const session = await getStoredMobileAuthSession();

    expect(token).toBe('jwt_888');
    expect(session.userId).toBe('usr_888');
    expect(useAuthStore.getState().userId).toBe('usr_888');
  });

  test('9. повреждённое хранилище не ломает приложение: возвращает null и сбрасывает стейт', async () => {
    await SecureStore.setItemAsync('user_access_token', 'corrupted_trigger');
    
    const token = await getStoredUserAccessToken();
    expect(token).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  test('10. 401 вызывает logout: при получении Unauthorized очищаются стейт и хранилище', async () => {
    useAuthStore.setState({ 
      userId: 'user_401', 
      accessToken: 'token_401' 
    });
    await SecureStore.setItemAsync('user_access_token', 'token_401');

    // Настраиваем fetch для имитации 401 Unauthorized
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Unauthorized' })),
    });

    try {
      await mobileProfileApi.getProfile();
    } catch (err) {
      // Игнорируем ошибку самого запроса, так как мы проверяем сайд-эффект разлогина
    }

    // Даем асинхронному вызову logout завершиться
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(useAuthStore.getState().userId).toBeNull();
    expect(await SecureStore.getItemAsync('user_access_token')).toBeNull();
  });
});
