import { mapBackendProductToFrontend, BackendProduct } from './marketMapper';
import { Product, Order, PickupPoint, SellerStorefrontResponse } from '../types';
import { API_BASE_URL } from './config';

export const marketApi = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/market/products?limit=300&offset=0`);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);

      const data = await response.json();

      const products: BackendProduct[] = Array.isArray(data)
        ? data
        : (data.items || data.products || data.data || []);

      return products.map(mapBackendProductToFrontend);
    } catch (error) {
      console.error('Error in marketApi.getProducts:', error);
      throw error;
    }
  },

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master/products/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch product ${id}: ${response.status}`);

      const data = await response.json();
      const productData: BackendProduct = data.product || data.data || data;

      return mapBackendProductToFrontend(productData);
    } catch (error) {
      console.error(`Error in marketApi.getProductById(${id}):`, error);
      throw error;
    }
  },

  async getProductBySlug(slug: string): Promise<Product> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master/products/slug/${slug}`);
      if (!response.ok) throw new Error(`Failed to fetch product by slug ${slug}: ${response.status}`);

      const data = await response.json();
      const productData: BackendProduct = data.product || data.data || data;

      return mapBackendProductToFrontend(productData);
    } catch (error) {
      console.error(`Error in marketApi.getProductBySlug(${slug}):`, error);
      throw error;
    }
  },

  async getFacets() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master/facets`);
      if (!response.ok) throw new Error(`Failed to fetch facets: ${response.status}`);

      const data = await response.json();
      return data.facets || data.data || data;
    } catch (error) {
      console.error('Error in marketApi.getFacets:', error);
      throw error;
    }
  },

  async getOrder(orderId: string, token: string): Promise<Order> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch order ${orderId}: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in marketApi.getOrder(${orderId}):`, error);
      throw error;
    }
  },

  async createPayment(orderId: string, token: string): Promise<{ paymentUrl: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Payment creation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.createPayment:', error);
      throw error;
    }
  },

  async getMyOrders(token: string): Promise<Order[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch my orders: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.getMyOrders:', error);
      throw error;
    }
  },

  async startSbpPayment(orderId: string, token: string, bankId?: string): Promise<{ orderId: string, paymentId: string, mode: 'payload' | 'deeplink', data: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/sbp/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, bankId: bankId || null })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `SBP Payment start failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.startSbpPayment:', error);
      throw error;
    }
  },

  async getSbpBanks(orderId: string, token: string, deviceType?: string, os?: string): Promise<{ bankId: string, name: string, logoUrl: string }[]> {
    try {
      const params = new URLSearchParams({ orderId });
      if (deviceType) params.append('deviceType', deviceType);
      if (os) params.append('os', os);
      
      const response = await fetch(`${API_BASE_URL}/api/payments/sbp/banks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch SBP banks: ${response.status}`);
      const data = await response.json();
      return data.banks || data;
    } catch (error) {
      console.error('Error in marketApi.getSbpBanks:', error);
      throw error;
    }
  },

  async updateProfile(token: string, payload: { firstName?: string, lastName?: string, phone?: string, email?: string }): Promise<{ success: boolean, profile: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Profile update failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.updateProfile:', error);
      throw error;
    }
  },

  async revalidateCart(token: string, items: { variantId: string, quantity: number, price: number }[]): Promise<{
    items: {
      variantId: string;
      status: 'ok' | 'price_changed' | 'quantity_adjusted' | 'removed';
      requestedQuantity: number;
      quantity: number;
      availableStock: number;
      unitPrice: number;
      lineTotal: number;
      title: string;
      variantLabel: string;
      image: string;
      brand: string;
      sellerId: string;
      reason?: string;
    }[];
    summary: {
      hasChanges: boolean;
      removedCount: number;
      adjustedCount: number;
      priceChangedCount: number;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/revalidate-cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Cart revalidation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.revalidateCart:', error);
      throw error;
    }
  },
  
  async applyReferralCode(token: string, code: string): Promise<{ success: boolean, message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/referrals/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = data.code || data.message || `Failed to apply referral code: ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error('Error in marketApi.applyReferralCode:', error);
      throw error;
    }
  },

  async claimWelcomeBonus(token: string): Promise<{ success: boolean, rewardAmount?: number, newBalance?: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/welcome-bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `Failed to claim welcome bonus: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error in marketApi.claimWelcomeBonus:', error);
      throw error;
    }
  },

  async getReferralMe(token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/referrals/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch referral data: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.getReferralMe:', error);
      throw error;
    }
  },
  
  async getPickupPointsBySeller(sellerId: string): Promise<PickupPoint[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pickup-points/seller/${sellerId}`);
      if (!response.ok) throw new Error(`Failed to fetch pickup points for seller ${sellerId}: ${response.status}`);
      const data = await response.json();
      return data.pickupPoints || data.data || data;
    } catch (error) {
      console.error(`Error in marketApi.getPickupPointsBySeller(${sellerId}):`, error);
      throw error;
    }
  },

  async getPickupPointById(id: string): Promise<PickupPoint> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pickup-points/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch pickup point ${id}: ${response.status}`);
      const data = await response.json();
      return data.pickupPoint || data.data || data;
    } catch (error) {
      console.error(`Error in marketApi.getPickupPointById(${id}):`, error);
      throw error;
    }
  },

  async cancelOrder(orderId: string, token: string, payload: { itemIds?: string[], reasonCode: string, reasonText?: string }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `Cancel failed: ${response.status}`);
      return data;
    } catch (error) {
      console.error('Error in marketApi.cancelOrder:', error);
      throw error;
    }
  },

  async createReturnRequest(orderId: string, token: string, payload: {
    itemIds: string[];
    reasonCode: string;
    reasonText?: string;
    comment?: string;
    photoUrls?: string[];
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/return-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `Return request failed: ${response.status}`);
      return data;
    } catch (error) {
      console.error('Error in marketApi.createReturnRequest:', error);
      throw error;
    }
  },

  async getMyReturnRequests(token: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/return-requests/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch return requests: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error in marketApi.getMyReturnRequests:', error);
      throw error;
    }
  },

  async getSellerStorefront(sellerId: string): Promise<SellerStorefrontResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/market/sellers/${sellerId}/storefront`);
      if (!response.ok) throw new Error(`Failed to fetch seller storefront for ${sellerId}: ${response.status}`);
      
      const data = await response.json();
      const rawProducts: BackendProduct[] = Array.isArray(data.products)
        ? data.products
        : [];
      
      const mappedProducts = rawProducts.map(mapBackendProductToFrontend);
      
      return {
        seller: data.seller || { id: sellerId, name: 'Seller' },
        products: mappedProducts,
      };
    } catch (error) {
      console.error(`Error in marketApi.getSellerStorefront(${sellerId}):`, error);
      throw error;
    }
  },
};
