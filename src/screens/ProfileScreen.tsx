import React from 'react';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppWebView } from '../components/AppWebView';
import { useAuthStore } from '../store/useAuthStore';
import { AuthScreen } from './AuthScreen';

export const ProfileScreen: React.FC = () => {
  const { userId, pendingWebViewCustomToken, setPendingWebViewCustomToken } = useAuthStore();
  
  if (!userId) {
      return (
          <ScreenContainer>
              <AuthScreen />
          </ScreenContainer>
      );
  }

  return (
    <ScreenContainer>
      <AppWebView 
        url="https://gorodapp.ru?tab=profile"
        pendingAuthCustomToken={pendingWebViewCustomToken}
        onWebAuthSuccess={() => setPendingWebViewCustomToken(null)}
        onWebAuthError={() => console.warn('[WebViewAuth] Web auth failed')}
      />
    </ScreenContainer>
  );
};

export default ProfileScreen;