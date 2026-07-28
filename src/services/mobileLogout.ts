import { clearMobileAuthSession } from './mobileAuth';
import { useAppStore } from '../store/useAppStore';

/**
 * Safely performs logout for mobile user:
 * Clears SecureStore and Zustand auth/session state.
 * Resets persisted user application state.
 * Logs completion without exposing sensitive data.
 */
export async function logoutMobileUser(): Promise<void> {
  console.log('[MobileLogout] started');
  try {
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
