import React, { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppWebView } from '../components/AppWebView';
import { firstPage, nextPage, NotificationOpen, PageRequest } from '../services/pageRequests';
import { handleWebSessionMessage, parseWebSessionMessage } from '../services/webSession';

interface AppNavigatorProps {
  /** Page from a tapped notification (a new value for every tap). */
  notificationOpen?: NotificationOpen | null;
}

// One screen: the site. It can be used without logging in (catalog, food,
// events); the site asks to log in when it is needed (checkout, bonuses).
export function AppNavigator({ notificationOpen }: AppNavigatorProps) {
  const [page, setPage] = useState<PageRequest>(() =>
    firstPage(notificationOpen?.url ?? Linking.getLinkingURL()),
  );
  const shownNotification = useRef(notificationOpen?.key);

  // Links opened while the app runs (gorodapp://..., QR codes): every one,
  // the same link twice included.
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => setPage((p) => nextPage(p, url)));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!notificationOpen || notificationOpen.key === shownNotification.current) return;
    shownNotification.current = notificationOpen.key;
    setPage((p) => nextPage(p, notificationOpen.url));
  }, [notificationOpen]);

  const onWebMessage = (raw: string) => {
    const message = parseWebSessionMessage(raw);
    if (message) void handleWebSessionMessage(message);
  };

  return (
    <ScreenContainer>
      <AppWebView page={page} onWebMessage={onWebMessage} />
    </ScreenContainer>
  );
}

export default AppNavigator;
