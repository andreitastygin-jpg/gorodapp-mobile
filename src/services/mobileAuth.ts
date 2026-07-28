import * as Crypto from 'expo-crypto';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encode } from 'base-64';
import { TELEGRAM_AUTH_URL, TELEGRAM_CLIENT_ID, MOBILE_AUTH_ENDPOINT } from '../config/auth';
import { useAuthStore } from '../store/useAuthStore';

const base64UrlEncode = (bytes: Uint8Array) => {
    return encode(String.fromCharCode.apply(null, Array.from(bytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const generateCodeVerifier = async () => {
    const bytes = await Crypto.getRandomBytesAsync(32);
    return base64UrlEncode(bytes);
};

const generateCodeChallenge = async (verifier: string) => {
    const hashAsBase64 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        verifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    return hashAsBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const getMobilePlatform = (): 'ios' | 'android' => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  throw new Error('Unsupported mobile platform');
};

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export const startTelegramLogin = async () => {
  if (!TELEGRAM_CLIENT_ID) throw new Error('Auth configuration incomplete');
  if (!MOBILE_AUTH_ENDPOINT) throw new Error('Auth configuration incomplete');

  console.log('[MobileAuth] auth flow started');
  const nonce = Crypto.randomUUID();
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const discovery = {
    authorizationEndpoint: TELEGRAM_AUTH_URL,
  };

  const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'gorodapp',
      path: 'auth/telegram/callback',
  });

  const request = new AuthSession.AuthRequest({
    clientId: TELEGRAM_CLIENT_ID,
    redirectUri,
    scopes: ['openid'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: false,
    extraParams: {
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'success') {
    console.log('[MobileAuth] redirect received');
    const code = result.params.code;
    if (typeof code !== 'string') {
        throw new Error('Telegram authorization code not received');
    }
    return await exchangeTelegramCodeForCustomToken({
      code,
      nonce,
      code_verifier: codeVerifier,
      platform: getMobilePlatform(),
    });
  }
  throw new Error('Telegram login cancelled or failed');
};

export interface TelegramAuthResponse {
  accessToken: string;
  userId: string;
  isNewUser: boolean;
}

export const exchangeTelegramCodeForCustomToken = async (params: any): Promise<TelegramAuthResponse> => {
  const response = await fetch(MOBILE_AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  const data = await safeReadJson(response);
  if (!response.ok) {
      throw new Error(data?.error || 'Authentication error');
  }
  
  if (typeof data.userId !== 'string' || typeof data.isNewUser !== 'boolean') {
      throw new Error('Invalid auth response');
  }
  
  if (typeof data.accessToken !== 'string' || data.accessToken.trim() === '') {
      throw new Error('Backend access token is missing');
  }
  
  console.log('[MobileAuth] backend exchange success');

  await saveUserAccessToken(data.accessToken);
  
  await saveMobileAuthSession({ userId: data.userId, isNewUser: data.isNewUser });
  
  return {
    accessToken: data.accessToken,
    userId: data.userId,
    isNewUser: data.isNewUser,
  };
};

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

