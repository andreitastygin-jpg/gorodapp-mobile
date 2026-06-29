import { API_BASE_URL } from '../api/config';
import { getFirebaseBearerToken } from './authToken';
import type {
  MobileProfileResponse,
  MobileProfileUser,
  MobileProfileUpdatePayload,
  MobileAddress,
  MobileAddressCreatePayload,
  MobileAddressUpdatePayload,
  MobileBonusHistoryResponse,
  MobileBonusHistoryType,
  MobilePushRegisterPayload,
  MobilePushSettingsPayload,
  MobilePushUnregisterPayload,
  MobilePushResponse,
  MobileOrdersParams,
  MobileOrdersResponse,
  MobileOrderDetailsResponse,
} from '../types/mobileProfile';

/**
 * Generic request helper for authorized /api/mobile/* API endpoints.
 * It automatically fetches the current Firebase ID Token, appends the Authorization header,
 * and securely handles error parsing without exposing sensitive data.
 */
async function mobileApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    console.log('[MobileProfileApi] request started');
    const token = await getFirebaseBearerToken();
    const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      let errorMessage = `API Request failed with status ${response.status}`;
      try {
        const rawText = await response.text();
        if (rawText) {
          try {
            const errorData = JSON.parse(rawText);
            if (errorData && typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            } else if (errorData && typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            }
          } catch {
            if (rawText.length < 150) {
              errorMessage = rawText;
            }
          }
        }
      } catch {
        // Keep default status message
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[MobileProfileApi] request success');
    return data as T;
  } catch (error) {
    console.log('[MobileProfileApi] request failed');
    // Ensure we do not leak the bearer token/credentials in error messages
    const errorMsg = error instanceof Error ? error.message : String(error);
    const sanitizedMsg = errorMsg.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    throw new Error(sanitizedMsg);
  }
}

export const mobileProfileApi = {
  /**
   * Fetches the user's mobile profile and simple statistics.
   */
  async getProfile(): Promise<MobileProfileResponse> {
    return mobileApiRequest<MobileProfileResponse>('/api/mobile/profile', {
      method: 'GET',
    });
  },

  /**
   * Updates the user's personal profile information.
   */
  async updateProfile(
    payload: MobileProfileUpdatePayload
  ): Promise<MobileProfileResponse | MobileProfileUser> {
    return mobileApiRequest<MobileProfileResponse | MobileProfileUser>('/api/mobile/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches the list of saved delivery addresses for the current user.
   */
  async getAddresses(): Promise<MobileAddress[]> {
    return mobileApiRequest<MobileAddress[]>('/api/mobile/addresses', {
      method: 'GET',
    });
  },

  /**
   * Adds a new delivery address to the user's account.
   */
  async createAddress(
    payload: MobileAddressCreatePayload
  ): Promise<MobileAddress[]> {
    return mobileApiRequest<MobileAddress[]>('/api/mobile/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Updates an existing delivery address.
   */
  async updateAddress(
    addressId: string,
    payload: MobileAddressUpdatePayload
  ): Promise<MobileAddress[] | MobileAddress> {
    return mobileApiRequest<MobileAddress[] | MobileAddress>(`/api/mobile/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a delivery address.
   */
  async deleteAddress(addressId: string): Promise<MobileAddress[]> {
    return mobileApiRequest<MobileAddress[]>(`/api/mobile/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetches user's bonus and cash back transaction history.
   */
  async getBonusHistory(params?: {
    type?: MobileBonusHistoryType;
    limit?: number;
    cursor?: string | null;
  }): Promise<MobileBonusHistoryResponse> {
    const queryParams: string[] = [];
    if (params?.type) {
      queryParams.push(`type=${encodeURIComponent(params.type)}`);
    }
    if (params?.limit) {
      queryParams.push(`limit=${encodeURIComponent(params.limit)}`);
    }
    if (params?.cursor) {
      queryParams.push(`cursor=${encodeURIComponent(params.cursor)}`);
    }

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    return mobileApiRequest<MobileBonusHistoryResponse>(`/api/mobile/bonus-history${queryString}`, {
      method: 'GET',
    });
  },

  /**
   * Registers mobile device push notification token on backend.
   */
  async registerPush(payload: MobilePushRegisterPayload): Promise<MobilePushResponse> {
    return mobileApiRequest<MobilePushResponse>('/api/mobile/push/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Updates notifications preferences and subscription status.
   */
  async updatePushSettings(payload: MobilePushSettingsPayload): Promise<MobilePushResponse> {
    return mobileApiRequest<MobilePushResponse>('/api/mobile/push/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Unregisters device from push notifications.
   */
  async unregisterPush(payload: MobilePushUnregisterPayload): Promise<MobilePushResponse> {
    return mobileApiRequest<MobilePushResponse>('/api/mobile/push/unregister', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches user's orders with optional pagination and status filtering.
   */
  async getOrders(params?: MobileOrdersParams): Promise<MobileOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined && params?.limit !== null) {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.cursor) {
      searchParams.set('cursor', params.cursor);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    const query = searchParams.toString();
    const path = query ? `/api/mobile/orders?${query}` : '/api/mobile/orders';
    return mobileApiRequest<MobileOrdersResponse>(path, {
      method: 'GET',
    });
  },

  /**
   * Fetches details of a specific order by ID.
   */
  async getOrderById(orderId: string): Promise<MobileOrderDetailsResponse> {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      throw new Error('Order ID is required');
    }
    return mobileApiRequest<MobileOrderDetailsResponse>(
      `/api/mobile/orders/${encodeURIComponent(normalizedOrderId)}`,
      {
        method: 'GET',
      }
    );
  },

  /**
   * Deletes user's account from the backend.
   */
  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    return mobileApiRequest<{ success: boolean; message?: string }>('/api/user/delete-account', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  },
};
