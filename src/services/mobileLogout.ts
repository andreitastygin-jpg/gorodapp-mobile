import { clearMobileAuthSession } from './mobileAuth';
import { useAppStore } from '../store/useAppStore';
import { unregisterDevicePushToken } from './pushNotifications';

/**
 * Safely performs logout for mobile user:
 * Unregisters push notifications on backend.
 * Clears SecureStore and Zustand auth/session state.
 * Resets persisted user application state.
 * Logs completion without exposing sensitive data.
 */
export async function logoutMobileUser(): Promise<void> {
  console.log('[MobileLogout] started');
  try {
    // Attempt push token unregistration before clearing credentials (failure must not block logout)
    try {
      await unregisterDevicePushToken();
    } catch (pushErr) {
      console.warn('[MobileLogout] Push unregister failed gracefully:', pushErr);
    }

    // Clear both SecureStore and Zustand auth session state
    await clearMobileAuthSession();
    // Reset all user state in main app store
    useAppStore.getState().resetUser();
    console.log('[MobileLogout] completed');
  } catch (err) {
    console.error('[MobileLogout] failed:', err);
    // Graceful fallback to guarantee store cleanup even if SecureStore operations fail
    try {
      await clearMobileAuthSession();
    } catch {}
    useAppStore.getState().resetUser();
    throw err;
  }
}
