import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { AppText } from '../ui/AppText';
import { MobileOrderItem } from '../../types/mobileProfile';

interface OrderItemRowProps {
  item: MobileOrderItem;
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({ item }) => {
  const formattedPrice = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(item.price).replace('RUB', '₽');

  return (
    <View style={styles.container} id={`order-item-row-${item.id || item.name.toLowerCase().replace(/\s+/g, '-')}`}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <AppText style={styles.placeholderIcon} variant="caption" color="#cbd5e1">
            📦
          </AppText>
        </View>
      )}

      <View style={styles.detailsContainer}>
        <AppText variant="body" weight="bold" color="#111827" style={styles.name} numberOfLines={2}>
          {item.name}
        </AppText>

        {(item.brand || item.size) && (
          <View style={styles.metaContainer}>
            {item.brand && (
              <AppText variant="caption" color="#6b7280" style={styles.metaText}>
                Бренд: {item.brand}
              </AppText>
            )}
            {item.brand && item.size && <AppText variant="caption" color="#cbd5e1" style={styles.dot}> • </AppText>}
            {item.size && (
              <AppText variant="caption" color="#6b7280" style={styles.metaText}>
                Размер: {item.size}
              </AppText>
            )}
          </View>
        )}

        <View style={styles.priceQuantityContainer}>
          <AppText variant="caption" color="#6b7280">
            {item.quantity} шт. × {formattedPrice}
          </AppText>
          <AppText variant="body" weight="bold" color="#111827">
            {new Intl.NumberFormat('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(item.price * item.quantity).replace('RUB', '₽')}
          </AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 20,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    lineHeight: 18,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
  },
  dot: {
    fontSize: 10,
  },
  priceQuantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default OrderItemRow;
