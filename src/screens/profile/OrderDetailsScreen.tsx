import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from '../../components/ui/AppText';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { OrderItemRow } from '../../components/profile/OrderItemRow';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import { MobileOrderDetails } from '../../types/mobileProfile';
import { ProfileStackParamList } from './ProfileStackNavigator';

type OrderDetailsRouteProp = RouteProp<ProfileStackParamList, 'OrderDetails'>;

export const OrderDetailsScreen: React.FC = () => {
  const route = useRoute<OrderDetailsRouteProp>();
  const { orderId } = route.params;

  const [orderDetails, setOrderDetails] = useState<MobileOrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load order details
  const fetchOrderDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('[OrderDetails] loading');

    try {
      const response = await mobileProfileApi.getOrderById(orderId);
      setOrderDetails(response.order);
      console.log('[OrderDetails] loaded');
    } catch (err) {
      console.log('[OrderDetails] failed');
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails();
  };

  if (loading && !orderDetails) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <LoadingView message="Загружаем детали заказа..." />
      </SafeAreaView>
    );
  }

  if (error && !orderDetails) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ErrorView message={error} onRetry={fetchOrderDetails} />
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ErrorView message="Детали заказа не найдены" onRetry={fetchOrderDetails} />
      </SafeAreaView>
    );
  }

  // Format ID for visual beauty
  const shortId = orderDetails.id.length > 8 ? orderDetails.id.slice(0, 8).toUpperCase() : orderDetails.id;

  // Format Helper for dates
  const formatDate = (dateValue: string) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateValue;
    }
  };

  // Helper for currency formatting
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val).replace('RUB', '₽');
  };

  // Determine elegant status color scheme
  const getStatusColors = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('cancel') || s.includes('fail') || s.includes('reject')) {
      return { bg: '#fef2f2', text: '#ef4444' };
    }
    if (s.includes('complete') || s.includes('deliver') || s.includes('success') || s.includes('done')) {
      return { bg: '#f0fdf4', text: '#15803d' };
    }
    return { bg: '#eff6ff', text: '#3b82f6' };
  };

  const statusColors = getStatusColors(orderDetails.status);

  return (
    <SafeAreaView style={styles.safeContainer} id="order-details-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Banner Card */}
        <View style={styles.bannerCard} id="order-details-banner">
          <View style={styles.bannerHeader}>
            <AppText variant="h2" weight="bold" color="#111827">
              Заказ №{shortId}
            </AppText>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <AppText variant="caption" weight="bold" color={statusColors.text}>
                {orderDetails.statusLabel}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color="#6b7280" style={styles.bannerDate}>
            Оформлен: {formatDate(orderDetails.createdAt)}
          </AppText>
        </View>

        {/* Section: Товары */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Товары ({orderDetails.itemsCount})
        </AppText>
        <View style={styles.groupCard}>
          {orderDetails.items && orderDetails.items.length > 0 ? (
            orderDetails.items.map((item, index) => (
              <OrderItemRow key={item.id || index} item={item} />
            ))
          ) : (
            <View style={styles.noItemsPadding}>
              <AppText variant="body" color="#6b7280" align="center">
                Список товаров пуст.
              </AppText>
            </View>
          )}
        </View>

        {/* Section: Способ получения и адрес */}
        {(orderDetails.method || orderDetails.deliveryAddress || orderDetails.pickupPoint || orderDetails.comment) && (
          <>
            <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
              Доставка и получение
            </AppText>
            <View style={styles.groupCard}>
              {orderDetails.method && (
                <View style={styles.infoRow}>
                  <AppText variant="body" color="#6b7280" style={styles.infoLabel}>
                    Способ получения:
                  </AppText>
                  <AppText variant="body" weight="medium" color="#111827" style={styles.infoVal}>
                    {orderDetails.method === 'delivery' ? '📍 Доставка курьером' : '🏬 Самовывоз'}
                  </AppText>
                </View>
              )}

              {orderDetails.method === 'delivery' && orderDetails.deliveryAddress && (
                <View style={[styles.infoRow, styles.directionColumn]}>
                  <AppText variant="body" color="#6b7280" style={styles.infoLabel}>
                    Адрес доставки:
                  </AppText>
                  <AppText variant="body" weight="medium" color="#111827" style={styles.longText}>
                    {orderDetails.deliveryAddress}
                  </AppText>
                </View>
              )}

              {orderDetails.method === 'pickup' && orderDetails.pickupPoint && (
                <View style={[styles.infoRow, styles.directionColumn]}>
                  <AppText variant="body" color="#6b7280" style={styles.infoLabel}>
                    Пункт выдачи:
                  </AppText>
                  <AppText variant="body" weight="medium" color="#111827" style={styles.longText}>
                    {orderDetails.pickupPoint}
                  </AppText>
                </View>
              )}

              {orderDetails.comment && (
                <View style={[styles.infoRow, styles.directionColumn]}>
                  <AppText variant="body" color="#6b7280" style={styles.infoLabel}>
                    Комментарий к заказу:
                  </AppText>
                  <AppText variant="body" color="#4b5563" style={[styles.longText, styles.commentText]}>
                    «{orderDetails.comment}»
                  </AppText>
                </View>
              )}
            </View>
          </>
        )}

        {/* Section: Оплата */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Детали оплаты
        </AppText>
        <View style={styles.groupCard}>
          {orderDetails.paymentMethod && (
            <View style={styles.infoRow}>
              <AppText variant="body" color="#6b7280" style={styles.infoLabel}>
                Способ оплаты:
              </AppText>
              <AppText variant="body" weight="medium" color="#111827" style={styles.infoVal}>
                {orderDetails.paymentMethod}
              </AppText>
            </View>
          )}

          {orderDetails.paymentStatus && (
            <View style={styles.infoRow}>
              <AppText variant="body" color="#6b7280" style={styles.infoLabel}>
                Статус оплаты:
              </AppText>
              <AppText variant="body" weight="bold" color={orderDetails.paymentStatus.toLowerCase().includes('оплач') ? '#15803d' : '#d97706'} style={styles.infoVal}>
                {orderDetails.paymentStatus}
              </AppText>
            </View>
          )}
        </View>

        {/* Section: Итог */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Финансовый расчет
        </AppText>
        <View style={styles.groupCard}>
          <View style={styles.financialRow}>
            <AppText variant="body" color="#6b7280">
              Стоимость товаров:
            </AppText>
            <AppText variant="body" color="#111827">
              {formatCurrency(orderDetails.subtotal || orderDetails.total - (orderDetails.deliveryFee || 0))}
            </AppText>
          </View>

          {orderDetails.deliveryFee !== undefined && orderDetails.deliveryFee > 0 && (
            <View style={styles.financialRow}>
              <AppText variant="body" color="#6b7280">
                Доставка:
              </AppText>
              <AppText variant="body" color="#111827">
                {formatCurrency(orderDetails.deliveryFee)}
              </AppText>
            </View>
          )}

          {orderDetails.bonusesUsed !== undefined && orderDetails.bonusesUsed > 0 && (
            <View style={styles.financialRow}>
              <AppText variant="body" color="#6b7280">
                Списано бонусов:
              </AppText>
              <AppText variant="body" color="#ef4444" weight="medium">
                -{orderDetails.bonusesUsed} Б
              </AppText>
            </View>
          )}

          <View style={[styles.financialRow, styles.totalRow]}>
            <AppText variant="body" weight="bold" color="#111827">
              Итого к оплате:
            </AppText>
            <AppText variant="h2" weight="bold" color="#111827">
              {formatCurrency(orderDetails.total)}
            </AppText>
          </View>

          {orderDetails.earnedBonuses !== undefined && orderDetails.earnedBonuses > 0 && (
            <View style={styles.earnedBonusesCard}>
              <AppText variant="caption" color="#15803d" weight="bold">
                🎉 Будет начислено: +{orderDetails.earnedBonuses} бонусов
              </AppText>
            </View>
          )}
        </View>

        {/* Technical Notice */}
        <View style={styles.footerSpacing}>
          <AppText variant="caption" color="#9ca3af" align="center">
            Функции отмены и возврата будут доступны в следующих версиях приложения.
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bannerDate: {
    marginTop: 8,
    fontSize: 12,
  },
  sectionHeader: {
    marginLeft: 8,
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  noItemsPadding: {
    paddingVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  directionColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 13,
  },
  longText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  commentText: {
    fontStyle: 'italic',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 6,
    paddingTop: 14,
    alignItems: 'center',
  },
  earnedBonusesCard: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  footerSpacing: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
});

export default OrderDetailsScreen;
