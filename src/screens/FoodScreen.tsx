import React from 'react';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppWebView } from '../components/AppWebView';
import { useAuthStore } from '../store/useAuthStore';

export const FoodScreen: React.FC = () => {
  const { pendingWebViewCustomToken, setPendingWebViewCustomToken } = useAuthStore();
  return (
    <ScreenContainer>
      <AppWebView 
        url="https://gorodapp.ru?tab=food"
        pendingAuthCustomToken={pendingWebViewCustomToken}
        onWebAuthSuccess={() => setPendingWebViewCustomToken(null)}
        onWebAuthError={() => console.warn('[WebViewAuth] Web auth failed')}
      />
    </ScreenContainer>
  );
};

export default FoodScreen;
