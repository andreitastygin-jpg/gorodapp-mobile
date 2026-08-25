import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { NotificationToggleRow } from '../../components/profile/NotificationToggleRow';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  registerDevicePushToken,
  updateDevicePushSettings,
  getOrCreateDeviceId,
} from '../../services/pushNotifications';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import * as Device from 'expo-device';

export const NotificationSettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [enabled, setEnabled] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [isPhysicalDevice, setIsPhysicalDevice] = useState<boolean>(true);

  const loadStatus = useCallback(async () => {
    try {
      const isDevice = Device.isDevice;
      setIsPhysicalDevice(isDevice);

      const perm = await checkNotificationPermission();
      setPermissionGranted(perm.granted);
      setCanAskAgain(perm.canAskAgain);

      const deviceId = await getOrCreateDeviceId();
      const settings = await mobileProfileApi.getPushSettings(deviceId);

      if (perm.granted && settings.registered && settings.enabled) {
        setEnabled(true);
      } else {
        setEnabled(false);
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed checking status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleToggle = async (nextValue: boolean) => {
    if (updating) return;

    setUpdating(true);
    console.log('[NotificationSettings] toggling to:', nextValue);

    try {
      if (nextValue) {
        // Toggling ON: Check/request system permission first
        if (!permissionGranted) {
          if (canAskAgain) {
            const granted = await requestNotificationPermission();
            if (!granted) {
              setPermissionGranted(false);
              setEnabled(false);
              Alert.alert(
                'Разрешение не получено',
                'Уведомления отключены в настройках устройства. Чтобы получать уведомления, разрешите их в настройках системы.'
              );
              return;
            }
            setPermissionGranted(true);
          } else {
            setEnabled(false);
            Alert.alert(
              'Уведомления отключены',
              'Уведомления отключены в настройках устройства. Перейдите в настройки системы, чтобы включить уведомления для GorodApp.'
            );
            return;
          }
        }

        // Register token with enabled: true (single mutation)
        const result = await registerDevicePushToken({ forceRequestPermission: true, enabled: true });
        if (result.success) {
          setEnabled(true);
        } else {
          setEnabled(false);
          const errorMsg = result.reason || 'Не удалось включить push-уведомления';
          Alert.alert('Ошибка', errorMsg);
        }
      } else {
        // Toggling OFF: update backend to disabled via PATCH
        await updateDevicePushSettings(false);
        setEnabled(false);
      }
    } catch (error) {
      console.error('[NotificationSettings] Toggle failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Не удалось обновить настройки';
      Alert.alert('Ошибка', errorMsg);
      // Revert state on failure
      loadStatus();
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestPermissionButton = async () => {
    setUpdating(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermissionGranted(true);
        const result = await registerDevicePushToken({ forceRequestPermission: true, enabled: true });
        if (result.success) {
          setEnabled(true);
        } else {
          setEnabled(false);
          const errorMsg = result.reason || 'Не удалось включить push-уведомления';
          Alert.alert('Ошибка', errorMsg);
        }
      } else {
        setPermissionGranted(false);
        Alert.alert(
          'Уведомления отключены',
          'Уведомления отключены в настройках устройства. Разрешите их в настройках системы для получения оповещений.'
        );
      }
    } catch (err) {
      console.warn('[NotificationSettings] Permission request error:', err);
    } finally {
      setUpdating(false);
      loadStatus();
    }
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
              Получайте важную информацию о заказах, акциях и начислении бонусов.
            </AppText>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <AppText variant="caption" color="#6b7280" style={{ marginTop: 8 }}>
              Проверка статуса уведомлений...
            </AppText>
          </View>
        ) : (
          <>
            {/* Warning if permission is denied in OS */}
            {!permissionGranted && (
              <View style={styles.warningCard} id="notification-permission-warning">
                <View style={styles.warningHeader}>
                  <AppText style={styles.warningIcon}>⚠️</AppText>
                  <AppText variant="title" weight="bold" color="#b45309" style={styles.warningTitle}>
                    Уведомления отключены в настройках устройства
                  </AppText>
                </View>
                <AppText variant="caption" color="#78350f" style={styles.warningBody}>
                  Чтобы получать оповещения о заказах и статусе доставки, включите разрешение на отправку уведомлений.
                </AppText>
                {canAskAgain && (
                  <AppButton
                    title="Разрешить уведомления"
                    variant="outline"
                    onPress={handleRequestPermissionButton}
                    style={styles.enablePermButton}
                    disabled={updating}
                  />
                )}
              </View>
            )}

            {!isPhysicalDevice && (
              <View style={styles.simulatorCard}>
                <AppText variant="caption" color="#4b5563" style={styles.simulatorText}>
                  ℹ️ Приложение запущено в симуляторе/эмуляторе. Удалённые push-уведомления доступны только на реальных устройствах.
                </AppText>
              </View>
            )}

            {/* Global push toggle section */}
            <AppText variant="caption" color="#4b5563" weight="bold" style={styles.sectionHeader}>
              Уведомления приложения
            </AppText>
            <View style={styles.groupCard}>
              <NotificationToggleRow
                title="Уведомления приложения"
                subtitle="Получать push-уведомления от Города"
                value={enabled}
                onValueChange={handleToggle}
                disabled={updating}
              />
            </View>
          </>
        )}
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
  },
  loaderBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 14,
    flex: 1,
  },
  warningBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  enablePermButton: {
    height: 38,
    borderRadius: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  simulatorCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  simulatorText: {
    fontSize: 12,
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
});

export default NotificationSettingsScreen;
