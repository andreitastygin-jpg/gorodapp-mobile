import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { setupNotificationListeners } from './src/services/pushNotifications';

export default function App() {
  // A tapped notification may carry a page of the site to open ({ url }).
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = setupNotificationListeners((payload) => {
      if (payload && typeof payload.url === 'string') setOpenUrl(payload.url);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AppNavigator openUrl={openUrl} />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
