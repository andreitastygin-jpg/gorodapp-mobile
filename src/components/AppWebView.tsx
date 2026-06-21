import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ErrorView } from './ui/ErrorView';
import { useIsFocused } from '@react-navigation/native';

// Global variable to keep track of the previously visited URL to calculate tab transitions
let lastActiveUrlGlobal: string = 'https://gorodapp.ru?tab=event';

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
          console.log('[WebView message] TELEGRAM_IFRAME_CLICK:', data.url);
          console.log('[WebView] open auth modal from iframe:', data.url);
          setAuthUrl(data.url);
          setIsAuthModalVisible(true);
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

    // Intercept Telegram OAuth on the main WebView to keep the main WebView on gorodapp.ru
    if (targetUrl.startsWith('https://oauth.telegram.org/') || targetUrl.includes('oauth.telegram.org/auth')) {
      console.log('[WebView] intercept Telegram OAuth:', targetUrl);
      console.log('[WebView] open auth modal:', targetUrl);
      setAuthUrl(targetUrl);
      setIsAuthModalVisible(true);
      return false;
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

    if (isFirebaseAuthHelperUrl(targetUrl)) {
      console.log('[WebView] allow Firebase auth helper:', targetUrl);
      return true;
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

    if (isFirebaseAuthHelperUrl(targetUrl)) {
      console.log('[WebView] ignore Firebase auth helper popup:', targetUrl);
      return;
    }

    // If it is Telegram OAuth, open inside auth modal
    if (targetUrl.startsWith('https://oauth.telegram.org/')) {
      console.log('[WebView] open window internal oauth:', targetUrl);
      setAuthUrl(targetUrl);
      setIsAuthModalVisible(true);
      return;
    }

    // If it is gorodapp.ru, open inside WebView
    const hostname = getHostname(targetUrl);
    if (hostname === 'gorodapp.ru' || hostname.endsWith('.gorodapp.ru')) {
      console.log('[WebView] open window internal gorod:', targetUrl);
      openInternalUrl(targetUrl);
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

            // Setup Telegram iframe overlay detection and positioning
            function setupTelegramIframeOverlay() {
              const iframes = document.querySelectorAll('iframe[src*="oauth.telegram.org"], iframe[src*="telegram.org"]');
              iframes.forEach(function(iframe) {
                if (iframe.getAttribute('data-gorod-telegram-overlay') === 'true') {
                  return;
                }
                iframe.setAttribute('data-gorod-telegram-overlay', 'true');
                const iframeSrc = iframe.getAttribute('src') || iframe.src;
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'TELEGRAM_IFRAME_FOUND',
                  url: iframeSrc
                }));

                const parent = iframe.parentNode;
                if (parent) {
                  const parentStyle = window.getComputedStyle(parent);
                  if (parentStyle.position === 'static') {
                    parent.style.position = 'relative';
                  }
                  
                  const overlay = document.createElement('div');
                  overlay.style.position = 'absolute';
                  overlay.style.top = iframe.offsetTop + 'px';
                  overlay.style.left = iframe.offsetLeft + 'px';
                  overlay.style.width = (iframe.offsetWidth || 200) + 'px';
                  overlay.style.height = (iframe.offsetHeight || 40) + 'px';
                  overlay.style.zIndex = '999999';
                  overlay.style.cursor = 'pointer';
                  overlay.style.background = 'rgba(0,0,0,0)';
                  overlay.className = 'telegram-iframe-click-overlay';
                  
                  overlay.addEventListener('click', function(e) {
                    console.log('[Overlay] Clicked overlay on Telegram iframe:', iframeSrc);
                    e.preventDefault();
                    e.stopPropagation();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'TELEGRAM_IFRAME_CLICK',
                      url: iframeSrc
                    }));
                  }, true);
                  
                  parent.appendChild(overlay);
                  console.log('[Overlay Setup] Overlay created for:', iframeSrc);
                }
              });
            }
            setupTelegramIframeOverlay();

            // Observe DOM changes to dynamically inject overlays for newly loaded Telegram iframes
            new MutationObserver(function() {
              setupTelegramIframeOverlay();
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
              onNavigationStateChange={(navState) => {
                const url = navState.url || '';
                console.log('[AuthWebView] navigation:', url);
                console.log('[AuthWebView] navigation details:', JSON.stringify({
                  url: navState.url,
                  loading: navState.loading,
                  title: navState.title,
                }));
                const hostname = getHostname(url);
                if (hostname === 'gorodapp.ru' || hostname.endsWith('.gorodapp.ru')) {
                  console.log('[AuthWebView] returned to internal gorodapp:', url);
                  console.log('[AuthWebView] close and open in main webview');
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
                if (
                  url.startsWith('about:blank') ||
                  url.startsWith('data:') ||
                  url.startsWith('blob:')
                ) {
                  return true;
                }
                if (isFirebaseAuthHelperUrl(url)) {
                  console.log('[AuthWebView] allow Firebase auth helper:', url);
                  return true;
                }
                const authHostname = getHostname(url);
                const isInternalAuthGorod = authHostname === 'gorodapp.ru' || authHostname.endsWith('.gorodapp.ru');
                if (url.startsWith('https://oauth.telegram.org')) {
                  return true;
                }
                if (isInternalAuthGorod) {
                  console.log('[AuthWebView] intercept loading internal URL in modal, open in main:', url);
                  setIsAuthModalVisible(false);
                  setAuthUrl(null);
                  setTimeout(() => {
                    openInternalUrl(url);
                  }, 300);
                  return false;
                }
                if (
                  url.startsWith('tg://')
                ) {
                  console.log('[AuthWebView] open external tg scheme:', url);
                  Linking.openURL(url).catch((err) => {
                    console.log('[AuthWebView] open external failed:', String(err));
                  });
                  return false;
                }
                if (
                  url.startsWith('https://t.me/') ||
                  url.startsWith('https://www.t.me/') ||
                  url.startsWith('https://telegram.me/') ||
                  url.startsWith('https://www.telegram.me/') ||
                  url.includes('://t.me/') ||
                  url.includes('://www.t.me/') ||
                  url.includes('://telegram.me/') ||
                  url.includes('://www.telegram.me/')
                ) {
                  console.log('[AuthWebView] allow telegram web inside modal:', url);
                  return true;
                }
                return true;
              }}
              onOpenWindow={(event) => {
                const targetUrl = event.nativeEvent.targetUrl;
                console.log('[AuthWebView] open window:', targetUrl);
                if (targetUrl && isFirebaseAuthHelperUrl(targetUrl)) {
                  console.log('[AuthWebView] ignore Firebase auth helper popup:', targetUrl);
                  return;
                }
                if (targetUrl?.startsWith('https://oauth.telegram.org')) {
                  setAuthUrl(targetUrl);
                  return;
                }
                if (
                  targetUrl?.startsWith('https://t.me') ||
                  targetUrl?.startsWith('https://www.t.me') ||
                  targetUrl?.startsWith('https://telegram.me') ||
                  targetUrl?.startsWith('https://www.telegram.me')
                ) {
                  console.log('[AuthWebView] open window internal telegram web:', targetUrl);
                  setAuthUrl(targetUrl);
                  return;
                }
                if (targetUrl?.startsWith('tg://')) {
                  Linking.openURL(targetUrl).catch((err) => {
                    console.log('[AuthWebView] tg open failed:', String(err));
                  });
                  return;
                }
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
                  if (data.type === 'AUTH_WINDOW_OPEN_FIREBASE_AUTH' && data.url) {
                    console.log('[AuthWebView] ignore Firebase auth helper popup:', data.url);
                    return;
                  }
                  if (data.type === 'AUTH_WINDOW_OPEN' && data.url) {
                    const url = String(data.url);
                    const hostname = getHostname(url);
                    const isInternalGorod = hostname === 'gorodapp.ru' || hostname.endsWith('.gorodapp.ru');
                    
                    if (isInternalGorod) {
                      console.log('[AuthWebView] window.open internal gorodapp URL inside auth modal, closing auth modal and opening in main webview:', url);
                      setIsAuthModalVisible(false);
                      setAuthUrl(null);
                      setTimeout(() => {
                        openInternalUrl(url);
                      }, 300);
                    } else if (
                      url.startsWith('https://oauth.telegram.org') ||
                      url.startsWith('https://t.me') ||
                      url.startsWith('https://www.t.me') ||
                      url.startsWith('https://telegram.me') ||
                      url.startsWith('https://www.telegram.me')
                    ) {
                      console.log('[AuthWebView] set auth url from window.open:', url);
                      setAuthUrl(url);
                    }
                  }
                } catch (err) {
                  console.log('[AuthWebView message raw]', event.nativeEvent.data);
                }
              }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
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
