import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../../components/ui/AppText';
import { SettingsRow } from '../../components/profile/SettingsRow';
import { ProfileStackParamList } from './ProfileStackNavigator';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import { logoutMobileUser } from '../../services/mobileLogout';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'AppSettings'>;

export const AppSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт?',
      'Личные данные, адреса и бонусный баланс будут удалены. История заказов будет сохранена в обезличенном виде для учёта. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Продолжить',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Подтвердите удаление',
              'После удаления вы выйдете из аккаунта и не сможете восстановить текущий профиль.',
              [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Удалить аккаунт',
                  style: 'destructive',
                  onPress: executeDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const executeDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await mobileProfileApi.deleteAccount();
      if (result.success) {
        await logoutMobileUser();
      } else {
        Alert.alert(
          'Не удалось удалить аккаунт',
          result.message || 'Попробуйте позже или обратитесь в поддержку.'
        );
      }
    } catch (error: any) {
      console.log('[AppSettings] Delete account failed');
      const errorStr = String(error).toLowerCase();
      if (
        errorStr.includes('401') ||
        errorStr.includes('403') ||
        errorStr.includes('unauthorized') ||
        errorStr.includes('forbidden') ||
        errorStr.includes('access denied') ||
        errorStr.includes('account has been deleted') ||
        errorStr.includes('аккаунт удал') ||
        errorStr.includes('сессия')
      ) {
        // Session invalid or account already deleted -> logout immediately
        await logoutMobileUser();
      } else {
        Alert.alert(
          'Не удалось удалить аккаунт',
          'Попробуйте позже или обратитесь в поддержку.'
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnsupportedFeature = (featureName: string) => {
    Alert.alert(
      'В разработке',
      `${featureName} появится в следующих версиях приложения.`,
      [{ text: 'ОК' }]
    );
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Ошибка', `Не удалось открыть ссылку: ${url}`);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Произошла ошибка при открытии ссылки.');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} id="app-settings-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Informational Card */}
        <View style={styles.bannerCard} id="settings-banner">
          <View style={styles.bannerIconContainer}>
            <AppText style={styles.bannerIcon}>⚙️</AppText>
          </View>
          <View style={styles.bannerTextContainer}>
            <AppText variant="h2" weight="bold" color="#111827">
              Настройки приложения
            </AppText>
            <AppText variant="caption" color="#6b7280" style={styles.bannerSubtitle}>
              Управляйте основными параметрами и информацией о приложении.
            </AppText>
          </View>
        </View>

        {/* Section: Основное */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Основное
        </AppText>
        <View style={styles.groupCard}>
          <SettingsRow
            title="Тема приложения"
            value="Светлая"
            onPress={() => handleUnsupportedFeature('Переключение темы')}
          />
          <SettingsRow
            title="Язык"
            value="Русский"
            onPress={() => handleUnsupportedFeature('Выбор языка')}
          />
          <SettingsRow
            title="Уведомления"
            value="Настроить"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>

        {/* Section: Безопасность */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Безопасность
        </AppText>
        <View style={styles.groupCard}>
          <SettingsRow
            title="Вход через Telegram"
            value="Активный способ входа"
            subtitle="Ваш аккаунт привязан к Telegram-профилю"
          />
          <SettingsRow
            title="Защищённая сессия"
            value="Firebase Auth"
            subtitle="Ваш сеанс защищен современным шифрованием"
          />
        </View>

        {/* Section: О приложении */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          О приложении
        </AppText>
        <View style={styles.groupCard}>
          <SettingsRow
            title="Gorodapp mobile"
            value="Мобильное приложение Города"
          />
          <SettingsRow
            title="Версия приложения"
            value="1.0.0"
          />
          <SettingsRow
            title="Сайт"
            value="gorodapp.ru"
            onPress={() => handleOpenLink('https://gorodapp.ru')}
          />
          <SettingsRow
            title="Пользовательское соглашение"
            onPress={() => handleOpenLink('https://gorodapp.ru')}
          />
          <SettingsRow
            title="Политика конфиденциальности"
            onPress={() => handleOpenLink('https://gorodapp.ru')}
          />
        </View>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          id="delete-account-button"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <AppText style={styles.deleteButtonText} weight="bold">
              Удалить аккаунт
            </AppText>
          )}
        </TouchableOpacity>

        {/* Brand footer */}
        <View style={styles.footerContainer}>
          <AppText variant="caption" color="#9ca3af" align="center">
            Разработано командой Города
          </AppText>
          <AppText variant="caption" color="#d1d5db" align="center" style={styles.footerSub}>
            © 2026 Все права защищены.
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
    backgroundColor: '#f1f5f9',
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
  },
  deleteButton: {
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
  },
  footerContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footerSub: {
    marginTop: 2,
    fontSize: 11,
  },
});

export default AppSettingsScreen;
