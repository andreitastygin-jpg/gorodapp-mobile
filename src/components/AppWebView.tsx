import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Linking, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { ErrorView } from './ui/ErrorView';

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
  
  const webViewRef = useRef<WebView>(null);
  const isWebViewLoadedRef = useRef(false);
  const hasSentAuthTokenRef = useRef(false);

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

  const isAllowedDomain = (targetUrl: string): boolean => {
    const hostname = getHostname(targetUrl);
    if (!hostname) return false;
    
    // Strict domain limits: only gorodapp.ru, yandexcloud.net components, and local developers
    return (
      hostname === 'gorodapp.ru' ||
      hostname.endsWith('.gorodapp.ru') ||
      hostname === 'storage.yandexcloud.net' ||
      hostname.endsWith('.yandexcloud.net') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  };

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const targetUrl = request.url;
    if (!targetUrl) return false;

    // Direct blank target or exact primary URL rendering
    if (targetUrl === 'about:blank' || targetUrl === url) {
      return true;
    }

    // Special messaging, banking, or application schemes
    const schemePattern = /^(tel|mailto|tg|bank|whatsapp|sms):/i;
    if (schemePattern.test(targetUrl)) {
      Linking.openURL(targetUrl).catch((err) =>
        console.warn('[WebView] Error opening custom intent URI:', targetUrl, err)
      );
      return false;
    }

    // Non-http schemes
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
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
    }

    // Allowed secure domains
    if (isAllowedDomain(targetUrl)) {
      return true;
    }

    // External HTTP/HTTPS links are safely passed to the default web browser instead of rendering inside App Webview
    Linking.openURL(targetUrl).catch((err) =>
      console.warn('[WebView] Error redirecting external link to browser:', targetUrl, err)
    );
    return false;
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
          src={url}
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
        source={{ uri: url }}
        onLoadStart={() => {
          setLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => {
            setLoading(false);
            isWebViewLoadedRef.current = true;
            injectAuthToken();
        }}
        onHttpError={() => setHasError(true)}
        onError={() => setHasError(true)}
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
