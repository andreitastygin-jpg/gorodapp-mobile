import * as Notifications from 'expo-notifications';
import { clearMobileAuthSession, saveUserAccessToken } from './mobileAuth';
import { bootstrapDevicePushToken, registerDevicePushToken, unregisterDevicePushToken } from './pushNotifications';

// The site inside the app owns the login: МТС ID / SMS code, consents, and
// keeping the login alive with its refresh cookie. It tells the app the current
// access token (on login and every refresh) and when the customer logs out, so
// the app can register this phone for notifications and unregister it.

export type WebSessionMessage =
  | { type: 'GORODAPP_WEB_SESSION'; accessToken: string }
  | { type: 'GORODAPP_WEB_LOGOUT' };

export function parseWebSessionMessage(raw: unknown): WebSessionMessage | null {
  if (typeof raw !== 'string') return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.source !== 'gorodapp-web') return null;
  if (data.type === 'GORODAPP_WEB_SESSION' && typeof data.accessToken === 'string' && data.accessToken.trim() !== '') {
    return { type: 'GORODAPP_WEB_SESSION', accessToken: data.accessToken };
  }
  if (data.type === 'GORODAPP_WEB_LOGOUT') return { type: 'GORODAPP_WEB_LOGOUT' };
  return null;
}

let signedIn = false;

/** Test hook. */
export function resetWebSessionState() {
  signedIn = false;
}

export async function handleWebSessionMessage(message: WebSessionMessage): Promise<void> {
  if (message.type === 'GORODAPP_WEB_SESSION') {
    const firstInThisRun = !signedIn;
    signedIn = true;
    await saveUserAccessToken(message.accessToken);
    if (!firstInThisRun) return; // a refreshed token: nothing else to do
    try {
      // Ask for notifications once, after the customer logged in; later runs
      // only keep the registration up to date.
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status === Notifications.PermissionStatus.UNDETERMINED && permission.canAskAgain) {
        await registerDevicePushToken({ forceRequestPermission: true, enabled: true });
      } else {
        await bootstrapDevicePushToken();
      }
    } catch {
      // Notifications must never break the app.
    }
    return;
  }
  // Logout: unregister while the last token is still known, then forget it.
  if (signedIn) {
    try {
      await unregisterDevicePushToken();
    } catch {
      // ignore
    }
  }
  signedIn = false;
  await clearMobileAuthSession();
}
