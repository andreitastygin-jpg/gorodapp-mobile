import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { OfflineScreen } from '../screens/OfflineScreen';
import { linkDecision } from '../services/linkPolicy';

// The whole app is gorodapp.ru inside one WebView. The site does everything
// itself - catalog, cart, checkout, login (МТС ID / SMS code), consents,
// keeping the login alive (refresh cookie) and its own Back handling
// (utils/historyLayers.ts). The app adds: links that leave the site open in
// the phone's browser / apps, the Android Back button, an offline screen, and
// the messages the site sends (see services/webSession.ts).

interface AppWebViewProps {
  /** Page to show; changing it (deep link, notification) opens that page. */
  url: string;
  /** Raw messages from the site (window.ReactNativeWebView.postMessage). */
  onWebMessage?: (raw: string) => void;
}

const openExternally = (url: string) => {
  Linking.openURL(url).catch(() => {
    // Nothing on the phone can open it (unknown scheme) - stay on the page.
  });
};

export const AppWebView: React.FC<AppWebViewProps> = ({ url, onWebMessage }) => {
  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const [source, setSource] = useState({ uri: url, nonce: 0 });
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [offline, setOffline] = useState(false);

  // A new page from outside (deep link, notification tap) is opened even when
  // it is the same address as before.
  useEffect(() => {
    setSource((s) => ({ uri: url, nonce: s.nonce + 1 }));
  }, [url]);

  // Android Back: the site's history first (it closes the open product, cart,
  // category...); from the first page Android closes the app as usual.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const onShouldStartLoadWithRequest = (request: { url: string; isTopFrame?: boolean }) => {
    // Frames inside the page (maps, video) load as they are.
    if (request.isTopFrame === false) return true;
    const decision = linkDecision(request.url);
    if (decision === 'load') return true;
    openExternally(request.url);
    return false;
  };

  const onOpenWindow = (event: { nativeEvent: { targetUrl: string } }) => {
    const target = event.nativeEvent.targetUrl;
    if (!target) return;
    if (linkDecision(target) === 'load') setSource((s) => ({ uri: target, nonce: s.nonce + 1 }));
    else openExternally(target);
  };

  const onNavigationStateChange = (state: WebViewNavigation) => {
    canGoBackRef.current = state.canGoBack;
  };

  const retry = () => {
    setOffline(false);
    setSource((s) => ({ ...s, nonce: s.nonce + 1 }));
  };

  if (offline) return <OfflineScreen onRetry={retry} />;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        key={`webview-${source.nonce}`}
        source={{ uri: source.uri }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        applicationNameForUserAgent="GorodAppMobile"
        webviewDebuggingEnabled={__DEV__}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onOpenWindow={onOpenWindow}
        onNavigationStateChange={onNavigationStateChange}
        onLoadEnd={() => setFirstLoadDone(true)}
        onError={() => setOffline(true)}
        onMessage={(event) => onWebMessage?.(event.nativeEvent.data)}
        style={styles.webview}
      />
      {!firstLoadDone && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#5655FF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  webview: { flex: 1, backgroundColor: '#ffffff' },
  loader: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});

export default AppWebView;
