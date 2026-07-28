import { getStoredUserAccessToken } from './mobileAuth';

/**
 * Safely returns the current backend access token for Bearer authorization.
 */
export async function getAuthBearerToken(): Promise<string> {
  const accessToken = await getStoredUserAccessToken();
  if (!accessToken) {
    throw new Error('User is not authenticated');
  }
  return accessToken;
}
