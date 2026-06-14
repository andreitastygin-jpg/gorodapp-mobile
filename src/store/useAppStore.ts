import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product, Transaction, FoodService, Category, Story, Partner, Address, Order, UserProfile, StreakInfo, FoodAddOn, ReferralData, TabType } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Safe Compile-Time Mock for PostHog inside the Native App to prevent 'window is not defined' errors
const posthog = {
  identify: (id: string) => console.log('[Analytics] PostHog Identify:', id),
  capture: (event: string, properties?: any) => console.log('[Analytics] PostHog Capture:', event, properties),
  reset: () => console.log('[Analytics] PostHog Reset')
};

export interface AppState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // User Data
  userId: string | null;
  isAuthReady: boolean;
  userBalance: number;
  cart: CartItem[];
  scannedCodes: string[];
  streakInfo: StreakInfo;
  transactions: Transaction[];
  addresses: Address[];
  orders: Order[];
  isOrdersLoading: boolean;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  birthday?: string;
  gender?: 'Male' | 'Female' | '';
  referralCode: string;
  onboardingVersion: number;
  isProfileLoading: boolean;
  referralData: ReferralData | null;
  isReferralLoading: boolean;

  // Global Data
  marketItems: Product[];
  foodItems: Product[];
  foodServices: FoodService[];
  loadedFoodServiceMenuIds: string[];
  categories: Category[];
  stories: Story[];
  partners: Partner[];
  bonusRate: number;
  isMarketLoading: boolean;
  hasMarketLoaded: boolean;
  isMarketFresh: boolean;

  activeFoodServiceIdInCart: string | null;
  setActiveFoodServiceIdInCart: (id: string | null) => void;
  pendingFoodServiceId: string | null;
  setPendingFoodServiceId: (id: string | null) => void;

  foodFulfillmentByServiceId: Record<string, 'delivery' | 'pickup'>;
  setFoodFulfillment: (serviceId: string, type: 'delivery' | 'pickup') => void;
  getFoodFulfillment: (serviceId: string) => 'delivery' | 'pickup';

  foodPickupPointByServiceId: Record<string, string>;
  setFoodPickupPoint: (serviceId: string, pointId: string) => void;
  getFoodPickupPoint: (serviceId: string) => string | undefined;

  marketPickupPointBySellerId: Record<string, string>;
  setMarketPickupPoint: (sellerId: string, pointId: string) => void;
  getMarketPickupPoint: (sellerId: string) => string | undefined;

  // Actions
  setUserId: (id: string | null) => void;
  setUserData: (data: Partial<UserProfile> | ((prev: AppState) => Partial<UserProfile>)) => void;
  setGlobalData: <K extends keyof AppState>(key: K, data: AppState[K]) => void;
  setBonusRate: (rate: number) => void;
  resetUser: () => void;
  
  addToCart: (product: Product, variant?: string, bonus?: number, addOns?: FoodAddOn[], foodOptions?: CartItem['selectedOptions'], type?: string) => Promise<void>;
  removeFromCart: (id: string, variant?: string, optionsSummary?: string) => Promise<void>;
  updateCartQty: (id: string, delta: number, variant?: string, optionsSummary?: string) => Promise<void>;
  updateCartBonus: (id: string, bonus: number, variant?: string, optionsSummary?: string) => Promise<void>;
  toggleCartItemSelection: (id: string, variant?: string, optionsSummary?: string) => Promise<void>;
  clearCartBonuses: () => Promise<void>;
  clearCart: () => Promise<void>;
  removeItemsFromCart: (itemsToRemove: CartItem[]) => Promise<void>;
  setCart: (newCart: CartItem[]) => Promise<void>;
  setOnboardingVersion: (version: number) => Promise<void>;
  setOrders: (orders: Order[]) => void;
  setOrdersLoading: (loading: boolean) => void;
  setReferralData: (data: ReferralData | null) => void;
  setReferralLoading: (loading: boolean) => void;
  addFoodItems: (items: Product[]) => void;
  markFoodServiceMenuLoaded: (serviceId: string) => void;
}

const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(v => sanitizeData(v));
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return data;
};

