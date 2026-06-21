import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { BonusHistoryRow } from '../../components/profile/BonusHistoryRow';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import type { MobileBonusHistoryItem, MobileBonusHistoryType } from '../../types/mobileProfile';

export const BonusHistoryScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeType, setActiveType] = useState<MobileBonusHistoryType>('all');
  const [items, setItems] = useState<MobileBonusHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchHistory = async (
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
      setError(errMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(activeType, null, false);
  }, [activeType]);

  const handleRefresh = () => {
    fetchHistory(activeType, null, true);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchHistory(activeType, nextCursor, false);
    }
  };

  const renderHeaderFilter = () => {
    const filters: { label: string; value: MobileBonusHistoryType }[] = [
      { label: 'Все', value: 'all' },
      { label: 'Начисления', value: 'income' },
      { label: 'Списания', value: 'expense' },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map((f) => {
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
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <AppText variant="caption" color="#6b7280" align="center">
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

  if (loading && items.length === 0) {
    return <LoadingView message="Загрузка истории бонусов..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} id="bonus-history-screen">
      {renderHeaderFilter()}

      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <AppText variant="h2" weight="bold" color="#ef4444" align="center" style={styles.errorTitle}>
              Ошибка загрузки
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
                История бонусов пока пуста
              </AppText>
              <AppText variant="caption" align="center" color="#6b7280" style={styles.emptyDescription}>
                Здесь появятся начисления и списания бонусов при совершении заказов и участии в реферальной системе.
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#eff6ff',
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
  },
});

export default BonusHistoryScreen;
