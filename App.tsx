import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { getStoredUserAccessToken, getStoredMobileAuthSession, clearStoredMobileAuthState } from './src/services/mobileAuth';
import { useAuthStore } from './src/store/useAuthStore';
import { useAppStore } from './src/store/useAppStore';
import { mobileProfileApi } from './src/services/mobileProfileApi';
import { bootstrapDevicePushToken, setupNotificationListeners } from './src/services/pushNotifications';
import LoadingView from './src/components/ui/LoadingView';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  const [isAuthRestoring, setIsAuthRestoring] = useState(true);

  // Setup foreground & background tap push notification listeners
  useEffect(() => {
    const unsubscribe = setupNotificationListeners((payload) => {
      console.log('[App] Push notification payload tapped:', payload);
    });
    return () => {
      unsubscribe();
    };
  }, []);

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
            const profileResponse = await mobileProfileApi.getProfile();
            console.log('[App] Session verified successfully.');
            if (active) {
              if (profileResponse?.user) {
                useAppStore.getState().setUserData({
                  firstName: profileResponse.user.firstName || '',
                  lastName: profileResponse.user.lastName || '',
                  username: profileResponse.user.username || '',
                  photoUrl: profileResponse.user.photoUrl || '',
                  phone: profileResponse.user.phone || '',
                  email: profileResponse.user.email || '',
                  birthday: profileResponse.user.birthday || '',
                  gender: (profileResponse.user.gender as any) || '',
                  userBalance: profileResponse.stats?.bonusBalance ?? 0,
                  bonusDebt: profileResponse.stats?.bonusDebt ?? 0,
                  referralCode: profileResponse.referral?.referralCode || '',
                  phoneVerified: profileResponse.registration?.phoneVerified ?? false,
                  profileCompleted: profileResponse.registration?.profileCompleted ?? false,
                  hasRequiredConsents: profileResponse.registration?.hasRequiredConsents ?? false,
                  missingRequiredFields: profileResponse.registration?.missingRequiredFields ?? [],
                });
              }
              useAuthStore.getState().setPendingWebViewAccessToken(token);

              // Bootstrap push notifications in background without blocking bootstrap
              bootstrapDevicePushToken().catch((pushErr) => {
                console.warn('[App] Push token registration on bootstrap failed gracefully:', pushErr);
              });
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


