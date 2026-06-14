import * as Crypto from 'expo-crypto';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encode } from 'base-64';
import { TELEGRAM_AUTH_URL, TELEGRAM_CLIENT_ID, MOBILE_AUTH_ENDPOINT } from '../config/auth';
import { useAuthStore } from '../store/useAuthStore';
import { auth } from './firebase';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';

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

const getMobilePlatform = (): 'ios' | 'android' | 'unknown' => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unknown';
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

export const exchangeTelegramCodeForCustomToken = async (params: any) => {
  const response = await fetch(MOBILE_AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  const data = await safeReadJson(response);
  if (!response.ok) {
      throw new Error(data?.error || 'Authentication error');
  }
  
  if (typeof data.customToken !== 'string' || typeof data.userId !== 'string' || typeof data.isNewUser !== 'boolean') {
      throw new Error('Invalid auth response');
  }
  
  await signInWithCustomToken(auth, data.customToken);
  
  await saveMobileAuthSession({ userId: data.userId, isNewUser: data.isNewUser });
  
  return { ...data };
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

export const saveMobileAuthSession = async (session: { userId: string; isNewUser: boolean }) => {
  const sessionData = { ...session, lastLoginAt: new Date().toISOString() };
  await SecureStore.setItemAsync('auth_session', JSON.stringify(sessionData));
  useAuthStore.getState().setMobileAuthSession(sessionData);
};

export const clearMobileAuthSession = async () => {
  await firebaseSignOut(auth);
  await SecureStore.deleteItemAsync('auth_session');
  useAuthStore.getState().clearMobileAuthSession();
};
