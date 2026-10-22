import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppWebView } from '../components/AppWebView';
import { SITE_URL, siteUrlForIncoming } from '../services/linkPolicy';
import { handleWebSessionMessage, parseWebSessionMessage } from '../services/webSession';

interface AppNavigatorProps {
  /** A page to open from outside the site (notification tap). */
  openUrl?: string | null;
}

// One screen: the site. It can be used without logging in (catalog, food,
// events); the site asks to log in when it is needed (checkout, bonuses).
export function AppNavigator({ openUrl }: AppNavigatorProps) {
  const incoming = Linking.useURL();
  const [url, setUrl] = useState(() => siteUrlForIncoming(incoming) ?? SITE_URL);

  useEffect(() => {
    const next = siteUrlForIncoming(incoming);
    if (next) setUrl(next);
  }, [incoming]);

  useEffect(() => {
    const next = siteUrlForIncoming(openUrl);
    if (next) setUrl(next);
  }, [openUrl]);

  const onWebMessage = (raw: string) => {
    const message = parseWebSessionMessage(raw);
    if (message) void handleWebSessionMessage(message);
  };

  return (
    <ScreenContainer>
      <AppWebView url={url} onWebMessage={onWebMessage} />
    </ScreenContainer>
  );
}

export default AppNavigator;
