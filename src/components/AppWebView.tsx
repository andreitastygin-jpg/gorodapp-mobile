import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Linking, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ErrorView } from './ui/ErrorView';
import { useIsFocused } from '@react-navigation/native';

// Global variable to keep track of the previously visited URL to calculate tab transitions
let lastActiveUrlGlobal: string = 'https://gorodapp.ru?tab=event';

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

const FIREBASE_AUTH_DOMAIN =
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'gorod-bdd74.firebaseapp.com';

const isFirebaseAuthHelperUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname === FIREBASE_AUTH_DOMAIN &&
      parsed.pathname.startsWith('/__/auth/')
    );
  } catch {
    return false;
  }
};

const isAllowedTechnicalUrl = (url: string): boolean => {
  return (
    url === 'about:blank' ||
    url.startsWith('about:blank') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  );
};

const isInternalGorodUrl = (url: string): boolean => {
  const hostname = getHostname(url);
  return hostname === 'gorodapp.ru' || hostname.endsWith('.gorodapp.ru');
};

const isTelegramOAuthUrl = (url: string): boolean => {
  return url.startsWith('https://oauth.telegram.org/') || url.includes('oauth.telegram.org/auth');
};

const isTelegramExternalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      url.startsWith('tg://') ||
      hostname === 't.me' ||
      hostname === 'www.t.me' ||
      hostname.endsWith('.t.me') ||
      hostname === 'telegram.me' ||
      hostname === 'www.telegram.me' ||
      hostname.endsWith('.telegram.me')
    );
  } catch {
    return (
      url.startsWith('tg://') ||
      url.includes('://t.me/') ||
      url.includes('://www.t.me/') ||
      url.includes('://telegram.me/') ||
      url.includes('://www.telegram.me/')
    );
  }
};

const isTelegramCallbackUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'gorodapp.ru' || parsed.hostname.endsWith('.gorodapp.ru')) &&
      parsed.pathname === '/auth/telegram/callback'
    );
  } catch {
    return url.includes('gorodapp.ru/auth/telegram/callback');
  }
};

