import { Product } from '../types';

export interface BackendProduct {
  id: string;
  slug: string;
  sellerId?: string;
  sellerName?: string;
  title: string;
  brand?: string;
  category: string;
  description: string;
  image: string;
  images?: string[];
  imagesJson?: string[] | string;
  gender?: string;
  color?: string;
  series?: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  inSale: boolean;
  type: 'market' | 'food';
  maxBonusPercent?: number;
  bonusPercent?: number;
  bonusMax?: number;
  maxBonus?: number;
  variantsCount: number;
  availableVariants?: string[];
  variantStock?: Record<string, number>;
  variants?: {
    id: string;
    variantLabel: string;
    stock: number;
    isAvailable: boolean;
    price: number;
    sku: string;
    sortOrder: number;
    sourceProductId: string;
  }[];
  hasAvailableStock: boolean;
  sku?: string;
  pickupPointIds?: string[];
  onlinePaymentEnabled?: boolean;
  cashOnDeliveryEnabled?: boolean;
  fiscalizationOwner?: 'platform' | 'seller';
  sellerOnlinePaymentEnabled?: boolean;
  sellerCashOnDeliveryEnabled?: boolean;
  sellerFiscalizationOwner?: 'platform' | 'seller' | string | null;
  highlightsJson?: string[];
  specsJson?: Array<{ name: string; value: string }>;
  seller?: {
    id: string;
    name: string;
    onlinePaymentEnabled?: boolean;
    cashOnDeliveryEnabled?: boolean;
    fiscalizationOwner?: 'platform' | 'seller';
  };
}

export const mapBackendProductToFrontend = (bp: BackendProduct): Product => {
  let images: string[] = [];
  
  if (Array.isArray(bp.images) && bp.images.length > 0) {
    images = bp.images;
  } 
  else if (bp.imagesJson) {
    try {
      images = Array.isArray(bp.imagesJson) ? bp.imagesJson : JSON.parse(bp.imagesJson);
    } catch (e) {
      console.error("Error parsing imagesJson", e);
    }
  }
  
  images = images.filter(img => typeof img === 'string' && img.trim() !== '');
  
  if (images.length === 0 && bp.image) {
    images = [bp.image];
  }

  const sellerOnlinePaymentEnabled = bp.seller?.onlinePaymentEnabled ?? bp.sellerOnlinePaymentEnabled ?? false;
  const sellerCashOnDeliveryEnabled = bp.seller?.cashOnDeliveryEnabled ?? bp.sellerCashOnDeliveryEnabled ?? true;
  const sellerFiscalizationOwner = (bp.seller?.fiscalizationOwner ?? bp.sellerFiscalizationOwner ?? undefined) as 'platform' | 'seller' | undefined;

  return {
    id: bp.id,
    slug: bp.slug,
    name: bp.title,
    price: bp.priceMin,
    image: bp.image,
    images: images,
    category: bp.category,
    description: bp.description,
    type: bp.type || 'market',
    sellerId: bp.sellerId ?? bp.seller?.id,
    sellerName: bp.sellerName ?? bp.seller?.name,
    brand: bp.brand,
    series: bp.series,
    gender: bp.gender as any,
    color: bp.color,
    availableVariants: bp.availableVariants,
    variantStock: bp.variantStock,
    variants: bp.variants,
    maxBonusPercent: bp.maxBonusPercent ?? bp.bonusPercent,
    bonusMax: bp.bonusMax,
    sku: bp.sku,
    pickupPointIds: bp.pickupPointIds,
    isActive: bp.inSale,
    hasAvailableStock: bp.hasAvailableStock,
    highlightsJson: Array.isArray(bp.highlightsJson) ? bp.highlightsJson : [],
    specsJson: Array.isArray(bp.specsJson) ? bp.specsJson : [],
    
    sellerOnlinePaymentEnabled,
    sellerCashOnDeliveryEnabled,
    sellerFiscalizationOwner,
  };
};
