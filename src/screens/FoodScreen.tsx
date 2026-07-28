import React from 'react';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppWebView } from '../components/AppWebView';
import { useAuthStore } from '../store/useAuthStore';

export const FoodScreen: React.FC = () => {
  const { pendingWebViewAccessToken } = useAuthStore();
  return (
    <ScreenContainer>
      <AppWebView 
        url="https://gorodapp.ru?tab=food"
        pendingAuthAccessToken={pendingWebViewAccessToken}
        onWebAuthError={() => console.warn('[WebViewAuth] Web auth failed')}
      />
    </ScreenContainer>
  );
};

export default FoodScreen;
