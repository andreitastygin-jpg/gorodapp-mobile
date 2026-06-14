import { Product } from '../types';

export interface BonusCalculationResult {
  maxBonusesToSpend: number;
  maxDiscountInRubles: number;
  finalPrice: number;
}

export const calculateBonusLimitsForPrice = (
  price: number,
  product: Pick<Product, 'bonusMax' | 'maxBonusPercent' | 'variants'> | import('../types').CartItem,
  bonusRate: number
): BonusCalculationResult => {
  let maxBonusesToSpend = 0;

  if (product.bonusMax !== undefined && product.bonusMax > 0) {
    maxBonusesToSpend = product.bonusMax;
  } else if (product.maxBonusPercent !== undefined && product.maxBonusPercent > 0) {
    const maxDiscountRubles = price * (product.maxBonusPercent / 100);
    maxBonusesToSpend = Math.floor(maxDiscountRubles / bonusRate);
  } else {
    const maxDiscountRubles = price * 0.1;
    maxBonusesToSpend = Math.floor(maxDiscountRubles / bonusRate);
  }

  const maxPossibleBonuses = Math.floor(price / bonusRate);
  maxBonusesToSpend = Math.min(maxBonusesToSpend, maxPossibleBonuses);

  const maxDiscountInRubles = maxBonusesToSpend * bonusRate;
  const finalPrice = Math.max(0, price - maxDiscountInRubles);

  return {
    maxBonusesToSpend,
    maxDiscountInRubles,
    finalPrice
  };
};

export const calculateMaxPreviewDiscount = (
  product: Product,
  bonusRate: number
): number => {
  const maxVariantPrice = product.variants && product.variants.length > 0 
    ? Math.max(...product.variants.map(v => v.price)) 
    : product.price;

  const limits = calculateBonusLimitsForPrice(maxVariantPrice, product, bonusRate);
  return limits.maxDiscountInRubles;
};

export const calculateMinPreviewPrice = (
  product: Product,
  bonusRate: number
): number => {
  const minVariantPrice = product.variants && product.variants.length > 0 
    ? Math.min(...product.variants.map(v => v.price)) 
    : product.price;

  const limits = calculateBonusLimitsForPrice(minVariantPrice, product, bonusRate);
  return limits.finalPrice;
};
