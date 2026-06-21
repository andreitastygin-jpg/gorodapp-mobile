import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppText } from '../ui/AppText';
import { MobileOrder } from '../../types/mobileProfile';

interface OrderCardProps {
  order: MobileOrder;
  onPress: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  // Extract a shorter, human-readable ID if it's too long (like a uuid)
  const shortId = order.id.length > 8 ? order.id.slice(0, 8).toUpperCase() : order.id;

  // Format Date gracefully
  const formatDate = (dateValue: string) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateValue;
    }
  };

  // Humanize delivery method
  const getMethodLabel = (method?: 'pickup' | 'delivery') => {
    if (method === 'delivery') return '📍 Доставка';
    if (method === 'pickup') return '🏬 Самовывоз';
    return null;
  };

  // Determine elegant status color scheme
  const getStatusColors = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('cancel') || s.includes('fail') || s.includes('reject')) {
      return { bg: '#fef2f2', text: '#ef4444' }; // Red
    }
    if (s.includes('complete') || s.includes('deliver') || s.includes('success') || s.includes('done')) {
      return { bg: '#f0fdf4', text: '#15803d' }; // Green
    }
    // Active, in progress, pending, created, processing etc.
    return { bg: '#eff6ff', text: '#3b82f6' }; // Blue
  };

  const statusColors = getStatusColors(order.status);

  // Format Total beautifully
  const formattedTotal = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(order.total).replace('RUB', '₽');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.cardContainer}
      id={`order-card-${order.id}`}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <AppText variant="body" weight="bold" color="#111827">
            Заказ №{shortId}
          </AppText>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <AppText
              variant="caption"
              weight="bold"
              color={statusColors.text}
              style={styles.statusText}
            >
              {order.statusLabel}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" color="#9ca3af" style={styles.date}>
          {formatDate(order.createdAt)}
        </AppText>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        {order.previewImage ? (
          <Image source={{ uri: order.previewImage }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <AppText style={styles.placeholderIcon}>🛍️</AppText>
          </View>
        )}

        <View style={styles.details}>
          <AppText
            variant="body"
            weight="medium"
            color="#374151"
            numberOfLines={1}
            style={styles.previewTitle}
          >
            {order.previewTitle || `${order.itemsCount} товаров`}
          </AppText>
          
          <AppText variant="caption" color="#6b7280" style={styles.itemsCount}>
            Количество: {order.itemsCount} шт.
          </AppText>

          <View style={styles.metaRow}>
            {getMethodLabel(order.method) && (
              <AppText variant="caption" color="#4b5563" style={styles.metaItem}>
                {getMethodLabel(order.method)}
              </AppText>
            )}
            {order.paymentStatus && (
              <AppText variant="caption" color="#4b5563" style={[styles.metaItem, styles.paymentStatus]}>
                💳 {order.paymentStatus}
              </AppText>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <AppText variant="caption" color="#6b7280">
            Сумма к оплате
          </AppText>
          <AppText variant="body" weight="bold" color="#111827" style={styles.totalPrice}>
            {formattedTotal}
          </AppText>
        </View>
        <View style={styles.chevronContainer}>
          <AppText variant="body" color="#3b82f6" weight="medium" style={styles.chevronText}>
            Подробнее ⟩
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
  },
  date: {
    marginTop: 4,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  details: {
    flex: 1,
    marginLeft: 14,
  },
  previewTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  itemsCount: {
    marginTop: 2,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaItem: {
    marginRight: 10,
    fontSize: 11,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  paymentStatus: {
    backgroundColor: '#f0fdf4',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  priceRow: {
    flexDirection: 'column',
  },
  totalPrice: {
    fontSize: 16,
    marginTop: 1,
  },
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 13,
  },
});

export default OrderCard;
