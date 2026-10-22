// M1 (2026-10-22): the app is the site in one WebView; the site owns the login.
//  - links: gorodapp.ru opens inside, everything else leaves for the phone's apps;
//  - gorodapp://market and https://gorodapp.ru links open the matching page;
//  - the site's login / logout messages register / unregister the phone for notifications.
jest.mock('expo-notifications', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getPermissionsAsync: jest.fn(),
}));
jest.mock('../pushNotifications', () => ({
  registerDevicePushToken: jest.fn(async () => ({ success: true })),
  bootstrapDevicePushToken: jest.fn(async () => {}),
  unregisterDevicePushToken: jest.fn(async () => true),
}));
jest.mock('../mobileAuth', () => ({
  saveUserAccessToken: jest.fn(async () => {}),
  clearMobileAuthSession: jest.fn(async () => {}),
}));

import * as Notifications from 'expo-notifications';
import { linkDecision, siteUrlForIncoming, SITE_URL } from '../linkPolicy';
import { handleWebSessionMessage, parseWebSessionMessage, resetWebSessionState } from '../webSession';
import { registerDevicePushToken, bootstrapDevicePushToken, unregisterDevicePushToken } from '../pushNotifications';
import { saveUserAccessToken, clearMobileAuthSession } from '../mobileAuth';

const perm = Notifications.getPermissionsAsync as jest.Mock;
const msg = (o: Record<string, unknown>) => JSON.stringify({ source: 'gorodapp-web', ...o });

beforeEach(() => {
  jest.clearAllMocks();
  resetWebSessionState();
});

describe('links', () => {
  test.each([
    ['https://gorodapp.ru/?tab=market', 'load'],
    ['https://www.gorodapp.ru/', 'load'],
    ['about:blank', 'load'],
    ['blob:https://gorodapp.ru/x', 'load'],
    ['http://gorodapp.ru/', 'external'], // not https
    ['https://seller.gorodapp.ru/', 'external'],
    ['https://gorodapp.ru.evil.com/', 'external'],
    ['https://instagram.com/outlet', 'external'],
    ['https://storage.yandexcloud.net/assets/x.pdf', 'external'],
    ['tel:+79990000000', 'external'],
    ['mailto:gorodapp.info@yandex.ru', 'external'],
  ])('%s -> %s', (url, decision) => expect(linkDecision(url)).toBe(decision));

  test('incoming addresses open the matching page', () => {
    expect(siteUrlForIncoming('gorodapp://market')).toBe('https://gorodapp.ru/?tab=market');
    expect(siteUrlForIncoming('gorodapp:///food')).toBe('https://gorodapp.ru/?tab=food');
    expect(siteUrlForIncoming('gorodapp://')).toBe(SITE_URL);
    expect(siteUrlForIncoming('https://gorodapp.ru/?code=QR123')).toBe('https://gorodapp.ru/?code=QR123');
    expect(siteUrlForIncoming('https://evil.com/?code=1')).toBeNull();
    expect(siteUrlForIncoming(null)).toBeNull();
  });
});

describe('site login -> notifications', () => {
  test('only messages from the site with a token are accepted', () => {
    expect(parseWebSessionMessage(msg({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T1' }))).toEqual({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T1' });
    expect(parseWebSessionMessage(msg({ type: 'GORODAPP_WEB_LOGOUT' }))).toEqual({ type: 'GORODAPP_WEB_LOGOUT' });
    expect(parseWebSessionMessage(msg({ type: 'GORODAPP_WEB_SESSION', accessToken: ' ' }))).toBeNull();
    expect(parseWebSessionMessage(JSON.stringify({ source: 'other', type: 'GORODAPP_WEB_LOGOUT' }))).toBeNull();
    expect(parseWebSessionMessage('not json')).toBeNull();
  });

  test('first login: the token is kept and notifications are asked for once', async () => {
    perm.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    await handleWebSessionMessage({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T1' });
    expect(saveUserAccessToken).toHaveBeenCalledWith('T1');
    expect(registerDevicePushToken).toHaveBeenCalledWith({ forceRequestPermission: true, enabled: true });

    // a refreshed token: kept, nothing asked again
    await handleWebSessionMessage({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T2' });
    expect(saveUserAccessToken).toHaveBeenLastCalledWith('T2');
    expect(registerDevicePushToken).toHaveBeenCalledTimes(1);
  });

  test('already answered (granted or denied): no question, the registration is only kept up to date', async () => {
    perm.mockResolvedValue({ status: 'denied', canAskAgain: false });
    await handleWebSessionMessage({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T1' });
    expect(registerDevicePushToken).not.toHaveBeenCalled();
    expect(bootstrapDevicePushToken).toHaveBeenCalledTimes(1);
  });

  test('logout: the phone is unregistered, then the token is forgotten', async () => {
    perm.mockResolvedValue({ status: 'granted', canAskAgain: true });
    await handleWebSessionMessage({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T1' });
    await handleWebSessionMessage({ type: 'GORODAPP_WEB_LOGOUT' });
    expect(unregisterDevicePushToken).toHaveBeenCalledTimes(1);
    expect((unregisterDevicePushToken as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((clearMobileAuthSession as jest.Mock).mock.invocationCallOrder[0]);
  });

  test('logout without a login: nothing to unregister', async () => {
    await handleWebSessionMessage({ type: 'GORODAPP_WEB_LOGOUT' });
    expect(unregisterDevicePushToken).not.toHaveBeenCalled();
    expect(clearMobileAuthSession).toHaveBeenCalled();
  });

  test('a notification failure never breaks the login', async () => {
    perm.mockRejectedValue(new Error('boom'));
    await expect(handleWebSessionMessage({ type: 'GORODAPP_WEB_SESSION', accessToken: 'T1' })).resolves.toBeUndefined();
    expect(saveUserAccessToken).toHaveBeenCalledWith('T1');
  });
});
