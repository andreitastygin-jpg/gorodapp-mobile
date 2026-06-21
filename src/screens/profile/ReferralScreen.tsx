import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
  Share,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { ReferralActionCard } from '../../components/profile/ReferralActionCard';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import type { MobileProfileResponse } from '../../types/mobileProfile';

export const ReferralScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [profile, setProfile] = useState<MobileProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReferralData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    setError(null);
    console.log('[Referral] loading');

    try {
      const response = await mobileProfileApi.getProfile();
      setProfile(response);
      console.log('[Referral] loaded');
    } catch (err) {
      console.log('[Referral] failed');
      const errMessage = err instanceof Error ? err.message : String(err);
      setError(errMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReferralData(false);
  };

  const handleCopyCode = (code: string) => {
    Alert.alert(
      'Скопировать вручную',
      `Пожалуйста, скопируйте промокод ниже:\n\n${code}`,
      [{ text: 'ОК' }]
    );
  };

  const handleCopyLink = (link: string) => {
    Alert.alert(
      'Скопировать вручную',
      `Пожалуйста, скопируйте ссылку ниже:\n\n${link}`,
      [{ text: 'ОК' }]
    );
  };

  const handleShare = async (message: string) => {
    try {
      console.log('[Referral] share opened');
      await Share.share({
        message: message,
      });
    } catch (err) {
      console.log('[Referral] share failed');
      Alert.alert('Ошибка', 'Не удалось открыть диалог отправки.');
    }
  };

  if (loading) {
    return <LoadingView message="Загрузка реферальных данных..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer} id="referral-error-screen">
        <View style={styles.errorContainer}>
          <AppText variant="h2" weight="bold" color="#ef4444" align="center" style={styles.errorTitle}>
            Ошибка загрузки
          </AppText>
          <AppText variant="body" align="center" color="#4b5563" style={styles.errorText}>
            {error}
          </AppText>
          <AppButton
            title="Повторить"
            onPress={() => fetchReferralData(true)}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Safe fallback values
  const referralCode = profile?.referral?.referralCode || '';
  const referralLink = (profile?.referral as any)?.referralLink || (referralCode ? `https://gorodapp.ru?ref=${referralCode}` : '');
  const friendsCount = profile?.stats?.friendsCount ?? 0;

  return (
    <SafeAreaView style={styles.safeContainer} id="referral-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
        }
      >
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconContainer}>
            <AppText style={styles.bannerIcon}>🎁</AppText>
          </View>
          <View style={styles.bannerTextContainer}>
            <AppText variant="h2" weight="bold" color="#111827">
              Пригласить друга
            </AppText>
            <AppText variant="caption" color="#6b7280" style={styles.bannerSubtitle}>
              Поделитесь своим кодом с друзьями и получайте бонусы за их активность.
            </AppText>
          </View>
        </View>

        {/* Stats segment */}
        <View style={styles.statsCard}>
          <AppText variant="caption" color="#4b5563" weight="bold" style={styles.statsLabel}>
            Ваша статистика
          </AppText>
          <View style={styles.statsRow}>
            <AppText variant="body" color="#111827">
              Приглашено друзей
            </AppText>
            <View style={styles.friendsBadge}>
              <AppText variant="body" weight="bold" color="#3b82f6">
                {friendsCount}
              </AppText>
            </View>
          </View>
        </View>

        {/* Action controls */}
        {referralCode ? (
          <>
            <ReferralActionCard
              title="Ваш промокод"
              value={referralCode}
              buttonText="Скопировать Promo"
              onPress={() => handleCopyCode(referralCode)}
              secondaryButtonText="Поделиться"
              onSecondaryPress={() => handleShare(`Привет! Используй мой промокод ${referralCode} в приложении Город.`)}
            />

            <ReferralActionCard
              title="Реферальная ссылка"
              value={referralLink}
              buttonText="Скопировать URL"
              onPress={() => handleCopyLink(referralLink)}
              secondaryButtonText="Поделиться"
              onSecondaryPress={() => handleShare(`Привет! Регистрируйся по ссылке и получай бонусы: ${referralLink}`)}
            />
          </>
        ) : (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyIcon}>🥺</AppText>
            <AppText variant="body" weight="medium" color="#4b5563" align="center">
              Код пока не создан
            </AppText>
            <AppText variant="caption" color="#9ca3af" align="center" style={styles.emptySubtext}>
              Упс! Ваш персональный пригласительный код временно недоступен. Попробуйте обновить страницу.
            </AppText>
          </View>
        )}

        {/* Guidelines / How it works */}
        <View style={styles.guideCard}>
          <AppText variant="body" weight="bold" color="#111827" style={styles.guideTitle}>
            Как это работает
          </AppText>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumberBadge}>
              <AppText variant="caption" weight="bold" color="#3b82f6">1</AppText>
            </View>
            <View style={styles.stepTextContainer}>
              <AppText variant="body" weight="medium" color="#1f2937">
                Скопируйте код или ссылку
              </AppText>
              <AppText variant="caption" color="#6b7280" style={styles.stepDescription}>
                Используйте кнопки выше для копирования вашего уникального промокода или прямой реферальной ссылки.
              </AppText>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumberBadge}>
              <AppText variant="caption" weight="bold" color="#3b82f6">2</AppText>
            </View>
            <View style={styles.stepTextContainer}>
              <AppText variant="body" weight="medium" color="#1f2937">
                Отправьте другу
              </AppText>
              <AppText variant="caption" color="#6b7280" style={styles.stepDescription}>
                Поделитесь кодом в мессенджерах или социальных сетях с близкими.
              </AppText>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumberBadge}>
              <AppText variant="caption" weight="bold" color="#3b82f6">3</AppText>
            </View>
            <View style={styles.stepTextContainer}>
              <AppText variant="body" weight="medium" color="#1f2937">
                Получайте бонусы
              </AppText>
              <AppText variant="caption" color="#6b7280" style={styles.stepDescription}>
                На ваш баланс будут зачисляться бонусные баллы после успешной активности или заказов ваших друзей.
              </AppText>
            </View>
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  errorTitle: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 20,
  },
  retryButton: {
    minWidth: 150,
  },
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#fff7ed',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerSubtitle: {
    marginTop: 4,
    lineHeight: 16,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statsLabel: {
    marginBottom: 10,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendsBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptySubtext: {
    marginTop: 8,
    lineHeight: 16,
  },
  guideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  guideTitle: {
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepDescription: {
    marginTop: 2,
    lineHeight: 15,
  },
});

export default ReferralScreen;
