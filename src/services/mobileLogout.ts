import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Safely performs logout for mobile user:
 * 1. Signs out of Firebase Auth if available.
 * 2. Clears only auth/session state in Zustand auth store using clearMobileAuthSession.
 * 3. Incorporates safe logging without leaks.
 */
export async function logoutMobileUser(): Promise<void> {
  console.log('[MobileLogout] started');
  try {
    if (auth) {
      await signOut(auth);
    }
  } catch (err) {
    console.log('[MobileLogout] failed');
    throw err;
  }

  try {
    // Reset Zustand auth store
    useAuthStore.getState().clearMobileAuthSession();
    console.log('[MobileLogout] completed');
  } catch (err) {
    console.log('[MobileLogout] failed');
    throw err;
  }
}
