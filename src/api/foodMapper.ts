import { 
  FoodServiceApi, 
  FoodItemApi, 
  FoodCategoryApi, 
  FoodService, 
  Product, 
  ProductVariant,
  FoodOptionGroupApi
} from '../types';

/**
 * Maps new FoodServiceApi response to legacy FoodService structure
 */
export const mapFoodServiceApiToLegacyService = (service: FoodServiceApi): FoodService => {
  return {
    id: service.id,
    name: service.name,
    image: service.coverImageUrl || service.logoUrl || '',
    logo: service.logoUrl || '',
    rating: 5.0,
    description: service.description || '',
    hasPromotion: false,
    bonusPercent: service.bonusPercent || 15,
    minOrder: service.minOrderAmount || 0,
    minOrderAmount: service.minOrderAmount || 0,
    freeDeliveryFrom: service.freeDeliveryFrom || 0,
    deliveryEnabled: service.deliveryEnabled,
    pickupEnabled: service.pickupEnabled,
    deliveryFee: service.deliveryFee || 0,
    deliveryPrice: service.deliveryFee || 0,
    deliveryTime: service.deliveryTime || (service.preparationTimeMinutes ? `${service.preparationTimeMinutes} мин` : '30-40 мин'),
    pickupTime: service.pickupTime ? String(service.pickupTime) : (service.preparationTimeMinutes ? String(service.preparationTimeMinutes) : '30'),
    pickupAddress: service.pickupAddress || service.address || null,
    pickupDiscountPercent: service.pickupDiscountPercent || 0,
    onlinePaymentEnabled: service.onlinePaymentEnabled ?? false,
    cashOnDeliveryEnabled: service.cashOnDeliveryEnabled ?? true,
    fiscalizationOwner: service.fiscalizationOwner || 'seller',
    pickupPoints: [],
    foodCategories: []
  };
};

/**
 * Maps new FoodItemApi to legacy Product structure (food type)
 */
export const mapFoodItemApiToLegacyProduct = (
  item: FoodItemApi, 
  service: FoodServiceApi, 
  category?: FoodCategoryApi
): Product => {
  const legacyVariants = generateLegacyVariants(item.optionGroups, item.basePrice || item.price);

  return {
    id: item.id,
    name: item.name,
    price: item.price || item.basePrice || 0,
    image: item.imageUrl || '',
    images: item.imageUrl ? [item.imageUrl] : [],
    category: category?.name || item.categoryId || 'General',
    categoryId: item.categoryId || undefined,
    categoryObj: category,
    description: item.description || '',
    type: 'food',
    serviceId: item.serviceId,
    nutrition: {
      kcal: item.calories || 0,
      protein: item.proteins || 0,
      fat: item.fats || 0,
      carbs: item.carbs || 0
    },
    composition: item.composition || '',
    weight: item.weight || 0,
    variants: legacyVariants,
    optionGroups: item.optionGroups,
    addOns: [],
    isActive: true,
    hasAvailableStock: true
  };
};

/**
 * Helper to generate legacy variants from option groups for backward compatibility
 */
function generateLegacyVariants(optionGroups: FoodOptionGroupApi[] | undefined, basePrice: number): ProductVariant[] | undefined {
  if (!optionGroups || optionGroups.length === 0) return undefined;

  const sizeGroup = optionGroups.find(g => 
    g.selectionType === 'single' && 
    (g.name.toLowerCase().includes('размер') || g.name.toLowerCase().includes('size') || g.name.toLowerCase().includes('см'))
  );

  if (!sizeGroup) return undefined;

  return sizeGroup.options.map(opt => ({
    id: opt.id,
    variantLabel: opt.name,
    name: opt.name,
    price: basePrice + opt.priceDelta,
    isAvailable: !opt.isStopListed,
    sortOrder: opt.sortOrder
  }));
}
