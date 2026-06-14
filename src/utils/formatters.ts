export const formatPrice = (value: number | string | null | undefined): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0 ₽';

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(num)) + ' ₽';
};

export const formatNumber = (value: number | string | null | undefined): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(num));
};

export const safePrice = (price: any): string => {
  const num = Number(price);
  if (price === undefined || price === null || isNaN(num)) {
    return '—';
  }
  return `${num.toLocaleString('ru-RU')} ₽`;
};

export const safeItemName = (item: any): string => {
  if (!item) return 'Товар';
  return item.title || item.name || item.productName || 'Товар';
};

export const safeDelivery = (fee: any): string => {
  const num = Number(fee);
  if (fee === undefined || fee === null || isNaN(num)) {
    return '—';
  }
  if (num === 0) return 'Бесплатно';
  return `${num.toLocaleString('ru-RU')} ₽`;
};

export const safeItemsTotal = (order: any): number => {
  if (typeof order?.subtotal === 'number') {
    return order.subtotal;
  }

  if (order?.items && Array.isArray(order.items)) {
    return order.items.reduce((sum: number, item: any) => {
      if (typeof item.lineTotal === 'number') {
        return sum + item.lineTotal;
      }
      if (typeof item.unitPrice === 'number') {
        return sum + (item.unitPrice * (item.quantity || 1));
      }
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);
  }
  return 0;
};

export const formatDeliveryMethod = (method?: string): string => {
  if (!method) return '';
  const map: Record<string, string> = {
    pickup: 'Пункт выдачи',
    courier: 'Адрес доставки',
  };
  return map[method.toLowerCase()] || method;
};

export const formatPaymentMethod = (method?: string): string => {
  if (!method) return '';
  const map: Record<string, string> = {
    sbp: 'СБП',
    cash: 'Наличные',
    cash_on_delivery: 'Наличные',
    card: 'Онлайн',
    online: 'Онлайн',
  };
  return map[method.toLowerCase()] || method;
};

export const formatPaymentStatus = (status?: string): string => {
  if (!status) return '';
  const map: Record<string, string> = {
    paid: 'Оплачено',
    succeeded: 'Оплачено',
    pending: 'В обработке',
    awaiting_payment: 'Ожидает оплаты',
    cancelled: 'Отменено',
    failed: 'Ошибка оплаты',
    payment_failed: 'Ошибка оплаты',
    expired: 'Истёк',
    refunded: 'Деньги возвращены',
    refund_pending: 'Возврат оплаты в обработке',
    partial_refunded: 'Частичный возврат',
  };
  return map[status.toLowerCase()] || status;
};

export const formatSourceChannel = (channel?: string): string => {
  if (!channel) return '';
  const map: Record<string, string> = {
    web: 'Оформлен на сайте',
    telegram_webapp: 'Оформлен через Telegram',
  };
  return map[channel.toLowerCase()] || channel;
};
