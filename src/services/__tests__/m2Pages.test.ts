// M2 (2026-10-22): found on the iPhone simulator -
//  1) a tapped notification that started the app opened the home page, not its page;
//  2) the same link (gorodapp://market, a QR code) or a notification with the same
//     page opened a second time did nothing - the address had not "changed";
//  3) a page of the site in a new window (target=_blank) recreated the WebView and
//     lost the history for Back.
import { readFileSync } from 'fs';
import { join } from 'path';
import { SITE_URL } from '../linkPolicy';
import { firstPage, nextPage, notificationOpen } from '../pageRequests';

const TAP = 'expo.modules.notifications.actions.DEFAULT';
const tapped = (id: string, data: Record<string, unknown> | null, action = TAP) => ({
  actionIdentifier: action,
  notification: { request: { identifier: id, content: { data } } },
});

describe('pages opened from outside', () => {
  test('the app starts with the address it was opened with', () => {
    expect(firstPage(null)).toEqual({ url: SITE_URL, id: 0 });
    expect(firstPage('gorodapp://market')).toEqual({ url: 'https://gorodapp.ru/?tab=market', id: 0 });
    expect(firstPage('https://gorodapp.ru/?code=QR1')).toEqual({ url: 'https://gorodapp.ru/?code=QR1', id: 0 });
    expect(firstPage('https://evil.com/')).toEqual({ url: SITE_URL, id: 0 });
  });

  test('the same address opened twice is two openings', () => {
    const start = firstPage(null);
    const once = nextPage(start, 'gorodapp://market');
    const twice = nextPage(once, 'gorodapp://market');
    expect(once.url).toBe('https://gorodapp.ru/?tab=market');
    expect(twice.url).toBe(once.url);
    expect(twice.id).not.toBe(once.id);
  });

  test('addresses that are not the site keep the current page', () => {
    const start = firstPage(null);
    expect(nextPage(start, 'https://evil.com/?tab=market')).toBe(start);
    expect(nextPage(start, null)).toBe(start);
  });
});

describe('tapped notifications', () => {
  test('a tap on a notification with a page of the site opens it', () => {
    expect(notificationOpen(tapped('n1', { url: 'https://gorodapp.ru/?tab=profile' }), TAP)).toEqual({
      url: 'https://gorodapp.ru/?tab=profile',
      key: 'n1',
    });
  });

  test('two notifications with the same page are two openings', () => {
    const a = notificationOpen(tapped('n1', { url: 'https://gorodapp.ru/?tab=profile' }), TAP);
    const b = notificationOpen(tapped('n2', { url: 'https://gorodapp.ru/?tab=profile' }), TAP);
    expect(a?.url).toBe(b?.url);
    expect(a?.key).not.toBe(b?.key);
  });

  test('nothing to open: no response yet, another action, no page, not the site', () => {
    expect(notificationOpen(undefined, TAP)).toBeNull();
    expect(notificationOpen(null, TAP)).toBeNull();
    expect(notificationOpen(tapped('n1', { url: 'https://gorodapp.ru/' }, 'dismiss'), TAP)).toBeNull();
    expect(notificationOpen(tapped('n1', {}), TAP)).toBeNull();
    expect(notificationOpen(tapped('n1', null), TAP)).toBeNull();
    expect(notificationOpen(tapped('n1', { url: 42 }), TAP)).toBeNull();
    expect(notificationOpen(tapped('n1', { url: 'https://evil.com/' }), TAP)).toBeNull();
  });
});

// The screens are not rendered in these tests (no React Native renderer in the
// project); the wiring was checked on the simulator. These guard against putting
// back the code that had the defects.
describe('wiring', () => {
  const source = (path: string) => readFileSync(join(__dirname, '..', '..', '..', path), 'utf8');

  test('the notification that started the app is read, not only later taps', () => {
    expect(source('App.tsx')).toMatch(/useLastNotificationResponse\(\)/);
  });

  test('every link event opens its page; the deprecated useURL (same link = no change) is not used', () => {
    const navigator = source('src/navigation/AppNavigator.tsx');
    expect(navigator).toMatch(/Linking\.addEventListener\('url'/);
    expect(navigator).not.toMatch(/useURL/);
  });

  test('the WebView is recreated for each new page request, not for a new window of the site', () => {
    const webView = source('src/components/AppWebView.tsx');
    expect(webView).toMatch(/key=\{`webview-\$\{page\.id\}/);
    expect(webView).toMatch(/onOpenWindow[\s\S]*injectJavaScript/);
  });
});