const IOS_SAFARI_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

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
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [showAuthFallback, setShowAuthFallback] = useState(false);

  const [debugInfo, setDebugInfo] = useState({
    mainUrl: '',
    authUrl: '',
    isAuthModalVisible: false,
    authTitle: '',
    lastShouldStartUrl: '',
    lastOpenWindowUrl: '',
    lastMessageType: '',
    lastDecision: '',
    lastError: '',
  });

  const updateDebug = (partial: Partial<typeof debugInfo>) => {
    setDebugInfo((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  useEffect(() => {
    updateDebug({
      authUrl: authUrl || '',
      isAuthModalVisible,
      mainUrl: currentUrl || '',
    });
  }, [authUrl, isAuthModalVisible, currentUrl]);

  useEffect(() => {
    if (!isAuthModalVisible || !authUrl || !isTelegramOAuthUrl(authUrl)) {
      setShowAuthFallback(false);
      return;
    }

    setShowAuthFallback(false);

    const timer = setTimeout(() => {
      setShowAuthFallback(true);
      updateDebug({ lastDecision: 'Auth fallback: show external open button' });
    }, 10000);

    return () => clearTimeout(timer);
  }, [isAuthModalVisible, authUrl]);

  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);
  
  const webViewRef = useRef<WebView>(null);
  const isWebViewLoadedRef = useRef(false);
  const hasSentAuthTokenRef = useRef(false);

  const openInternalUrl = (nextUrl: string) => {
    if (nextUrl === currentUrl) {
      console.log('[WebView] reloading current URL:', nextUrl);
      setLoading(true);
      setHasError(false);
      webViewRef.current?.reload();
    } else {
      console.log('[WebView] setting current URL:', nextUrl);
      setCurrentUrl(nextUrl);
      setLoading(true);
      setHasError(false);
    }
  };

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
    let data: any = null;
    try {
      data = JSON.parse(event.nativeEvent.data);
      console.log('[WebView message]', JSON.stringify(data));
      if (data && data.type) {
        updateDebug({ lastMessageType: `Main: ${data.type}` });
      }
    } catch {
      console.log('[WebView message raw]', event.nativeEvent.data);
    }

    if (data) {
      try {
        if (data.type === 'WEB_INJECT_READY') {
          console.log('[WebView message] WEB_INJECT_READY:', JSON.stringify(data));
          return;
        }
        if (data.type === 'DOM_AUTH_DIAGNOSTIC') {
          console.log('[WebView message] DOM_AUTH_DIAGNOSTIC:', JSON.stringify(data.payload));
          return;
        }
        if (data.type === 'WEB_GLOBAL_INTERACTION') {
          console.log('[WebView message] WEB_GLOBAL_INTERACTION:', JSON.stringify(data));
          return;
        }
        if (data.type === 'WEB_HISTORY_CHANGE') {
          console.log('[WebView message] WEB_HISTORY_CHANGE:', JSON.stringify(data));
          return;
        }
        if (data.type === 'TELEGRAM_IFRAME_FOUND' && data.url) {
          console.log('[WebView message] TELEGRAM_IFRAME_FOUND:', data.url);
          return;
        }
        if (data.type === 'TELEGRAM_IFRAME_CLICK' && data.url) {
          const nextUrl = String(data.url);
          console.log('[WebView message] TELEGRAM_IFRAME_CLICK:', nextUrl);
          updateDebug({
            lastOpenWindowUrl: `Iframe: ${nextUrl.slice(0, 100)}`,
          });

          if (isFirebaseAuthHelperUrl(nextUrl)) {
            console.log('[WebView] iframe Firebase helper ignored:', nextUrl);
            updateDebug({ lastDecision: 'Iframe Firebase helper: ignore' });
            return;
          }

          if (isTelegramOAuthUrl(nextUrl)) {
            console.log('[WebView] iframe Telegram OAuth: open modal:', nextUrl);
            updateDebug({ lastDecision: 'Iframe Telegram OAuth: open modal' });
            setAuthUrl(nextUrl);
            setIsAuthModalVisible(true);
            return;
          }

          if (isTelegramExternalUrl(nextUrl)) {
            console.log('[WebView] iframe Telegram external: open externally:', nextUrl);
            updateDebug({ lastDecision: 'Iframe Telegram Ext: open externally' });
            Linking.openURL(nextUrl).catch((err) => {
              console.warn('[WebView] iframe Telegram external failed:', String(err));
              updateDebug({ lastError: `Iframe TG external failed: ${String(err)}` });
            });
            return;
          }

          if (isInternalGorodUrl(nextUrl)) {
            console.log('[WebView] iframe Gorod internal:', nextUrl);
            updateDebug({ lastDecision: 'Iframe Gorod: open internal' });
            openInternalUrl(nextUrl);
            return;
          }

          if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
            console.log('[WebView] iframe external HTTP:', nextUrl);
            updateDebug({ lastDecision: 'Iframe HTTP: open external' });
            Linking.openURL(nextUrl).catch((err) => {
              console.warn('[WebView] iframe external HTTP failed:', String(err));
              updateDebug({ lastError: `Iframe HTTP failed: ${String(err)}` });
            });
            return;
          }

          console.log('[WebView] iframe unknown URL ignored:', nextUrl);
          updateDebug({ lastDecision: 'Iframe unknown: ignored' });
          return;
        }
        if (data.type === 'TELEGRAM_OAUTH_OPEN' && data.url) {
          console.log('[WebView message] TELEGRAM_OAUTH_OPEN:', data.url);
          console.log('[WebView] open auth modal:', data.url);
          setAuthUrl(data.url);
          setIsAuthModalVisible(true);
          return;
        }
        if (data.type === 'WEB_WINDOW_OPEN_FIREBASE_AUTH' && data.url) {
          console.log('[WebView message] ignore Firebase auth helper popup:', data.url);
          return;
        }
        if (data.type === 'WEB_WINDOW_OPEN_INTERNAL' && data.url) {
          const nextUrl = String(data.url);
          const hostname = getHostname(nextUrl);
          if (hostname === 'gorodapp.ru' || hostname.endsWith('.gorodapp.ru')) {
            console.log('[WebView] window.open internal gorod:', nextUrl);
            openInternalUrl(nextUrl);
            return;
          }
        }
        if (data.type === 'WEB_WINDOW_OPEN' && data.url) {
          console.log('[WebView message] WEB_WINDOW_OPEN:', data.url);
          if (data.url.startsWith('https://oauth.telegram.org/') || data.url.includes('oauth.telegram.org/auth')) {
            console.log('[WebView] WEB_WINDOW_OPEN intercept Telegram OAuth:', data.url);
            console.log('[WebView] open auth modal:', data.url);
            setAuthUrl(data.url);
            setIsAuthModalVisible(true);
            return;
          }
        }
        if (data.type === 'WEB_LINK_CLICK' && data.url) {
          console.log('[WebView message] WEB_LINK_CLICK:', data.url);
          if (data.url.startsWith('https://oauth.telegram.org/') || data.url.includes('oauth.telegram.org/auth')) {
            console.log('[WebView] WEB_LINK_CLICK intercept Telegram OAuth:', data.url);
            console.log('[WebView] open auth modal:', data.url);
            setAuthUrl(data.url);
            setIsAuthModalVisible(true);
            return;
          }
        }

        if (data.source === 'gorodapp-web') {
          if (data.type === 'GORODAPP_WEB_AUTH_SUCCESS') {
              onWebAuthSuccess?.();
          } else if (data.type === 'GORODAPP_WEB_AUTH_ERROR') {
              onWebAuthError?.(data.error || 'auth_failed');
          }
        }
      } catch (err) {
        console.error('[WebView] Error handling decoded message data:', err);
      }
    }
  };

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const targetUrl = request.url;
    console.log('[WebView] should start:', targetUrl);
    if (!targetUrl) return false;

    updateDebug({
      lastShouldStartUrl: targetUrl.slice(0, 120),
    });

    // 1. Technical URL
    if (isAllowedTechnicalUrl(targetUrl)) {
      console.log('[WebView] allow technical:', targetUrl);
      updateDebug({ lastDecision: 'Technical: allowed' });
      return true;
    }

    // 2. Firebase Auth Helper
    if (isFirebaseAuthHelperUrl(targetUrl)) {
      console.log('[WebView] allow Firebase auth helper:', targetUrl);
      updateDebug({ lastDecision: 'Firebase Helper: allowed' });
      return true;
    }

    // 3. Telegram OAuth -> open in modal
    if (isTelegramOAuthUrl(targetUrl)) {
      console.log('[WebView] intercept Telegram OAuth:', targetUrl);
      updateDebug({ lastDecision: 'Telegram OAuth: open in modal' });
      setAuthUrl(targetUrl);
      setIsAuthModalVisible(true);
      return false;
    }

    // 4. Internal Gorodapp
    if (isInternalGorodUrl(targetUrl)) {
      console.log('[WebView] allow internal Gorod:', targetUrl);
      updateDebug({ lastDecision: 'Internal Gorod: allowed' });
      return true;
    }

    // 5. Telegram external apps / intents
    if (isTelegramExternalUrl(targetUrl)) {
      console.log('[WebView] open Telegram externally:', targetUrl);
      updateDebug({ lastDecision: 'Telegram Ext: external browser/app' });
      Linking.openURL(targetUrl).catch((err) =>
        console.warn('[WebView] Error opening Telegram URL externally:', targetUrl, err)
      );
      return false;
    }

    // 6. Other allowed domains / hosts
    const hostname = getHostname(targetUrl);
    if (
      hostname === 'storage.yandexcloud.net' ||
      hostname.endsWith('.yandexcloud.net') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    ) {
      console.log('[WebView] allow allowed host:', targetUrl);
      updateDebug({ lastDecision: 'Allowed Host: allowed' });
      return true;
    }

    // 7. General http/https -> external
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      console.log('[WebView] open external HTTP/HTTPS:', targetUrl);
      updateDebug({ lastDecision: 'External HTTP: browser' });
      Linking.openURL(targetUrl).catch((err) =>
        console.warn('[WebView] Error redirecting external link to browser:', targetUrl, err)
      );
      return false;
    }

    // 8. Custom native schemes etc
    console.log('[WebView] handling native scheme:', targetUrl);
    updateDebug({ lastDecision: 'Native scheme: check/open' });
    Linking.canOpenURL(targetUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(targetUrl);
        } else {
          console.warn('[WebView] Unsupported native scheme:', targetUrl);
        }
      })
      .catch((err) => console.error('[WebView] Error checking native scheme:', err));
    return false;
  };

  const handleOpenWindow = (event: any) => {
    const targetUrl = event.nativeEvent.targetUrl;
    console.log('[WebView] open window:', targetUrl);
    
    if (!targetUrl) return;

    updateDebug({
      lastOpenWindowUrl: targetUrl.slice(0, 120),
    });

    if (isFirebaseAuthHelperUrl(targetUrl)) {
      console.log('[WebView] ignore Firebase auth helper popup:', targetUrl);
      updateDebug({ lastDecision: 'OpenWindow Firebase Helper: ignore' });
      return;
    }

    if (isTelegramOAuthUrl(targetUrl)) {
      console.log('[WebView] open window internal oauth:', targetUrl);
      updateDebug({ lastDecision: 'OpenWindow Telegram OAuth: open modal' });
      setAuthUrl(targetUrl);
      setIsAuthModalVisible(true);
      return;
    }

    if (isInternalGorodUrl(targetUrl)) {
      console.log('[WebView] open window internal gorod:', targetUrl);
      updateDebug({ lastDecision: 'OpenWindow Internal Gorod: load internal' });
      openInternalUrl(targetUrl);
      return;
    }

    if (isTelegramExternalUrl(targetUrl)) {
      console.log('[WebView] open window external telegram link:', targetUrl);
      updateDebug({ lastDecision: 'OpenWindow Telegram Ext: open externally' });
      Linking.openURL(targetUrl).catch((err) => {
        console.warn('[WebView] open window telegram link failed:', String(err));
      });
      return;
    }

    console.log('[WebView] open window external other:', targetUrl);
    updateDebug({ lastDecision: 'OpenWindow Other Ext: open externally' });
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
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        onOpenWindow={handleOpenWindow}
        originWhitelist={['*']}
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

            // Intercept window.open
            const originalOpen = window.open;
            window.open = function(url, target, features) {
              try {
                const targetUrl = String(url || '');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'WEB_WINDOW_OPEN',
                  url: targetUrl,
                  target: String(target || '')
                }));
                let absoluteUrl = targetUrl;
                try {
                  absoluteUrl = new URL(targetUrl, window.location.href).href;
                } catch (e) {}

                let isFirebaseAuthHelper = false;
                try {
                  const parsedUrl = new URL(absoluteUrl);
                  isFirebaseAuthHelper = (parsedUrl.hostname === '${FIREBASE_AUTH_DOMAIN}' && parsedUrl.pathname.indexOf('/__/auth/') === 0);
                } catch (e) {}

                if (isFirebaseAuthHelper) {
                  try {
                    var iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = absoluteUrl;
                    document.documentElement.appendChild(iframe);
                  } catch (e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'WEB_WINDOW_OPEN_FIREBASE_AUTH',
                      url: absoluteUrl
                    }));
                  }
                  return null;
                }

                let isInternalGorod = false;
                try {
                  const host = new URL(absoluteUrl).hostname;
                  isInternalGorod = (host === 'gorodapp.ru' || host.endsWith('.gorodapp.ru'));
                } catch (e) {}

                if (isInternalGorod) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEB_WINDOW_OPEN_INTERNAL',
                    url: absoluteUrl
                  }));
                  return null;
                }
                if (targetUrl.indexOf('https://oauth.telegram.org/') === 0) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'TELEGRAM_OAUTH_OPEN',
                    url: targetUrl
                  }));
                  return null;
                }
              } catch (e) {}
              return originalOpen.apply(window, arguments);
            };

            // Send WEB_INJECT_READY
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_INJECT_READY',
                href: window.location.href,
                hasReactNativeWebView: !!window.ReactNativeWebView
              }));
            } catch (e) {}

            // Track location/history changes
            try {
              const pushStateOrig = history.pushState;
              history.pushState = function() {
                const res = pushStateOrig.apply(history, arguments);
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEB_HISTORY_CHANGE',
                    method: 'pushState',
                    href: window.location.href,
                    arguments: Array.from(arguments).map(String)
                  }));
                } catch (e) {}
                return res;
              };

              const replaceStateOrig = history.replaceState;
              history.replaceState = function() {
                const res = replaceStateOrig.apply(history, arguments);
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEB_HISTORY_CHANGE',
                    method: 'replaceState',
                    href: window.location.href,
                    arguments: Array.from(arguments).map(String)
                  }));
                } catch (e) {}
                return res;
              };

              window.addEventListener('popstate', function(event) {
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEB_HISTORY_CHANGE',
                    method: 'popstate',
                    href: window.location.href
                  }));
                } catch (e) {}
              });
            } catch (e) {}

            // Track global interactions
            ['touchstart', 'click', 'pointerdown'].forEach(function(eventName) {
              document.addEventListener(eventName, function(event) {
                try {
                  const target = event.target;
                  if (!target) return;
                  const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
                  const closestLink = target.closest ? target.closest('a') : null;
                  const closestButton = target.closest ? target.closest('button') : null;
                  const closestIframe = target.closest ? target.closest('iframe') : null;
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEB_GLOBAL_INTERACTION',
                    eventName: eventName,
                    target: {
                      tagName: target.tagName,
                      id: target.id || '',
                      className: String(target.className || ''),
                      text: String(target.textContent || '').slice(0, 120),
                      href: target.href || '',
                      src: target.src || '',
                      rect: rect ? {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                      } : null
                    },
                    closestLink: closestLink ? {
                      href: closestLink.href || '',
                      target: closestLink.target || '',
                      text: String(closestLink.textContent || '').slice(0, 120)
                    } : null,
                    closestButton: closestButton ? {
                      text: String(closestButton.textContent || '').slice(0, 120),
                      id: closestButton.id || '',
                      className: String(closestButton.className || '')
                    } : null,
                    closestIframe: closestIframe ? {
                      src: closestIframe.src || '',
                      id: closestIframe.id || '',
                      className: String(closestIframe.className || ''),
                      title: closestIframe.title || ''
                    } : null
                  }));
                } catch (e) {}
              }, true);
            });

            // Intercept standard click links
            document.addEventListener('click', function(event) {
              const link = event.target && event.target.closest ? event.target.closest('a') : null;
              if (!link || !link.href) return;
              const href = String(link.href);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_LINK_CLICK',
                url: href,
                target: link.target || ''
              }));
              if (href.indexOf('https://oauth.telegram.org/') === 0) {
                event.preventDefault();
                event.stopPropagation();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'TELEGRAM_OAUTH_OPEN',
                  url: href
                }));
              }
            }, true);

            // Change target blank of Telegram OAuth to self
            function normalizeTelegramOAuthLinks() {
              document.querySelectorAll('a[href^="https://oauth.telegram.org/"]').forEach(function(a) {
                a.setAttribute('target', '_self');
                a.removeAttribute('rel');
              });
            }
            normalizeTelegramOAuthLinks();
            new MutationObserver(normalizeTelegramOAuthLinks).observe(document.documentElement, {
              childList: true,
              subtree: true
            });

            // Setup Telegram iframe detection and reporting without any overlays
            function reportTelegramIframes() {
              const iframes = document.querySelectorAll('iframe[src*="oauth.telegram.org"], iframe[src*="telegram.org"]');
              iframes.forEach(function(iframe) {
                if (iframe.getAttribute('data-gorod-telegram-reported') === 'true') {
                  return;
                }
                iframe.setAttribute('data-gorod-telegram-reported', 'true');
                const iframeSrc = iframe.getAttribute('src') || iframe.src;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'TELEGRAM_IFRAME_FOUND',
                  url: iframeSrc
                }));
              });
            }
            reportTelegramIframes();

            // Observe DOM changes to dynamically report newly loaded Telegram iframes
            new MutationObserver(function() {
              reportTelegramIframes();
            }).observe(document.documentElement, {
              childList: true,
              subtree: true
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

            // Run explicit post-load DOM diagnostics
            setTimeout(() => {
              const diagnosticJs = `
                (function() {
                  try {
                    const payload = {
                      href: window.location.href,
                      iframes: [],
                      links: [],
                      buttons: [],
                      authElements: []
                    };
                    document.querySelectorAll('iframe').forEach(function(iframe) {
                      const rect = iframe.getBoundingClientRect();
                      payload.iframes.push({
                        src: iframe.src || iframe.getAttribute('src') || '',
                        id: iframe.id || '',
                        className: String(iframe.className || ''),
                        title: iframe.title || '',
                        width: rect.width,
                        height: rect.height
                      });
                    });
                    document.querySelectorAll('a').forEach(function(a) {
                      const href = a.href || a.getAttribute('href') || '';
                      const text = String(a.textContent || '').trim().slice(0, 100);
                      if (href || text) {
                        payload.links.push({
                          href: href,
                          target: a.target || '',
                          text: text,
                          id: a.id || '',
                          className: String(a.className || '')
                        });
                      }
                    });
                    document.querySelectorAll('button').forEach(function(b) {
                      const rect = b.getBoundingClientRect();
                      payload.buttons.push({
                        text: String(b.textContent || '').trim().slice(0, 100),
                        id: b.id || '',
                        className: String(b.className || ''),
                        width: rect.width,
                        height: rect.height
                      });
                    });
                    const searchTerms = ['войти', 'telegram', 'login', 'sign in'];
                    const allElements = document.querySelectorAll('div, span, p, a, button, h1, h2, h3, h4, h5, h6, label');
                    allElements.forEach(function(el) {
                      const text = String(el.textContent || '').trim().toLowerCase();
                      if (text && searchTerms.some(term => text.includes(term))) {
                        if (el.children.length <= 5) {
                          const rect = el.getBoundingClientRect();
                          payload.authElements.push({
                            tagName: el.tagName,
                            text: String(el.textContent || '').trim().slice(0, 100),
                            id: el.id || '',
                            className: String(el.className || ''),
                            width: rect.width,
                            height: rect.height
                          });
                        }
                      }
                    });
                    payload.links = payload.links.slice(0, 50);
                    payload.buttons = payload.buttons.slice(0, 30);
                    payload.authElements = payload.authElements.slice(0, 30);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'DOM_AUTH_DIAGNOSTIC',
                      payload: payload
                    }));
                  } catch (e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'DOM_AUTH_DIAGNOSTIC_ERROR',
                      error: String(e.message)
                    }));
                  }
                })();
                true;
              `;
              webViewRef.current?.injectJavaScript(diagnosticJs);
            }, 1000);
        }}
        onHttpError={(event) => {
          const native = event.nativeEvent;
          const errorUrl = native.url || '';
          const statusCode = native.statusCode;

          console.log('[WebView] http error:', JSON.stringify(native));

          updateDebug({
            lastError: `Main HTTP error: status ${statusCode} url: ${errorUrl.slice(0, 100)}`,
          });

          if (isTelegramCallbackUrl(errorUrl) || isTelegramCallbackUrl(currentUrl)) {
            console.log('[WebView] ignore HTTP error on Telegram callback, let web app handle it:', errorUrl);
            setLoading(false);
            return;
          }

          if (isFirebaseAuthHelperUrl(errorUrl)) {
            console.log('[WebView] ignore HTTP error from Firebase helper:', errorUrl);
            setLoading(false);
            return;
          }

          const isLikelyMainDocument =
            isInternalGorodUrl(errorUrl) &&
            (errorUrl === currentUrl || currentUrl.startsWith(errorUrl) || errorUrl.startsWith(currentUrl));

          if (!isLikelyMainDocument) {
            console.log('[WebView] ignore subresource/API HTTP error:', errorUrl);
            setLoading(false);
            return;
          }

          clearLoadingTimeout();
          setLoading(false);
          setHasError(true);
        }}
        onError={(event) => {
          const native = event.nativeEvent;
          const errorUrl = native.url || '';
          console.log('[WebView] error:', JSON.stringify(native));
          updateDebug({
            lastError: `Main Error: ${native.description || 'unknown'} url: ${errorUrl.slice(0, 100)}`,
          });

          if (isTelegramCallbackUrl(errorUrl) || isTelegramCallbackUrl(currentUrl)) {
            console.log('[WebView] ignore error on Telegram callback, let web app handle it:', errorUrl);
            setLoading(false);
            return;
          }

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

      <Modal
        visible={isAuthModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          console.log('[AuthWebView] close and reload main webview (requestClose)');
          setIsAuthModalVisible(false);
          setAuthUrl(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {authUrl ? (
            <WebView
              source={{ uri: authUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              setSupportMultipleWindows={false}
              javaScriptCanOpenWindowsAutomatically={true}
              originWhitelist={['*']}
              userAgent={IOS_SAFARI_USER_AGENT}
              onNavigationStateChange={(navState) => {
                const url = navState.url || '';
                console.log('[AuthWebView] navigation:', url);
                console.log('[AuthWebView] navigation details:', JSON.stringify({
                  url: navState.url,
                  loading: navState.loading,
                  title: navState.title,
                }));
                updateDebug({ 
                  lastDecision: `Auth Nav: ${url.slice(0, 80)}`,
                  authTitle: navState.title || ''
                });
                
                if (isInternalGorodUrl(url)) {
                  console.log('[AuthWebView] returned to internal gorodapp:', url);
                  updateDebug({ lastDecision: 'Auth Nav Gorod: closing modal & load main' });
                  setIsAuthModalVisible(false);
                  setAuthUrl(null);
                  setTimeout(() => {
                    openInternalUrl(url);
                  }, 300);
                }
              }}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url || '';
                console.log('[AuthWebView] should start:', url);
                updateDebug({ lastShouldStartUrl: `Auth: ${url.slice(0, 80)}` });

                if (isAllowedTechnicalUrl(url)) {
                  console.log('[AuthWebView] allow technical:', url);
                  updateDebug({ lastDecision: 'Auth shouldStart: technical allowed' });
                  return true;
                }

                if (isFirebaseAuthHelperUrl(url)) {
                  console.log('[AuthWebView] allow Firebase auth helper:', url);
                  updateDebug({ lastDecision: 'Auth shouldStart: Firebase helper allowed' });
                  return true;
                }

                if (isTelegramOAuthUrl(url)) {
                  console.log('[AuthWebView] allow Telegram OAuth:', url);
                  updateDebug({ lastDecision: 'Auth shouldStart: Telegram OAuth allowed' });
                  return true;
                }

                if (isInternalGorodUrl(url)) {
                  console.log('[AuthWebView] returned to internal gorodapp:', url);
                  updateDebug({ lastDecision: 'Auth shouldStart: Gorod internal closing modal' });
                  setIsAuthModalVisible(false);
                  setAuthUrl(null);
                  setTimeout(() => {
                    openInternalUrl(url);
                  }, 300);
                  return false;
                }

                if (isTelegramExternalUrl(url)) {
                  console.log('[AuthWebView] open external telegram:', url);
                  updateDebug({ lastDecision: 'Auth shouldStart: Telegram Ext: open externally' });
                  Linking.openURL(url).catch((err) => {
                    console.log('[AuthWebView] telegram open failed:', String(err));
                    updateDebug({ lastError: `TG external load failed: ${String(err)}` });
                  });
                  return false;
                }

                if (url.startsWith('http://') || url.startsWith('https://')) {
                  console.log('[AuthWebView] open general HTTP externally:', url);
                  updateDebug({ lastDecision: 'Auth shouldStart: HTTP general open externally' });
                  Linking.openURL(url).catch((err) => {
                    console.log('[AuthWebView] general HTTP open failed:', String(err));
                  });
                  return false;
                }

                return false;
              }}
              onOpenWindow={(event) => {
                const targetUrl = event.nativeEvent.targetUrl;
                console.log('[AuthWebView] open window:', targetUrl);
                if (!targetUrl) return;

                updateDebug({ lastOpenWindowUrl: `Auth: ${targetUrl.slice(0, 100)}` });

                if (isFirebaseAuthHelperUrl(targetUrl)) {
                  console.log('[AuthWebView] ignore Firebase auth helper popup:', targetUrl);
                  updateDebug({ lastDecision: 'Auth OpenWindow Firebase: ignore' });
                  return;
                }

                if (isTelegramOAuthUrl(targetUrl)) {
                  console.log('[AuthWebView] set auth url for Telegram OAuth window.open:', targetUrl);
                  updateDebug({ lastDecision: 'Auth OpenWindow Telegram OAuth: load inside' });
                  setAuthUrl(targetUrl);
                  return;
                }

                if (isInternalGorodUrl(targetUrl)) {
                  console.log('[AuthWebView] returned to internal gorodapp from openWindow:', targetUrl);
                  updateDebug({ lastDecision: 'Auth OpenWindow Gorod: closing modal & load main' });
                  setIsAuthModalVisible(false);
                  setAuthUrl(null);
                  setTimeout(() => {
                    openInternalUrl(targetUrl);
                  }, 300);
                  return;
                }

                if (isTelegramExternalUrl(targetUrl)) {
                  console.log('[AuthWebView] open external telegram link from openWindow:', targetUrl);
                  updateDebug({ lastDecision: 'Auth OpenWindow Telegram Ext: open externally' });
                  Linking.openURL(targetUrl).catch((err) => {
                    console.log('[AuthWebView] telegram open failed:', String(err));
                  });
                  return;
                }

                if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
                  console.log('[AuthWebView] open window HTTP externally:', targetUrl);
                  updateDebug({ lastDecision: 'Auth OpenWindow HTTP: open externally' });
                  Linking.openURL(targetUrl).catch((err) => {
                    console.log('[AuthWebView] open window failed:', String(err));
                  });
                  return;
                }
              }}
              onHttpError={(event) => {
                console.log('[AuthWebView] HTTP error:', JSON.stringify(event.nativeEvent));
                updateDebug({ lastError: `Auth HTTP Error: Status ${event.nativeEvent.statusCode}` });
              }}
              onError={(event) => {
                console.log('[AuthWebView] error:', JSON.stringify(event.nativeEvent));
                updateDebug({ lastError: `Auth Error: ${event.nativeEvent.description || 'unknown'}` });
              }}
              injectedJavaScriptBeforeContentLoaded={`
                (function() {
                  const originalOpen = window.open;
                  window.open = function(url, target, features) {
                    try {
                      const targetUrl = String(url || '');
                      let absoluteUrl = targetUrl;
                      try {
                        absoluteUrl = new URL(targetUrl, window.location.href).href;
                      } catch (e) {}

                      let isFirebaseAuthHelper = false;
                      try {
                        const parsedUrl = new URL(absoluteUrl);
                        isFirebaseAuthHelper = (parsedUrl.hostname === '${FIREBASE_AUTH_DOMAIN}' && parsedUrl.pathname.indexOf('/__/auth/') === 0);
                      } catch (e) {}

                      if (isFirebaseAuthHelper) {
                        try {
                          var iframe = document.createElement('iframe');
                          iframe.style.display = 'none';
                          iframe.src = absoluteUrl;
                          document.documentElement.appendChild(iframe);
                        } catch (e) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'AUTH_WINDOW_OPEN_FIREBASE_AUTH',
                            url: absoluteUrl
                          }));
                        }
                        return null;
                      }

                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'AUTH_WINDOW_OPEN',
                        url: absoluteUrl,
                        target: String(target || '')
                      }));

                      let isInternalGorod = false;
                      try {
                        const host = new URL(absoluteUrl).hostname;
                        isInternalGorod = (host === 'gorodapp.ru' || host.endsWith('.gorodapp.ru'));
                      } catch (e) {}

                      if (
                        targetUrl.indexOf('https://oauth.telegram.org') === 0 ||
                        targetUrl.indexOf('https://t.me') === 0 ||
                        targetUrl.indexOf('https://www.t.me') === 0 ||
                        targetUrl.indexOf('https://telegram.me') === 0 ||
                        targetUrl.indexOf('https://www.telegram.me') === 0 ||
                        isInternalGorod
                      ) {
                        return null;
                      }
                    } catch (e) {}
                    return originalOpen.apply(window, arguments);
                  };
                })();
                true;
              `}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log('[AuthWebView message]', JSON.stringify(data));
                  if (data && data.type) {
                    updateDebug({ lastMessageType: `Auth: ${data.type}` });
                  }

                  if (data.type === 'AUTH_WINDOW_OPEN_FIREBASE_AUTH' && data.url) {
                    console.log('[AuthWebView] ignore Firebase auth helper popup:', data.url);
                    updateDebug({ lastDecision: 'Auth Msg Firebase Helper: ignore' });
                    return;
                  }

                  if (data.type === 'AUTH_WINDOW_OPEN' && data.url) {
                    const url = String(data.url);
                    updateDebug({ lastOpenWindowUrl: `Auth Msg: ${url.slice(0, 80)}` });

                    if (isFirebaseAuthHelperUrl(url)) {
                      console.log('[AuthWebView] ignore Firebase auth helper popup inside message:', url);
                      updateDebug({ lastDecision: 'Auth Msg Firebase helper inside AUTH_WINDOW_OPEN: ignore' });
                      return;
                    }

                    if (isTelegramOAuthUrl(url)) {
                      console.log('[AuthWebView] load Telegram OAuth from window.open:', url);
                      updateDebug({ lastDecision: 'Auth Msg Telegram OAuth: load inside' });
                      setAuthUrl(url);
                      return;
                    }

                    if (isInternalGorodUrl(url)) {
                      console.log('[AuthWebView] returned to internal gorodapp from message:', url);
                      updateDebug({ lastDecision: 'Auth Msg Gorod: close modal & load main' });
                      setIsAuthModalVisible(false);
                      setAuthUrl(null);
                      setTimeout(() => {
                        openInternalUrl(url);
                      }, 300);
                      return;
                    }

                    if (isTelegramExternalUrl(url)) {
                      console.log('[AuthWebView] open external telegram link from message:', url);
                      updateDebug({ lastDecision: 'Auth Msg Telegram Ext: open externally' });
                      Linking.openURL(url).catch((err) => {
                        console.log('[AuthWebView] telegram open failed:', String(err));
                      });
                      return;
                    }

                    if (url.startsWith('http://') || url.startsWith('https://')) {
                      console.log('[AuthWebView] open message HTTP externally:', url);
                      updateDebug({ lastDecision: 'Auth Msg HTTP: open externally' });
                      Linking.openURL(url).catch((err) => {
                        console.log('[AuthWebView] message open failed:', String(err));
                      });
                      return;
                    }
                  }
                } catch (err) {
                  console.log('[AuthWebView message raw]', event.nativeEvent.data);
                }
              }}
            />
          ) : null}

          {/* Fallback button when Telegram loads slowly */}
          {showAuthFallback && authUrl ? (
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => {
                console.log('[AuthWebView] Fallback clicked - opening externally:', authUrl);
                updateDebug({ lastDecision: 'Auth fallback: clicked open externally' });
                
                Linking.openURL(authUrl).catch((err) => {
                  console.log('[AuthWebView] external auth fallback failed:', String(err));
                  updateDebug({ lastError: `Auth fallback failed: ${String(err)}` });
                });

                setIsAuthModalVisible(false);
                setAuthUrl(null);
              }}
            >
              <Text style={styles.fallbackButtonText}>Открыть Telegram</Text>
            </TouchableOpacity>
          ) : null}

          {/* Temporary Debug Overlay inside Modal */}
          <View style={styles.debugOverlay} pointerEvents="none">
            <Text style={styles.debugText} numberOfLines={1}>
              mainUrl: {debugInfo.mainUrl ? debugInfo.mainUrl.slice(0, 120) : 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              authUrl: {debugInfo.authUrl ? debugInfo.authUrl.slice(0, 120) : 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              authTitle: {debugInfo.authTitle || 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              isAuthModalVisible: {debugInfo.isAuthModalVisible ? 'true' : 'false'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              lastShouldStartUrl: {debugInfo.lastShouldStartUrl ? debugInfo.lastShouldStartUrl.slice(0, 120) : 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              lastOpenWindowUrl: {debugInfo.lastOpenWindowUrl ? debugInfo.lastOpenWindowUrl.slice(0, 120) : 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              lastMessageType: {debugInfo.lastMessageType || 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              lastDecision: {debugInfo.lastDecision || 'none'}
            </Text>
            <Text style={styles.debugText} numberOfLines={1}>
              lastError: {debugInfo.lastError || 'none'}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Temporary Debug Overlay */}
      <View style={styles.debugOverlay} pointerEvents="none">
        <Text style={styles.debugText} numberOfLines={1}>
          mainUrl: {debugInfo.mainUrl ? debugInfo.mainUrl.slice(0, 120) : 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          authUrl: {debugInfo.authUrl ? debugInfo.authUrl.slice(0, 120) : 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          authTitle: {debugInfo.authTitle || 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          isAuthModalVisible: {debugInfo.isAuthModalVisible ? 'true' : 'false'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          lastShouldStartUrl: {debugInfo.lastShouldStartUrl ? debugInfo.lastShouldStartUrl.slice(0, 120) : 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          lastOpenWindowUrl: {debugInfo.lastOpenWindowUrl ? debugInfo.lastOpenWindowUrl.slice(0, 120) : 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          lastMessageType: {debugInfo.lastMessageType || 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          lastDecision: {debugInfo.lastDecision || 'none'}
        </Text>
        <Text style={styles.debugText} numberOfLines={1}>
          lastError: {debugInfo.lastError || 'none'}
        </Text>
      </View>
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
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.80)',
    padding: 8,
    zIndex: 9999,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  fallbackButton: {
    position: 'absolute',
    top: '45%',
    left: '10%',
    right: '10%',
    backgroundColor: '#229ED9', // Telegram blue style
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fallbackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default AppWebView;
