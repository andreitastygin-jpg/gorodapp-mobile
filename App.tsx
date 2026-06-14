import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/services/push';
import { useAppStore } from './src/store/useAppStore';

export default function App() {
  const { isAuthReady } = useAppStore();

  useEffect(() => {
    // Initiate background push registration
    registerForPushNotificationsAsync();
  }, []);

  return <AppNavigator />;
}
