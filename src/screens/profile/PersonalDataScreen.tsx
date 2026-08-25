import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { ProfileField } from '../../components/profile/ProfileField';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import type { MobileProfileUser, MobileProfileUpdatePayload } from '../../types/mobileProfile';
import { useAppStore } from '../../store/useAppStore';

interface OriginalFormState {
  displayName: string;
  email: string;
  gender: string | null;
  birthday: string;
}

export const PersonalDataScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Read-only user details
  const [username, setUsername] = useState<string | null>(null);

  // Form Field States
  const [formDisplayName, setFormDisplayName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formGender, setFormGender] = useState<string | null>(null);
  const [formBirthday, setFormBirthday] = useState<string>('');

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Original State tracking for dirty check
  const [originalData, setOriginalData] = useState<OriginalFormState | null>(null);

  const fetchProfileData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    setError(null);
    setFormErrors({});
    console.log('[PersonalData] loading');

    try {
      const response = await mobileProfileApi.getProfile();
      const user = response.user;

      // Populate form fields
      setUsername(user.username);
      setFormDisplayName(user.displayName || '');
      
      // Verified phone from server is source of truth (GET /api/mobile/profile)
      const verifiedPhone = user.phone ?? '';
      setFormPhone(verifiedPhone);
      
      setFormEmail(user.email || '');
      setFormGender(user.gender || null);
      setFormBirthday(user.birthday || '');

      setOriginalData({
        displayName: user.displayName || '',
        email: user.email || '',
        gender: user.gender || null,
        birthday: user.birthday || '',
      });

      // Synchronize Zustand app store with latest profile data
      useAppStore.getState().setUserData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        photoUrl: user.photoUrl || '',
        phone: verifiedPhone,
        email: user.email || '',
        birthday: user.birthday || '',
        gender: (user.gender as any) || '',
        userBalance: response.stats?.bonusBalance ?? 0,
        bonusDebt: response.stats?.bonusDebt ?? 0,
        referralCode: response.referral?.referralCode || '',
        phoneVerified: response.registration?.phoneVerified ?? false,
        profileCompleted: response.registration?.profileCompleted ?? false,
        hasRequiredConsents: response.registration?.hasRequiredConsents ?? false,
        missingRequiredFields: response.registration?.missingRequiredFields ?? [],
      });

      console.log('[PersonalData] loaded');
    } catch (err) {
      console.log('[PersonalData] failed');
      const errMessage = err instanceof Error ? err.message : String(err);
      setError(errMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileData(false);
  };

  // Check if editable form fields have changed compared to loaded profile
  const isDirty = (): boolean => {
    if (!originalData) return false;
    return (
      formDisplayName.trim() !== originalData.displayName ||
      formEmail.trim() !== originalData.email ||
      formGender !== originalData.gender ||
      formBirthday.trim() !== originalData.birthday
    );
  };

  const handleSave = async () => {
    // 1. Validation & sanitization
    const errors: Record<string, string> = {};
    const trimmedName = formDisplayName.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedBirthday = formBirthday.trim();

    if (!trimmedName) {
      errors.displayName = 'Имя не должно быть пустым';
    }

    if (trimmedEmail && !trimmedEmail.includes('@')) {
      errors.email = 'Некорректный адрес электронной почты (должен содержать @)';
    }

    if (trimmedBirthday) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(trimmedBirthday)) {
        errors.birthday = 'Неверный формат даты. Используйте ГГГГ-ММ-ДД';
      } else {
        // Simple sanity check of date parts
        const parts = trimmedBirthday.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (year < 1900 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
          errors.birthday = 'Укажите реальную дату рождения';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      Alert.alert('Ошибка ввода', 'Пожалуйста, проверьте правильность заполнения полей.');
      return;
    }

    setFormErrors({});

    // 2. Empty payload / exact dirty check protection
    if (!isDirty()) {
      Alert.alert('Нет изменений', 'Вы не изменили никакие данные.');
      return;
    }

    setSaving(true);
    console.log('[PersonalData] saving');

    // Split displayName into firstName/lastName for backend compatibilities
    const nameParts = trimmedName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || null;

    // Send only editable fields; phone is verified and immutable here
    const payload: MobileProfileUpdatePayload = {
      firstName: firstName || null,
      lastName: lastName,
      email: trimmedEmail || null,
      gender: formGender,
      birthday: trimmedBirthday || null,
    };

    try {
      const result = await mobileProfileApi.updateProfile(payload);
      
      // Determine what was returned (the full MobileProfileResponse or just User)
      let updatedUser: MobileProfileUser;
      if ('user' in result) {
        updatedUser = (result as { user: MobileProfileUser }).user;
      } else {
        updatedUser = result as MobileProfileUser;
      }

      // Re-populate and reset states while keeping verified phone intact
      setFormDisplayName(updatedUser.displayName || '');
      const currentPhone = updatedUser.phone ?? formPhone;
      setFormPhone(currentPhone);
      setFormEmail(updatedUser.email || '');
      setFormGender(updatedUser.gender || null);
      setFormBirthday(updatedUser.birthday || '');

      setOriginalData({
        displayName: updatedUser.displayName || '',
        email: updatedUser.email || '',
        gender: updatedUser.gender || null,
        birthday: updatedUser.birthday || '',
      });

      // Synchronize Zustand app store with updated user data
      useAppStore.getState().setUserData({
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        username: updatedUser.username || '',
        photoUrl: updatedUser.photoUrl || '',
        phone: currentPhone,
        email: updatedUser.email || '',
        birthday: updatedUser.birthday || '',
        gender: (updatedUser.gender as any) || '',
      });

      console.log('[PersonalData] saved');
      Alert.alert('Успех', 'Ваши персональные данные успешно сохранены.');
    } catch (err) {
      console.log('[PersonalData] failed to save');
      const errMessage = err instanceof Error ? err.message : String(err);
      Alert.alert('Ошибка сохранения', errMessage);
    } finally {
      setSaving(false);
    }
  };

  const renderGenderSelector = () => {
    const options = [
      { label: 'Не указан', value: null },
      { label: 'Мужской', value: 'male' },
      { label: 'Женский', value: 'female' },
    ];

    return (
      <View style={styles.genderContainer} id="form-gender-selector">
        <AppText variant="caption" color="#4b5563" weight="bold" style={styles.genderLabel}>
          Пол
        </AppText>
        <View style={styles.genderRow}>
          {options.map((opt, idx) => {
            const isSelected = formGender === opt.value;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.genderPill, isSelected && styles.genderPillActive]}
                onPress={() => !saving && setFormGender(opt.value)}
                activeOpacity={0.7}
                disabled={saving}
              >
                <AppText
                  variant="caption"
                  weight={isSelected ? 'bold' : 'normal'}
                  color={isSelected ? '#3b82f6' : '#6b7280'}
                  align="center"
                >
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingView message="Загрузка персональных данных..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} id="personal-data-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
          }
        >
          {error ? (
            <View style={styles.errorCard}>
              <AppText variant="h2" weight="bold" color="#ef4444" align="center" style={styles.errorTitle}>
                Ошибка загрузки профиля
              </AppText>
              <AppText variant="body" align="center" color="#4b5563" style={styles.errorText}>
                {error}
              </AppText>
              <AppButton
                title="Повторить"
                onPress={() => fetchProfileData(true)}
                style={styles.retryBtn}
              />
            </View>
          ) : (
            <>
              {/* Header Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrapper}>
                  <AppText style={styles.infoIcon}>👤</AppText>
                </View>
                <View style={styles.infoTextContainer}>
                  <AppText variant="title" weight="bold" color="#111827">
                    Мои данные
                  </AppText>
                  <AppText variant="caption" color="#6b7280" style={styles.infoSecondaryText}>
                    Эти данные используются для оформления заказов и оперативной связи с вами.
                  </AppText>
                  {username && (
                    <View style={styles.usernameTag}>
                      <AppText variant="caption" color="#3b82f6" weight="medium">
                        Имя пользователя: @{username}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                <ProfileField
                  label="Имя и Фамилия"
                  value={formDisplayName}
                  onChangeText={(val) => {
                    setFormDisplayName(val);
                    if (formErrors.displayName) {
                      setFormErrors((prev) => ({ ...prev, displayName: '' }));
                    }
                  }}
                  placeholder="Пример: Иван Иванов"
                  editable={!saving}
                  error={formErrors.displayName}
                />

                <View style={styles.phoneSection}>
                  <ProfileField
                    label="Телефон"
                    value={formPhone || 'Не указан'}
                    onChangeText={() => {}}
                    placeholder="Номер телефона"
                    keyboardType="phone-pad"
                    editable={false}
                  />
                  <View style={styles.phoneVerifiedBadge}>
                    <AppText variant="caption" color="#10b981" weight="medium" style={styles.phoneVerifiedText}>
                      ✓ Подтверждён через МТС ID (недоступен для изменения)
                    </AppText>
                  </View>
                </View>

                <ProfileField
                  label="Электронная почта"
                  value={formEmail}
                  onChangeText={(val) => {
                    setFormEmail(val);
                    if (formErrors.email) {
                      setFormErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  placeholder="Пример: mail@example.com"
                  keyboardType="email-address"
                  editable={!saving}
                  error={formErrors.email}
                />

                {renderGenderSelector()}

                <ProfileField
                  label="Дата рождения (ГГГГ-ММ-ДД)"
                  value={formBirthday}
                  onChangeText={(val) => {
                    setFormBirthday(val);
                    if (formErrors.birthday) {
                      setFormErrors((prev) => ({ ...prev, birthday: '' }));
                    }
                  }}
                  placeholder="Пример: 1995-12-31"
                  keyboardType="numeric"
                  editable={!saving}
                  error={formErrors.birthday}
                />
              </View>

              {/* Action Button */}
              <View style={styles.buttonContainer}>
                <AppButton
                  title={saving ? 'Сохранение изменений...' : 'Сохранить изменения'}
                  onPress={handleSave}
                  style={styles.saveBtn}
                  disabled={saving || !isDirty()}
                />
                {!isDirty() && !saving && (
                  <AppText variant="caption" color="#9ca3af" align="center" style={styles.noChangesHint}>
                    Нет измененных данных для сохранения
                  </AppText>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginTop: 20,
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
  infoCard: {
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
  infoIconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoSecondaryText: {
    marginTop: 4,
    lineHeight: 16,
  },
  usernameTag: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  formCard: {
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
    marginBottom: 20,
  },
  phoneSection: {
    marginBottom: 16,
  },
  phoneVerifiedBadge: {
    marginTop: -10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  phoneVerifiedText: {
    fontSize: 12,
    lineHeight: 16,
  },
  genderContainer: {
    marginBottom: 16,
    width: '100%',
  },
  genderLabel: {
    marginBottom: 6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  genderPillActive: {
    backgroundColor: '#eff6ff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
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

export default PersonalDataScreen;
