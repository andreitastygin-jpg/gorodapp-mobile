import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Linking, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { ErrorView } from './ui/ErrorView';
import { useIsFocused } from '@react-navigation/native';

// Global variable to keep track of the previously visited URL to calculate tab transitions
let lastActiveUrlGlobal: string = 'https://gorodapp.ru?tab=event';

interface AppWebViewProps {
  url: string;
  pendingAuthCustomToken?: string | null;
  onWebAuthSuccess?: () => void;
  onWebAuthError?: (error: string) => void;
}

export const AppWebView: React.FC<AppWebViewProps> = ({ 
    url, 
    pendingAuthCustomToken, 
    onWebAuthSuccess, 
    onWebAuthError 
}) => {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);
  
  const webViewRef = useRef<WebView>(null);
  const isWebViewLoadedRef = useRef(false);
  const hasSentAuthTokenRef = useRef(false);

  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const startLoadingTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('[WebView] loading timeout fallback');
      setLoading(false);
    }, 12000);
  };

  useEffect(() => {
    return () => {
      clearLoadingTimeout();
    };
  }, []);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const oldUrl = lastActiveUrlGlobal;
      const newUrl = url;
      
      const getTabNameFromUrl = (u: string) => {
        if (u.includes('tab=event')) return 'HomeTab (event)';
        if (u.includes('tab=market')) return 'MarketTab (market)';
        if (u.includes('tab=food')) return 'FoodTab (food)';
        if (u.includes('tab=cart')) return 'CartTab (cart)';
        if (u.includes('tab=profile')) return 'ProfileTab (profile)';
        return 'Unknown Tab';
      };

      const tabName = getTabNameFromUrl(newUrl);

      console.log('[Tabs] press:', tabName, url);
      console.log('[Tabs] transition details:', {
        tabName,
        urlToBeOpened: url,
        oldUrl,
        newUrl,
      });

      lastActiveUrlGlobal = url;
    }
  }, [isFocused, url]);

  useEffect(() => {
    hasSentAuthTokenRef.current = false;
    if (isWebViewLoadedRef.current && pendingAuthCustomToken) {
       injectAuthToken();
    }
  }, [pendingAuthCustomToken]);

  const injectAuthToken = () => {
    if (webViewRef.current && pendingAuthCustomToken && !hasSentAuthTokenRef.current) {
        const js = `
            (function() {
                window.postMessage(JSON.stringify({
                  source: 'gorodapp-mobile',
                  type: 'GORODAPP_MOBILE_AUTH_TOKEN',
                  payload: {
                    customToken: ${JSON.stringify(pendingAuthCustomToken)}
                  }
                }), '*');
            })();
            true;
        `;
        webViewRef.current.injectJavaScript(js);
        hasSentAuthTokenRef.current = true;
    }
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[WebView message]', JSON.stringify(message));
    } catch {
      console.log('[WebView message raw]', event.nativeEvent.data);
    }

    try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.source !== 'gorodapp-web') return;

        if (data.type === 'GORODAPP_WEB_AUTH_SUCCESS') {
            onWebAuthSuccess?.();
        } else if (data.type === 'GORODAPP_WEB_AUTH_ERROR') {
            onWebAuthError?.(data.error || 'auth_failed');
        }
    } catch {}
  };

  // Safely extracts hostname from a URL without relying on external URL polyfills
  const getHostname = (urlStr: string): string => {
    try {
      const match = urlStr.match(/^https?:\/\/([^/?#]+)/i);
      if (match && match[1]) {
        return match[1].split(':')[0].toLowerCase();
      }
      return '';
    } catch {
      return '';
    }
  };

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const targetUrl = request.url;
    console.log('[WebView] should start:', targetUrl);
    if (!targetUrl) return false;

    // 1. Internal special URLs/schemes
    if (targetUrl === 'about:blank' || targetUrl.startsWith('data:') || targetUrl.startsWith('blob:')) {
      console.log('[WebView] allow internal:', targetUrl);
      return true;
    }

    // 2. Allowed domains to stay inside the WebView (including Telegram OAuth)
    const hostname = getHostname(targetUrl);
    if (
      hostname === 'gorodapp.ru' ||
      hostname.endsWith('.gorodapp.ru') ||
      hostname === 'oauth.telegram.org' ||
      hostname.endsWith('.oauth.telegram.org') ||
      hostname === 'storage.yandexcloud.net' ||
      hostname.endsWith('.yandexcloud.net') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    ) {
      console.log('[WebView] allow internal:', targetUrl);
      return true;
    }

    // 3. Explicit check for Telegram Web / App Redirect Links to open them externally
    if (
      targetUrl.includes('://t.me/') || 
      targetUrl.includes('://www.t.me/') ||
      targetUrl.includes('://telegram.me/') ||
      targetUrl.includes('://www.telegram.me/')
    ) {
      console.log('[WebView] open external:', targetUrl);
      Linking.openURL(targetUrl).catch((err) =>
        console.warn('[WebView] Error opening Telegram URL externally:', targetUrl, err)
      );
      return false;
    }

    // Explicit check for Telegram Deep Links (tg://)
    if (targetUrl.startsWith('tg:')) {
      console.log('[WebView] open external:', targetUrl);
      Linking.openURL(targetUrl).catch((err) =>
        console.warn('[WebView] Error opening Telegram intent:', targetUrl, err)
      );
      return false;
    }

    // 4. Any other http/https external link: open in external browser
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      console.log('[WebView] open external:', targetUrl);
      Linking.openURL(targetUrl).catch((err) =>
        console.warn('[WebView] Error redirecting external link to browser:', targetUrl, err)
      );
      return false;
    }

    // 5. Non-http schemes (e.g., tel, mailto, sms, bank etc.) or unknown schemes
    console.log('[WebView] block unknown:', targetUrl);
    Linking.canOpenURL(targetUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(targetUrl);
        } else {
          console.warn('[WebView] Blocked unsupported non-http scheme:', targetUrl);
        }
      })
      .catch((err) => console.error('[WebView] Error checking URI scheme support:', err));
    return false;
  };

  const handleOpenWindow = (event: any) => {
    const targetUrl = event.nativeEvent.targetUrl;
    console.log('[WebView] open window:', targetUrl);
    
    if (!targetUrl) return;

    // If it is Telegram OAuth, open inside current WebView
    if (targetUrl.startsWith('https://oauth.telegram.org/')) {
      console.log('[WebView] open window internal oauth:', targetUrl);
      setCurrentUrl(targetUrl);
      return;
    }

    // If it is gorodapp.ru, open inside WebView
    if (targetUrl.startsWith('https://gorodapp.ru/') || targetUrl.includes('gorodapp.ru')) {
      console.log('[WebView] open window internal gorod:', targetUrl);
      setCurrentUrl(targetUrl);
      return;
    }

    // tg:// can open externally
    if (targetUrl.startsWith('tg:')) {
      console.log('[WebView] open window external tg:', targetUrl);
      Linking.openURL(targetUrl).catch((err) => {
        console.warn('[WebView] open window tg failed:', String(err));
      });
      return;
    }

    // t.me / telegram.me externally
    if (
      targetUrl.includes('://t.me/') ||
      targetUrl.includes('://www.t.me/') ||
      targetUrl.includes('://telegram.me/') ||
      targetUrl.includes('://www.telegram.me/')
    ) {
      console.log('[WebView] open window external telegram link:', targetUrl);
      Linking.openURL(targetUrl).catch((err) => {
        console.warn('[WebView] open window telegram link failed:', String(err));
      });
      return;
    }

    console.log('[WebView] open window external other:', targetUrl);
    Linking.openURL(targetUrl).catch((err) => {
      console.warn('[WebView] open window external failed:', String(err));
    });
  };

  const handleRetry = () => {
    setHasError(false);
    setLoading(true);
    setWebViewKey((prev) => prev + 1);
  };
  
  // Note: AppWebView does not support injectJavaScript for web preview.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          key={`iframe-${webViewKey}`}
          src={currentUrl}
          style={styles.webFrame}
          onLoad={() => setLoading(false)}
          onError={() => setHasError(true)}
        />
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}
        {hasError && (
          <View style={styles.errorContainer}>
            <ErrorView message="Не удалось загрузить страницу" onRetry={handleRetry} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        key={`webview-${webViewKey}`}
        source={{ uri: currentUrl }}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={true}
        onOpenWindow={handleOpenWindow}
        originWhitelist={[
          'https://gorodapp.ru/*',
          'https://*.gorodapp.ru/*',
          'https://oauth.telegram.org/*',
          'https://t.me/*',
          'https://www.t.me/*',
          'https://telegram.me/*',
          'https://www.telegram.me/*',
          'tg://*',
          'about:blank',
          'data:*',
          'blob:*'
        ]}
        webviewDebuggingEnabled={true}
        injectedJavaScriptBeforeContentLoaded={`
          (function() {
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            console.log = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_CONSOLE_LOG',
                payload: Array.from(arguments).map(String)
              }));
              originalLog.apply(console, arguments);
            };
            console.error = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_CONSOLE_ERROR',
                payload: Array.from(arguments).map(String)
              }));
              originalError.apply(console, arguments);
            };
            console.warn = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_CONSOLE_WARN',
                payload: Array.from(arguments).map(String)
              }));
              originalWarn.apply(console, arguments);
            };
            window.addEventListener('error', function(event) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_WINDOW_ERROR',
                payload: {
                  message: event.message,
                  filename: event.filename,
                  lineno: event.lineno,
                  colno: event.colno
                }
              }));
            });
            window.addEventListener('unhandledrejection', function(event) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_UNHANDLED_REJECTION',
                payload: String(event.reason)
              }));
            });
          })();
          true;
        `}
        onLoadStart={(event) => {
          console.log('[WebView] load start:', event.nativeEvent.url);
          setLoading(true);
          setHasError(false);
          startLoadingTimeout();
        }}
        onLoadEnd={(event) => {
            console.log('[WebView] load end:', event.nativeEvent.url);
            clearLoadingTimeout();
            setLoading(false);
            isWebViewLoadedRef.current = true;
            injectAuthToken();
        }}
        onHttpError={(event) => {
          console.log('[WebView] http error:', JSON.stringify(event.nativeEvent));
          clearLoadingTimeout();
          setLoading(false);
          setHasError(true);
        }}
        onError={(event) => {
          console.log('[WebView] error:', JSON.stringify(event.nativeEvent));
          clearLoadingTimeout();
          setLoading(false);
          setHasError(true);
        }}
        onNavigationStateChange={(navState) => {
          console.log('[WebView] navigation:', JSON.stringify({
            url: navState.url,
            loading: navState.loading,
            title: navState.title,
            canGoBack: navState.canGoBack,
          }));
          if (!navState.loading) {
            clearLoadingTimeout();
            setLoading(false);
          }
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleMessage}
        style={styles.webview}
        pullToRefreshEnabled={true}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
      {hasError && (
        <View style={styles.errorContainer}>
          <ErrorView message="Не удалось загрузить страницу" onRetry={handleRetry} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  webFrame: {
    borderWidth: 0,
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#ffffff',
  }
});

export default AppWebView;
