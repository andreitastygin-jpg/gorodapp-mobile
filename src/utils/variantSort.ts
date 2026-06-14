export const normalizeVariantLabel = (label: string | number | null | undefined): string => {
  if (label === null || label === undefined) return '';
  return String(label).trim().replace(',', '.');
};

/**
 * Универсальная функция для натуральной сортировки вариантов товара (размеров).
 */
export const sortVariants = (variants: string[]): string[] => {
  if (!variants || !Array.isArray(variants)) return [];

  const letterSizesOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  const getNumericValue = (v: string): number | null => {
    if (!v) return null;
    let cleaned = normalizeVariantLabel(v);
    
    if (cleaned.includes('⅓')) {
      const base = parseFloat(cleaned.replace('⅓', '')) || 0;
      return base + 0.333333;
    }
    if (cleaned.includes('⅔')) {
      const base = parseFloat(cleaned.replace('⅔', '')) || 0;
      return base + 0.666666;
    }
    
    const num = parseFloat(cleaned);
    const isPureNumber = !isNaN(num) && cleaned.match(/^-?\d*\.?\d*$/);
    
    return isPureNumber ? num : null;
  };

  const getLetterSizeIndex = (v: string): number => {
    return letterSizesOrder.indexOf(v.toUpperCase());
  };

  const uniqueVariants = Array.from(new Set(variants));

  return uniqueVariants.sort((a, b) => {
    const valA = getNumericValue(a);
    const valB = getNumericValue(b);

    if (valA !== null && valB !== null) {
      return valA - valB;
    }

    if (valA !== null) return -1;
    if (valB !== null) return 1;

    const indexA = getLetterSizeIndex(a);
    const indexB = getLetterSizeIndex(b);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.toString().localeCompare(b.toString());
  });
};
