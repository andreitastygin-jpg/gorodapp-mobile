import { auth } from './firebase';

/**
 * Safely fetches the current Firebase user's ID token (Bearer token) for API authorization.
 * Accurately handles cases where user is guest/unauthenticated or Firebase auth is unconfigured.
 */
export async function getFirebaseBearerToken(): Promise<string> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('Firebase user is not authenticated');
  }
  // This will dynamically fetch (and potentially refresh) the user's ID token.
  return user.getIdToken();
}
