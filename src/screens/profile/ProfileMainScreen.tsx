import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { ProfileMenuItem } from '../../components/profile/ProfileMenuItem';
import { ProfileStatCard } from '../../components/profile/ProfileStatCard';

import { mobileProfileApi } from '../../services/mobileProfileApi';
import type { MobileProfileResponse } from '../../types/mobileProfile';
import { useAuthStore } from '../../store/useAuthStore';
import type { ProfileStackParamList } from './ProfileStackNavigator';
import { logoutMobileUser } from '../../services/mobileLogout';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export const ProfileMainScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { clearMobileAuthSession } = useAuthStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [profile, setProfile] = useState<MobileProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const fetchProfile = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    setError(null);
    setIsAuthError(false);
    console.log('[ProfileMain] loading profile');

    try {
      const data = await mobileProfileApi.getProfile();
      setProfile(data);
      console.log('[ProfileMain] profile loaded');
    } catch (err) {
      console.log('[ProfileMain] profile load failed');
      const errMessage = err instanceof Error ? err.message : String(err);
      setError(errMessage);

      // Detect if this is an auth token error
      const lowerMsg = errMessage.toLowerCase();
      if (
        lowerMsg.includes('auth') ||
        lowerMsg.includes('token') ||
        lowerMsg.includes('authenticated') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('login')
      ) {
        setIsAuthError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile(false);
  };

  const handleLogoutPress = () => {
    if (loggingOut) return;

    Alert.alert(
      'Выйти из аккаунта?',
      'Вы сможете снова войти через Telegram.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logoutMobileUser();
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось выйти. Попробуйте ещё раз.');
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return <LoadingView message="Загрузка профиля..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <AppText variant="h1" align="center" color="#ef4444" style={styles.errorTitle}>
            {isAuthError ? 'Сессия истекла' : 'Ошибка загрузки'}
          </AppText>
          <AppText variant="body" align="center" color="#4b5563" style={styles.errorText}>
            {isAuthError ? 'Нужно войти в аккаунт' : error}
          </AppText>
          
          <AppButton
            title="Повторить"
            onPress={() => fetchProfile()}
            style={styles.retryButton}
          />

          {isAuthError && (
            <AppButton
              title="Вернуться ко входу"
              variant="outline"
              onPress={() => clearMobileAuthSession()}
              style={styles.authBackButton}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return null;
  }

  const { user, stats, referral } = profile;
  const initialLetter = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'G';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
        }
      >
        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <AppText style={styles.avatarLetter} variant="h1" color="#ffffff">
                  {initialLetter}
                </AppText>
              </View>
            )}

            <View style={styles.userInfo}>
              <AppText variant="h2" weight="bold" color="#111827">
                {user.displayName}
              </AppText>
              {user.username && (
                <AppText variant="caption" color="#4b5563" style={{ marginTop: 2 }}>
                  @{user.username}
                </AppText>
              )}
              {user.isPremium && (
                <View style={styles.premiumBadge}>
                  <AppText variant="caption" color="#ffffff" weight="bold" style={styles.premiumText}>
                    ★ GOROD+ PREMIUM
                  </AppText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.syncStatus}>
            <View style={styles.greenDot} />
            <AppText variant="caption" color="#10b981" weight="medium">
              Облачная синхронизация активна
            </AppText>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <ProfileStatCard label="Заказы" value={stats.ordersCount} />
          <ProfileStatCard label="Друзья" value={stats.friendsCount} />
          <ProfileStatCard label="Бонусы" value={stats.bonusBalance} />
        </View>

        {/* Referral Card */}
        <View style={styles.card}>
          <View style={styles.referralHeader}>
            <AppText style={styles.referralIcon}>🎁</AppText>
            <View style={styles.referralTitleContainer}>
              <AppText variant="title" weight="bold" color="#1f2937">
                Пригласить друга
              </AppText>
              <AppText variant="caption" color="#6b7280" style={{ marginTop: 2 }}>
                Приглашайте друзей и получайте кэшбэк
              </AppText>
            </View>
          </View>

          <View style={styles.referralCodeContainer}>
            <AppText variant="caption" color="#6b7280">
              Ваш промокод:
            </AppText>
            <AppText variant="h2" weight="bold" color="#3b82f6" style={styles.promoCodeText}>
              {referral.referralCode || 'Код пока не создан'}
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.detailsBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Referral')}
          >
            <AppText variant="body" color="#3b82f6" weight="medium">
              Подробнее
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Services List Card */}
        <View style={styles.menuCard}>
          <ProfileMenuItem
            title="Мои заказы"
            icon="📦"
            onPress={() => navigation.navigate('Orders')}
          />
          <ProfileMenuItem
            title="Мои бонусы"
            icon="💎"
            onPress={() => navigation.navigate('BonusHistory')}
          />
          <ProfileMenuItem
            title="Пригласить друга"
            icon="👥"
            onPress={() => navigation.navigate('Referral')}
          />
          <ProfileMenuItem
            title="Мои данные"
            icon="👤"
            onPress={() => navigation.navigate('PersonalData')}
          />
          <ProfileMenuItem
            title="Мои адреса доставки"
            icon="📍"
            onPress={() => navigation.navigate('DeliveryAddresses')}
          />
          <ProfileMenuItem
            title="Уведомления"
            icon="🔔"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <ProfileMenuItem
            title="Настройки приложения"
            icon="⚙️"
            onPress={() => navigation.navigate('AppSettings')}
          />

          {user.isAdmin && (
            <ProfileMenuItem
              title="Админ-панель"
              icon="🛡️"
              onPress={() => {
                console.log('[ProfileMain] Admin panel item pressed');
                Alert.alert('Доступ разрешен', 'Вы являетесь администратором системы.');
              }}
            />
          )}

          <ProfileMenuItem
            title={loggingOut ? 'Выходим...' : 'Выйти'}
            icon="🚪"
            onPress={loggingOut ? () => {} : handleLogoutPress}
            titleColor="#ef4444"
            showArrow={false}
          />
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
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  premiumText: {
    fontSize: 10,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  referralTitleContainer: {
    flex: 1,
  },
  referralCodeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  promoCodeText: {
    marginTop: 4,
  },
  detailsBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 180,
    marginBottom: 12,
  },
  authBackButton: {
    minWidth: 180,
  },
});

export default ProfileMainScreen;
