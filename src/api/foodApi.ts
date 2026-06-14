import { API_BASE_URL } from './config';
import { FoodServiceApi, FoodItemApi, FoodMenuResponseApi, PickupPoint } from '../types';

let servicesCache: FoodServiceApi[] | null = null;
let servicesPromise: Promise<FoodServiceApi[]> | null = null;

const menuCache: Record<string, FoodMenuResponseApi | undefined> = {};
const menuPromises: Record<string, Promise<FoodMenuResponseApi> | undefined> = {};

export const foodApi = {
  async getServices(): Promise<FoodServiceApi[]> {
    if (servicesCache) return servicesCache;
    if (servicesPromise) return servicesPromise;

    servicesPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/food/services`);
        if (!response.ok) throw new Error(`Failed to fetch food services: ${response.status}`);
        const data = await response.json();
        servicesCache = data;
        return data;
      } catch (error) {
        servicesPromise = null;
        console.error('Error in foodApi.getServices:', error);
        throw error;
      }
    })();

    return servicesPromise;
  },

  async getFoodPickupPoints(serviceId: string): Promise<PickupPoint[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/food/services/${serviceId}/pickup-points`);
      if (!response.ok) throw new Error(`Failed to fetch food pickup points for ${serviceId}: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Error in foodApi.getFoodPickupPoints(${serviceId}):`, error);
      return [];
    }
  },

  async getService(serviceId: string): Promise<FoodServiceApi> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/food/services/${serviceId}`);
      if (!response.ok) throw new Error(`Failed to fetch food service ${serviceId}: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in foodApi.getService(${serviceId}):`, error);
      throw error;
    }
  },

  async getMenu(serviceId: string): Promise<FoodMenuResponseApi> {
    if (menuCache[serviceId]) return menuCache[serviceId];
    if (menuPromises[serviceId]) return menuPromises[serviceId];

    menuPromises[serviceId] = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/food/services/${serviceId}/menu`);
        if (!response.ok) throw new Error(`Failed to fetch menu for ${serviceId}: ${response.status}`);
        const data = await response.json();
        menuCache[serviceId] = data;
        return data;
      } catch (error) {
        delete menuPromises[serviceId];
        console.error(`Error in foodApi.getMenu(${serviceId}):`, error);
        throw error;
      }
    })();

    return menuPromises[serviceId];
  },

  async getItem(itemId: string): Promise<FoodItemApi> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/food/items/${itemId}`);
      if (!response.ok) throw new Error(`Failed to fetch food item ${itemId}: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error in foodApi.getItem(${itemId}):`, error);
      throw error;
    }
  },
};

export const calculateFoodItemBasePrice = (item: FoodItemApi): number => {
  return item.basePrice ?? item.price ?? 0;
};

export const calculateFoodItemPriceWithOptions = (item: FoodItemApi, selectedOptionIds: string[]): number => {
  const basePrice = calculateFoodItemBasePrice(item);
  
  if (!item.optionGroups || item.optionGroups.length === 0) {
    return basePrice;
  }

  let totalOptionsPriceDelta = 0;
  const optionIdSet = new Set(selectedOptionIds);

  item.optionGroups.forEach(group => {
    group.options.forEach(option => {
      if (optionIdSet.has(option.id)) {
        totalOptionsPriceDelta += (option.priceDelta || 0);
      }
    });
  });

  return basePrice + totalOptionsPriceDelta;
};
