import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';

// Access token storage for the app's own calls (notification registration).
// The login itself happens on the site inside the app (services/webSession.ts).

export const getStoredMobileAuthSession = async () => {
  try {
    const sessionStr = await SecureStore.getItemAsync('auth_session');
    if (!sessionStr) return null;
    let session;
    try {
        session = JSON.parse(sessionStr);
    } catch {
        await SecureStore.deleteItemAsync('auth_session');
        useAuthStore.getState().clearMobileAuthSession();
        return null;
    }
    
    // Validate session
    if (typeof session.userId !== 'string' || typeof session.isNewUser !== 'boolean' || typeof session.lastLoginAt !== 'string') {
        await SecureStore.deleteItemAsync('auth_session');
        useAuthStore.getState().clearMobileAuthSession();
        return null;
    }

    useAuthStore.getState().setMobileAuthSession(session);
    return session;
  } catch {
    try {
        await SecureStore.deleteItemAsync('auth_session');
    } catch {}
    useAuthStore.getState().clearMobileAuthSession();
    return null;
  }
};

const ACCESS_TOKEN_STORAGE_KEY = 'user_access_token';

export const saveUserAccessToken = async (accessToken: string): Promise<void> => {
  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new Error('Invalid access token');
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  useAuthStore.getState().setAccessToken(accessToken);
};

export const getStoredUserAccessToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
      useAuthStore.getState().setAccessToken(null);
      return null;
    }
    if (typeof token !== 'string' || token.trim() === '') {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
      useAuthStore.getState().setAccessToken(null);
      return null;
    }
    useAuthStore.getState().setAccessToken(token);
    return token;
  } catch {
    useAuthStore.getState().setAccessToken(null);
    return null;
  }
};

export const clearUserAccessToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
  } catch {}
  useAuthStore.getState().setAccessToken(null);
};

export const saveMobileAuthSession = async (session: { userId: string; isNewUser: boolean }) => {
  const sessionData = { ...session, lastLoginAt: new Date().toISOString() };
  await SecureStore.setItemAsync('auth_session', JSON.stringify(sessionData));
  useAuthStore.getState().setMobileAuthSession(sessionData);
};

export const clearMobileAuthSession = async () => {
  await clearUserAccessToken();
  try {
    await SecureStore.deleteItemAsync('auth_session');
  } catch {}
  useAuthStore.getState().clearMobileAuthSession();
};

export const clearStoredMobileAuthState = async () => {
  await clearUserAccessToken();
  try {
    await SecureStore.deleteItemAsync('auth_session');
  } catch {}
  useAuthStore.getState().clearMobileAuthSession();
};

