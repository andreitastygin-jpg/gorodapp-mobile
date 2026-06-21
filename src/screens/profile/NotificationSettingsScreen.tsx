import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { NotificationToggleRow } from '../../components/profile/NotificationToggleRow';

interface LocalSettingsState {
  enabled: boolean;
  orders: boolean;
  bonus: boolean;
  promo: boolean;
  news: boolean;
}

export const NotificationSettingsScreen: React.FC = () => {
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Safe initial default states as defined by requirements
  const initialSettings: LocalSettingsState = {
    enabled: false,
    orders: true,
    bonus: true,
    promo: true,
    news: false,
  };

  const [settings, setSettings] = useState<LocalSettingsState>(initialSettings);
  const [originalSettings, setOriginalSettings] = useState<LocalSettingsState>(initialSettings);

  const handleToggle = (key: keyof LocalSettingsState, val: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: val };
      // If turning off main notifications, we keep sublevel states but they will be visually disabled
      return next;
    });
  };

  const isDirty = (): boolean => {
    return (
      settings.enabled !== originalSettings.enabled ||
      settings.orders !== originalSettings.orders ||
      settings.bonus !== originalSettings.bonus ||
      settings.promo !== originalSettings.promo ||
      settings.news !== originalSettings.news
    );
  };

  const handleSave = async () => {
    if (!isDirty()) {
      Alert.alert('Нет изменений', 'Изменений для сохранения не обнаружено.');
      return;
    }

    setSaving(true);
    console.log('[NotificationSettings] saving');

    try {
      // Simulate short local update flow and safely apply changes
      await new Promise((resolve) => setTimeout(resolve, 300));

      setOriginalSettings(settings);
      console.log('[NotificationSettings] saved locally');
      Alert.alert(
        'Успех',
        'Настройки сохранены локально. Push-уведомления будут подключены в следующем техническом этапе.',
        [{ text: 'ОК' }]
      );
    } catch (error) {
      console.log('[NotificationSettings] failed');
      const errorMsg = error instanceof Error ? error.message : String(error);
      Alert.alert('Ошибка', `Не удалось сохранить настройки: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Reset to current saved/loaded settings
    setSettings(originalSettings);
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeContainer} id="notification-settings-screen">
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
        {/* Banner Info Card */}
        <View style={styles.bannerCard} id="notification-banner">
          <View style={styles.bannerIconContainer}>
            <AppText style={styles.bannerIcon}>🔔</AppText>
          </View>
          <View style={styles.bannerTextContainer}>
            <AppText variant="h2" weight="bold" color="#111827">
              Уведомления
            </AppText>
            <AppText variant="caption" color="#6b7280" style={styles.bannerSubtitle}>
              Настройте, какие уведомления вы хотите получать.
            </AppText>
            
            <View style={styles.statusBadge}>
              <AppText variant="caption" color="#d97706" weight="medium" style={styles.statusBadgeText}>
                ⚠️ Push-уведомления будут подключены в следующем техническом этапе
              </AppText>
            </View>
          </View>
        </View>

        {/* Sync message */}
        <View style={styles.syncCard}>
          <AppText variant="caption" color="#4b5563" align="center" style={styles.syncText}>
            Текущие настройки будут синхронизированы после подключения push-уведомлений.
          </AppText>
        </View>

        {/* Global toggling section */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Уведомления приложения
        </AppText>
        <View style={styles.groupCard}>
          <NotificationToggleRow
            title="Уведомления приложения"
            subtitle="Получать push-уведомления от Города"
            value={settings.enabled}
            onValueChange={(val) => handleToggle('enabled', val)}
            disabled={saving}
          />
        </View>

        {/* Category toggling section */}
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
          Категории уведомлений
        </AppText>
        <View style={styles.groupCard}>
          <NotificationToggleRow
            title="Заказы"
            subtitle="Статусы заказов и доставки"
            value={settings.orders}
            onValueChange={(val) => handleToggle('orders', val)}
            disabled={!settings.enabled || saving}
          />
          <NotificationToggleRow
            title="Бонусы"
            subtitle="Начисления и списания бонусов"
            value={settings.bonus}
            onValueChange={(val) => handleToggle('bonus', val)}
            disabled={!settings.enabled || saving}
          />
          <NotificationToggleRow
            title="Акции"
            subtitle="Скидки, акции и специальные предложения"
            value={settings.promo}
            onValueChange={(val) => handleToggle('promo', val)}
            disabled={!settings.enabled || saving}
          />
          <NotificationToggleRow
            title="Новости"
            subtitle="Новости сервиса и обновления"
            value={settings.news}
            onValueChange={(val) => handleToggle('news', val)}
            disabled={!settings.enabled || saving}
          />
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <AppButton
            title={saving ? 'Сохранение...' : 'Сохранить настройки'}
            onPress={handleSave}
            style={styles.saveBtn}
            disabled={saving || !isDirty()}
          />
          {!isDirty() && !saving && (
            <AppText variant="caption" color="#9ca3af" align="center" style={styles.noChangesHint}>
              Нет изменений для сохранения
            </AppText>
          )}
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
    backgroundColor: '#eff6ff',
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
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fef3c7',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  syncCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  syncText: {
    fontSize: 11,
    lineHeight: 15,
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
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
  },
  noChangesHint: {
    marginTop: 8,
    fontSize: 11,
  },
});

export default NotificationSettingsScreen;
