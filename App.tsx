import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { getStoredUserAccessToken, getStoredMobileAuthSession, clearStoredMobileAuthState } from './src/services/mobileAuth';
import { useAuthStore } from './src/store/useAuthStore';
import { mobileProfileApi } from './src/services/mobileProfileApi';
import LoadingView from './src/components/ui/LoadingView';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  const [isAuthRestoring, setIsAuthRestoring] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      try {
        const token = await getStoredUserAccessToken();
        const session = await getStoredMobileAuthSession();

        const isValidSession = session && 
          typeof session.userId === 'string' && 
          session.userId.trim() !== '' && 
          typeof session.isNewUser === 'boolean' && 
          typeof session.lastLoginAt === 'string' && 
          session.lastLoginAt.trim() !== '';

        if (token && token.trim() !== '' && isValidSession) {
          try {
            console.log('[App] Verifying restored session with backend...');
            await mobileProfileApi.getProfile();
            console.log('[App] Session verified successfully.');
            if (active) {
              useAuthStore.getState().setPendingWebViewAccessToken(token);
            }
          } catch (apiErr: any) {
            console.warn('[App] Session verification failed:', apiErr);
            const errMsg = apiErr.message ? apiErr.message.toLowerCase() : '';
            if (
              errMsg.includes('401') || 
              errMsg.includes('unauthorized') || 
              errMsg.includes('authenticated') || 
              errMsg.includes('token')
            ) {
              await clearStoredMobileAuthState();
            } else {
              // Network error or temporary issue, retain the session for offline usability
              if (active) {
                useAuthStore.getState().setPendingWebViewAccessToken(token);
              }
            }
          }
        } else {
          await clearStoredMobileAuthState();
        }
      } catch (error) {
        console.error('[App] Auth bootstrap failed (corrupted SecureStore or other error):', error);
        try {
          await SecureStore.deleteItemAsync('user_access_token');
          await SecureStore.deleteItemAsync('auth_session');
        } catch {}
        useAuthStore.getState().clearMobileAuthSession();
      } finally {
        if (active) {
          setIsAuthRestoring(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        {isAuthRestoring ? (
          <LoadingView message="Загрузка сессии..." />
        ) : (
          <AppNavigator />
        )}
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}


