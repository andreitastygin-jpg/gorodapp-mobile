import React, { useEffect, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { setupNotificationListeners } from './src/services/pushNotifications';
import { notificationOpen } from './src/services/pageRequests';

export default function App() {
  // The notification the customer tapped, including the one that started the
  // app (a listener added at startup misses that one). It may carry a page of
  // the site to open ({ url }).
  const lastResponse = Notifications.useLastNotificationResponse();
  const open = useMemo(
    () => notificationOpen(lastResponse, Notifications.DEFAULT_ACTION_IDENTIFIER),
    [lastResponse],
  );

  useEffect(() => setupNotificationListeners(), []);

  // Known before the first paint: waiting for it lets a tapped notification
  // open its page straight away instead of loading the home page first.
  if (lastResponse === undefined) return null;

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AppNavigator notificationOpen={open} />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