const toPlainUserUpdate = (value: any): Record<string, any> => {
  if (!value || typeof value !== 'object') return {};

  const result: Record<string, any> = {};

  Object.entries(value).forEach(([key, item]) => {
    if (item === undefined) return;

    const isFirebaseInternalObject =
      item &&
      typeof item === 'object' &&
      (
        typeof (item as any).path === 'string' ||
        typeof (item as any).firestore === 'object' ||
        typeof (item as any).toDate === 'function'
      );

    if (isFirebaseInternalObject) {
      return;
    }

    result[key] = item;
  });

  return result;
};

const normalizeCartItems = (items: CartItem[]): CartItem[] => {
  if (!items) return [];
  return items.map((item) => {
    const looksLikeMarketItem =
      item.type === "food" &&
      item.sellerId &&
      !item.serviceId;

    if (looksLikeMarketItem) {
      return {
        ...item,
        type: "market",
      };
    }

    return item;
  });
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: 'event',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // User Data
      userId: null,
      isAuthReady: false,
      userBalance: 0,
      cart: [],
      scannedCodes: [],
      streakInfo: { lastClaimedDay: '', currentStreak: 0 },
      transactions: [],
      addresses: [],
      orders: [],
      isOrdersLoading: false,
      firstName: '',
      lastName: '',
      username: '',
      photoUrl: '',
      phone: '',
      email: '',
      birthday: '',
      gender: '',
      referralCode: '',
      onboardingVersion: 0,
      isProfileLoading: true,
      referralData: null,
      isReferralLoading: false,

      marketItems: [],
      foodItems: [],
      foodServices: [],
      loadedFoodServiceMenuIds: [],
      categories: [],
      stories: [],
      partners: [],
      bonusRate: 1,
      isMarketLoading: false,
      hasMarketLoaded: false,
      isMarketFresh: false,

      activeFoodServiceIdInCart: null,
      setActiveFoodServiceIdInCart: (id) => set({ activeFoodServiceIdInCart: id }),
      pendingFoodServiceId: null,
      setPendingFoodServiceId: (id) => set({ pendingFoodServiceId: id }),

      foodFulfillmentByServiceId: {},
      setFoodFulfillment: (serviceId, type) => {
        if (typeof serviceId !== 'string' || (type !== 'delivery' && type !== 'pickup')) return;
        set((state) => ({
          foodFulfillmentByServiceId: { ...state.foodFulfillmentByServiceId, [serviceId]: type }
        }));
      },
      getFoodFulfillment: (serviceId) => {
        const state = get();
        const service = state.foodServices.find(s => s.id === serviceId);
        
        let fulfillment = state.foodFulfillmentByServiceId[serviceId];
        
        if (fulfillment === 'delivery' && service?.deliveryEnabled === false) {
          if (service.pickupEnabled === true) return 'pickup';
        }
        if (fulfillment === 'pickup' && service?.pickupEnabled === false) {
          if (service.deliveryEnabled !== false) return 'delivery';
        }

        if (fulfillment) return fulfillment;
        
        if (service) {
          if (service.deliveryEnabled !== false) return 'delivery';
          if (service.pickupEnabled === true) return 'pickup';
        }
        return 'delivery';
      },

      foodPickupPointByServiceId: {},
      setFoodPickupPoint: (serviceId, pointId) => {
        if (typeof serviceId !== 'string' || typeof pointId !== 'string') return;
        set((state) => ({
          foodPickupPointByServiceId: { ...state.foodPickupPointByServiceId, [serviceId]: pointId }
        }));
      },
      getFoodPickupPoint: (serviceId) => {
        return get().foodPickupPointByServiceId[serviceId];
      },

      marketPickupPointBySellerId: {},
      setMarketPickupPoint: (sellerId, pointId) => {
        if (typeof sellerId !== 'string' || typeof pointId !== 'string') return;
        set((state) => ({
          marketPickupPointBySellerId: { ...state.marketPickupPointBySellerId, [sellerId]: pointId }
        }));
      },
      getMarketPickupPoint: (sellerId) => {
        return get().marketPickupPointBySellerId[sellerId];
      },

      // Setters
      setUserId: (id) => {
        set({ userId: id, isAuthReady: true });
        if (id) {
          posthog.identify(id);
        }
      },
      setUserData: (data) => set((state) => {
        const update = typeof data === 'function' ? data(state) : data;
        const updateAny = toPlainUserUpdate(update);

        let fName = updateAny.firstName !== undefined ? updateAny.firstName : state.firstName;
        let lName = updateAny.lastName !== undefined ? updateAny.lastName : state.lastName;
        
        if (updateAny.displayName && updateAny.firstName === undefined && updateAny.lastName === undefined) {
          const parts = updateAny.displayName.split(' ');
          fName = parts[0] || '';
          lName = parts.slice(1).join(' ') || '';
        }

        const newBalance = updateAny.balance !== undefined ? updateAny.balance : 
                          (updateAny.userBalance !== undefined ? updateAny.userBalance : state.userBalance);

        return {
          userBalance: newBalance,
          cart: updateAny.cart !== undefined
            ? Array.isArray(updateAny.cart)
              ? normalizeCartItems(updateAny.cart)
              : state.cart
            : state.cart,
          scannedCodes: updateAny.scannedCodes || state.scannedCodes,
          streakInfo: updateAny.streakInfo || state.streakInfo,
          transactions: updateAny.transactions || state.transactions,
          addresses: updateAny.addresses || state.addresses,
          orders: updateAny.orders || state.orders,
          firstName: fName,
          lastName: lName,
          username: updateAny.username !== undefined ? updateAny.username : state.username,
          photoUrl: updateAny.photoUrl !== undefined ? updateAny.photoUrl : state.photoUrl,
          phone: updateAny.phone !== undefined ? updateAny.phone : state.phone,
          email: updateAny.email !== undefined ? updateAny.email : state.email,
          birthday: updateAny.birthday !== undefined ? updateAny.birthday : state.birthday,
          gender: updateAny.gender !== undefined ? updateAny.gender : state.gender,
          referralCode: updateAny.referralCode !== undefined ? updateAny.referralCode : state.referralCode,
          onboardingVersion: updateAny.onboardingVersion !== undefined ? updateAny.onboardingVersion : state.onboardingVersion,
          isProfileLoading: updateAny.isProfileLoading !== undefined ? updateAny.isProfileLoading : state.isProfileLoading,
        };
      }),
      setGlobalData: (key, data) => set({ [key]: data } as any),
      setBonusRate: (rate) => set({ bonusRate: rate }),
      setOrdersLoading: (loading) => set({ isOrdersLoading: loading }),
      setReferralData: (data) => set({ referralData: data }),
      setReferralLoading: (loading) => set({ isReferralLoading: loading }),
      
      addFoodItems: (newItems) => set((state) => {
        const existingIds = new Set(state.foodItems.map(item => item.id));
        const filteredNewItems = newItems.filter(item => !existingIds.has(item.id));
        if (filteredNewItems.length === 0) return state;
        return { foodItems: [...state.foodItems, ...filteredNewItems] };
      }),

      markFoodServiceMenuLoaded: (serviceId) => set((state) => {
        if (state.loadedFoodServiceMenuIds.includes(serviceId)) return state;
        return { loadedFoodServiceMenuIds: [...state.loadedFoodServiceMenuIds, serviceId] };
      }),

      // Cart Actions
      addToCart: async (product, variant, bonus, addOns, foodOptions, type) => {
        const { cart, userId } = get();
        let newCart = [...cart];
        
        const optionsSummary = foodOptions?.map(o => o.optionName).join(', ') || '';
        
        const existingIndex = newCart.findIndex(item => {
          const itemVariant = item.selectedVariant || item.selectedSize;
          const itemOptions = item.selectedOptionsSummary || '';
          return item.id === product.id && itemVariant === variant && itemOptions === optionsSummary;
        });
        
        let finalPrice = product.price;
        let variantObj = null;

        if (foodOptions && foodOptions.length > 0) {
          const basePrice = product.basePrice || product.price;
          const optionsDelta = foodOptions.reduce((acc, opt) => acc + (opt.priceDelta || 0), 0);
          finalPrice = basePrice + optionsDelta;
        } else if (variant && product.variants && product.variants.length > 0) {
          variantObj = product.variants?.find(v => v.variantLabel === variant || v.name === variant);
          finalPrice = variantObj ? variantObj.price : product.price;
        }
        
        const variantStock = variantObj?.stock;
        const stockMap = product.variantStock || product.sizeStock || {};
        const maxStock = variantStock !== undefined ? variantStock : (variant ? stockMap[variant] : undefined);

        const miniVariantObj = variantObj ? {
          id: variantObj.id,
          variantLabel: variantObj.variantLabel,
          sku: variantObj.sku,
          price: variantObj.price,
          stock: variantObj.stock,
          isAvailable: variantObj.isAvailable
        } : undefined;

        if (existingIndex > -1) {
          let newQty = newCart[existingIndex].quantity + 1;
          if (maxStock !== undefined && newQty > maxStock) {
            newQty = maxStock;
          }
          newCart[existingIndex].quantity = newQty;
          newCart[existingIndex].price = finalPrice;
          newCart[existingIndex].selectedVariantObj = miniVariantObj as any;
          if (miniVariantObj?.id) {
            newCart[existingIndex].selectedVariantId = miniVariantObj.id;
          }
        } else {
          const cartItemPayload = {
            id: product.id,
            sourceProductId: (product as any).sourceProductId || product.id,
            type: type || product.type || 'market',
            category: product.category,
            name: product.name,
            title: (product as any).title || product.name,
            image: product.image,
            images: product.image ? [product.image] : [],
            brand: product.brand,
            sellerId: product.sellerId,
            sellerName: product.sellerName || (product as any).seller,
            sellerOnlinePaymentEnabled: product.sellerOnlinePaymentEnabled,
            sellerCashOnDeliveryEnabled: product.sellerCashOnDeliveryEnabled,
            sellerFiscalizationOwner: product.sellerFiscalizationOwner,
            serviceId: product.serviceId,
            price: finalPrice,
            basePrice: product.basePrice,
            originalPrice: (product as any).originalPrice,
            selectedBonus: bonus || 0,
            quantity: 1,
            selectedVariant: variant,
            selectedSize: variant,
            selectedVariantId: miniVariantObj?.id,
            sku: product.sku || miniVariantObj?.sku,
            selectedVariantObj: miniVariantObj,
            variantStock: product.variantStock ? JSON.parse(JSON.stringify(product.variantStock)) : undefined,
            sizeStock: product.sizeStock ? JSON.parse(JSON.stringify(product.sizeStock)) : undefined,
            selectedAddOns: addOns ? JSON.parse(JSON.stringify(addOns)) : [],
            selectedOptions: foodOptions ? JSON.parse(JSON.stringify(foodOptions)) : undefined,
            selectedOptionsSummary: optionsSummary,
            isSelected: true,
          };

          newCart.push(cartItemPayload as any);
        }

        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });

        posthog.capture('add_to_cart', {
          productId: product.id,
          selectedVariantId: miniVariantObj?.id || null,
          sellerId: product.sellerId || null,
          price: finalPrice,
          quantity: 1,
          type: type || product.type || 'market',
          category: product.category || null,
          brand: product.brand || null,
        });

        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (addToCart):", e);
          }
        }
      },

      removeFromCart: async (id, variant, optionsSummary) => {
        const { cart, userId } = get();
        const newCart = cart.filter(item => {
          const itemVariant = item.selectedVariant || item.selectedSize;
          const itemOptions = item.selectedOptionsSummary || '';
          return !(item.id === id && itemVariant === variant && itemOptions === (optionsSummary || ''));
        });
        
        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (removeFromCart):", e);
          }
        }
      },

      updateCartQty: async (id, delta, variant, optionsSummary) => {
        const { cart, userId } = get();
        const newCart = cart.map(item => {
          const itemVariant = item.selectedVariant || item.selectedSize;
          const itemOptions = item.selectedOptionsSummary || '';
          if (item.id === id && itemVariant === variant && itemOptions === (optionsSummary || '')) {
            const variantStock = item.selectedVariantObj?.stock;
            const stockMap = item.variantStock || item.sizeStock || {};
            const maxStock = variantStock !== undefined ? variantStock : (itemVariant ? stockMap[itemVariant] : undefined);
            
            let newQty = item.quantity + delta;
            if (delta > 0 && maxStock !== undefined && newQty > maxStock) {
              newQty = maxStock;
            }
            return { ...item, quantity: Math.max(1, newQty) };
          }
          return item;
        });

        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (updateCartQty):", e);
          }
        }
      },

      updateCartBonus: async (id, bonus, variant, optionsSummary) => {
        const { cart, userId } = get();
        const newCart = cart.map(item => {
          const itemVariant = item.selectedVariant || item.selectedSize;
          const itemOptions = item.selectedOptionsSummary || '';
          return (item.id === id && itemVariant === variant && itemOptions === (optionsSummary || '')) ? { ...item, selectedBonus: bonus } : item;
        });
        
        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (updateCartBonus):", e);
          }
        }
      },

      toggleCartItemSelection: async (id, variant, optionsSummary) => {
        const { cart, userId } = get();
        const newCart = cart.map(item => {
          const itemVariant = item.selectedVariant || item.selectedSize;
          const itemOptions = item.selectedOptionsSummary || '';
          if (item.id === id && itemVariant === variant && itemOptions === (optionsSummary || '')) {
            return { ...item, isSelected: item.isSelected === false ? true : false };
          }
          return item;
        });
        
        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (toggleCartItemSelection):", e);
          }
        }
      },

      clearCartBonuses: async () => {
        const { cart, userId } = get();
        const newCart = cart.map(item => ({ ...item, selectedBonus: 0 }));
        
        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (clearCartBonuses):", e);
          }
        }
      },

      clearCart: async () => {
        const { userId } = get();
        const normalizedCart = normalizeCartItems([]);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (clearCart):", e);
          }
        }
      },

      removeItemsFromCart: async (itemsToRemove) => {
        const { cart, userId } = get();
        
        const keysToRemove = new Set(itemsToRemove.map(i => 
          `${i.id}-${i.selectedVariant || i.selectedSize || ''}-${i.type || 'market'}-${i.serviceId || i.sellerId || ''}-${i.selectedOptionsSummary || ''}`
        ));

        const newCart = cart.filter(item => {
          const key = `${item.id}-${item.selectedVariant || item.selectedSize || ''}-${item.type || 'market'}-${item.serviceId || item.sellerId || ''}-${item.selectedOptionsSummary || ''}`;
          return !keysToRemove.has(key);
        });
        
        const normalizedCart = normalizeCartItems(newCart);
        set({ cart: normalizedCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: normalizedCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (removeItemsFromCart):", e);
          }
        }
      },

      setCart: async (newCart) => {
        const { userId } = get();
        const cleanCart = normalizeCartItems(JSON.parse(JSON.stringify(newCart || [])));
        set({ cart: cleanCart });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), sanitizeData({ cart: cleanCart }), { merge: true });
          } catch (e) {
            console.error("Firestore update error (setCart):", e);
          }
        }
      },

      setOnboardingVersion: async (version) => {
        const { userId } = get();
        set({ onboardingVersion: version });
        if (userId && db) {
          try {
            await setDoc(doc(db, 'users', userId), { onboardingVersion: version }, { merge: true });
          } catch (e) {
            console.error("Firestore update error (setOnboardingVersion):", e);
          }
        }
      },

      setOrders: (orders) => set({ orders }),
      resetUser: () => {
        posthog.reset();
        set({
          activeTab: 'event',
          userId: null,
          isAuthReady: true,
          userBalance: 0,
          cart: [],
          scannedCodes: [],
          streakInfo: { lastClaimedDay: '', currentStreak: 0 },
          transactions: [],
          addresses: [],
          orders: [],
          isOrdersLoading: false,
          firstName: '',
          lastName: '',
          username: '',
          photoUrl: '',
          phone: '',
          email: '',
          birthday: '',
          gender: '',
          referralCode: '',
          onboardingVersion: 0,
          isProfileLoading: true,
          referralData: null,
          isReferralLoading: false,
          foodFulfillmentByServiceId: {},
          foodPickupPointByServiceId: {},
          marketPickupPointBySellerId: {},
          isMarketFresh: false,
        });
      },
    }),
    {
      name: 'gorod-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        userId: state.userId,
        userBalance: state.userBalance,
        cart: state.cart,
        scannedCodes: state.scannedCodes,
        streakInfo: state.streakInfo,
        transactions: state.transactions,
        firstName: state.firstName,
        lastName: state.lastName,
        username: state.username,
        photoUrl: state.photoUrl,
        phone: state.phone,
        email: state.email,
        birthday: state.birthday,
        gender: state.gender,
        onboardingVersion: state.onboardingVersion,
        foodFulfillmentByServiceId: state.foodFulfillmentByServiceId,
        foodPickupPointByServiceId: state.foodPickupPointByServiceId,
        marketPickupPointBySellerId: state.marketPickupPointBySellerId,
      }),
    }
  )
);
