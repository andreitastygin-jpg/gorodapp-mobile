import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { OrderCard } from '../../components/profile/OrderCard';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import { MobileOrder } from '../../types/mobileProfile';
import { ProfileStackParamList } from './ProfileStackNavigator';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Orders'>;

type FilterType = 'all' | 'active' | 'completed' | 'cancelled';

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Fetch orders from API
  const fetchOrders = useCallback(
    async (filter: FilterType, cursorToUse?: string, append: boolean = false) => {
      if (cursorToUse) {
        setLoadingMore(true);
      } else if (!append) {
        setLoading(true);
      }

      console.log('[Orders] loading');
      setError(null);

      try {
        const fetchStatus = filter === 'all' ? undefined : filter;
        const response = await mobileProfileApi.getOrders({
          limit: 15,
          status: fetchStatus,
          cursor: cursorToUse,
        });

        if (append) {
          setOrders((prev) => [...prev, ...response.orders]);
        } else {
          setOrders(response.orders);
        }

        setNextCursor(response.nextCursor);
        console.log('[Orders] loaded');
      } catch (err) {
        console.log('[Orders] failed');
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchOrders(activeFilter);
  }, [activeFilter, fetchOrders]);

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(activeFilter);
  };

  // Pagination loader
  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchOrders(activeFilter, nextCursor, true);
    }
  };

  // Switch tabs
  const handleSelectFilter = (filter: FilterType) => {
    if (filter === activeFilter) return;
    setOrders([]);
    setNextCursor(null);
    setError(null);
    setLoading(true);
    setActiveFilter(filter);
  };

  // Filter chips render details
  const filterTabs: { label: string; key: FilterType }[] = [
    { label: 'Все', key: 'all' },
    { label: 'Активные', key: 'active' },
    { label: 'Завершённые', key: 'completed' },
    { label: 'Отменённые', key: 'cancelled' },
  ];

  return (
    <SafeAreaView style={styles.safeContainer} id="orders-screen">
      {/* Scrollable Filter Badges Container */}
      <View style={styles.filterOuterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterTabs.map((tab) => {
            const isActive = tab.key === activeFilter;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleSelectFilter(tab.key)}
                activeOpacity={0.75}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                id={`filter-chip-${tab.key}`}
              >
                <AppText
                  variant="caption"
                  weight={isActive ? 'bold' : 'medium'}
                  color={isActive ? '#ffffff' : '#4b5563'}
                >
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && orders.length === 0 ? (
        <LoadingView message="Загружаем ваши заказы..." />
      ) : error && orders.length === 0 ? (
        <ErrorView message={error} onRetry={() => fetchOrders(activeFilter)} />
      ) : (
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
          {orders.length === 0 ? (
            <View style={styles.emptyContainer} id="orders-empty">
              <View style={styles.emptyIconContainer}>
                <AppText style={styles.emptyIcon}>🛍️</AppText>
              </View>
              <AppText variant="h2" weight="bold" color="#111827" align="center">
                Заказов пока нет
              </AppText>
              <AppText variant="body" align="center" color="#6b7280" style={styles.emptyText}>
                Здесь появятся ваши покупки и их статусы. Сделайте свой первый заказ!
              </AppText>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                />
              ))}

              {nextCursor ? (
                <View style={styles.paginateButtonContainer}>
                  <AppButton
                    title={loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    style={styles.loadMoreBtn}
                    variant="outline"
                  />
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  filterOuterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#eff6ff',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyText: {
    marginTop: 8,
    lineHeight: 20,
  },
  paginateButtonContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  loadMoreBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
  },
});

export default OrdersScreen;
