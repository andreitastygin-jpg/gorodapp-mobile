import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { BonusHistoryRow } from '../../components/profile/BonusHistoryRow';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import { useAppStore } from '../../store/useAppStore';
import type { MobileBonusHistoryItem, MobileBonusHistoryType } from '../../types/mobileProfile';

export const BonusHistoryScreen: React.FC = () => {
  const userBalance = useAppStore((state) => state.userBalance);
  const bonusDebt = useAppStore((state) => state.bonusDebt);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeType, setActiveType] = useState<MobileBonusHistoryType>('all');
  const [items, setItems] = useState<MobileBonusHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchHistory = useCallback(async (
    type: MobileBonusHistoryType,
    cursor: string | null = null,
    isRefresh = false
  ) => {
    if (cursor) {
      setLoadingMore(true);
    } else if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    console.log('[BonusHistory] loading');

    try {
      // Only silently sync profile to keep balance and bonusDebt fresh when cursor is null (initial, filter change, refresh)
      if (cursor === null) {
        mobileProfileApi.getProfile().then((profile) => {
          if (profile?.stats) {
            useAppStore.getState().setUserData({
              userBalance: profile.stats.bonusBalance ?? 0,
              bonusDebt: profile.stats.bonusDebt ?? 0,
            });
          }
        }).catch(() => {
          // Ignore profile sync errors here
        });
      }

      const response = await mobileProfileApi.getBonusHistory({
        type,
        limit: 20,
        cursor,
      });

      if (cursor) {
        setItems((prev) => [...prev, ...response.items]);
      } else {
        setItems(response.items);
      }
      setNextCursor(response.nextCursor);
      console.log('[BonusHistory] loaded');
    } catch (err) {
      console.log('[BonusHistory] failed');
      const errMessage = err instanceof Error ? err.message : String(err);
      setError(errMessage || 'Не удалось загрузить историю бонусов');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(activeType, null, false);
  }, [activeType, fetchHistory]);

  const handleRefresh = () => {
    fetchHistory(activeType, null, true);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore && !loading) {
      fetchHistory(activeType, nextCursor, false);
    }
  };

  const renderBalanceAndDebtHeader = () => {
    return (
      <View style={styles.headerWrapper}>
        {/* Balance Card */}
        <View style={styles.balanceCard} id="bonus-balance-card">
          <View style={styles.balanceHeader}>
            <AppText variant="caption" color="#6b7280" weight="medium">
              Доступный баланс
            </AppText>
            <AppText style={styles.balanceIcon}>💎</AppText>
          </View>
          <AppText variant="h1" weight="bold" color="#1f2937" style={styles.balanceAmount}>
            {userBalance} Б
          </AppText>
          <AppText variant="caption" color="#9ca3af" style={styles.balanceHint}>
            1 бонус = 1 рубль скидки
          </AppText>
        </View>

        {/* Compact Informational Debt Block (ONLY rendered if bonusDebt > 0) */}
        {bonusDebt > 0 && (
          <View style={styles.debtCard} id="bonus-debt-card">
            <View style={styles.debtHeader}>
              <AppText style={styles.debtIcon}>⚠️</AppText>
              <AppText variant="title" weight="bold" color="#b45309" style={styles.debtTitle}>
                Корректировка бонусов
              </AppText>
            </View>
            <AppText variant="body" weight="bold" color="#92400e" style={styles.debtValue}>
              К погашению: {bonusDebt} Б
            </AppText>
            <AppText variant="caption" color="#78350f" style={styles.debtHelp}>
              Будущие начисления бонусов сначала пойдут на погашение этой суммы.
            </AppText>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filterContainer}>
          {(
            [
              { label: 'Все', value: 'all' as MobileBonusHistoryType },
              { label: 'Начисления', value: 'income' as MobileBonusHistoryType },
              { label: 'Списания', value: 'expense' as MobileBonusHistoryType },
            ]
          ).map((f) => {
            const isSelected = activeType === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => {
                  if (activeType !== f.value) {
                    setActiveType(f.value);
                  }
                }}
                activeOpacity={0.7}
              >
                <AppText
                  variant="body"
                  weight={isSelected ? 'bold' : 'normal'}
                  color={isSelected ? '#3b82f6' : '#6b7280'}
                  align="center"
                >
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <AppText variant="caption" color="#6b7280" align="center" style={{ marginTop: 6 }}>
            Загрузка операций...
          </AppText>
        </View>
      );
    }

    if (nextCursor) {
      return (
        <View style={styles.loadMoreWrapper}>
          <AppButton
            title="Загрузить ещё"
            variant="outline"
            onPress={handleLoadMore}
            style={styles.loadMoreButton}
          />
        </View>
      );
    }

    return <View style={{ height: 20 }} />;
  };

  return (
    <SafeAreaView style={styles.safeContainer} id="bonus-history-screen">
      {renderBalanceAndDebtHeader()}

      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LoadingView message="Загрузка истории бонусов..." />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <AppText variant="h2" weight="bold" color="#ef4444" align="center" style={styles.errorTitle}>
              Не удалось загрузить историю бонусов
            </AppText>
            <AppText variant="body" align="center" color="#4b5563" style={styles.errorText}>
              {error}
            </AppText>
            <AppButton
              title="Повторить"
              onPress={() => fetchHistory(activeType, null, false)}
              style={styles.retryBtn}
            />
          </View>
        </View>
      ) : items.length === 0 ? (
        <FlatList
          data={[1]}
          keyExtractor={() => 'empty'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
          }
          contentContainerStyle={styles.listEmptyContent}
          renderItem={() => (
            <View style={styles.emptyCard}>
              <AppText style={styles.emptyIcon} align="center">💎</AppText>
              <AppText variant="title" weight="bold" color="#1f2937" align="center" style={styles.emptyTitle}>
                История операций пока пуста
              </AppText>
              <AppText variant="caption" align="center" color="#6b7280" style={styles.emptyDescription}>
                Здесь появятся начисления и списания бонусов при совершении заказов и участии в акциях.
              </AppText>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BonusHistoryRow item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
          }
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  balanceIcon: {
    fontSize: 20,
  },
  balanceAmount: {
    fontSize: 32,
    lineHeight: 38,
    color: '#1e293b',
  },
  balanceHint: {
    marginTop: 4,
  },
  debtCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  debtIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  debtTitle: {
    fontSize: 15,
  },
  debtValue: {
    fontSize: 14,
    marginBottom: 4,
  },
  debtHelp: {
    fontSize: 12,
    lineHeight: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 5,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#eff6ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  errorTitle: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 20,
  },
  retryBtn: {
    minWidth: 150,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyDescription: {
    lineHeight: 16,
  },
  loadMoreWrapper: {
    marginVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    minWidth: 160,
    height: 40,
    borderRadius: 10,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default BonusHistoryScreen;
