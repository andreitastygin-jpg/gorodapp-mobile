import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { LoadingView } from '../../components/ui/LoadingView';
import { AddressCard } from '../../components/profile/AddressCard';
import { mobileProfileApi } from '../../services/mobileProfileApi';
import type { MobileAddress } from '../../types/mobileProfile';

export const DeliveryAddressesScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [addresses, setAddresses] = useState<MobileAddress[]>([]);
  
  // Modal & Form state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<MobileAddress | null>(null);

  // Form Fields State
  const [formAddress, setFormAddress] = useState<string>('');
  const [formStreet, setFormStreet] = useState<string>('');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState<string>('');
  const [formHouse, setFormHouse] = useState<string>('');
  const [formApartment, setFormApartment] = useState<string>('');
  const [formEntrance, setFormEntrance] = useState<string>('');
  const [formFloor, setFormFloor] = useState<string>('');
  const [formIntercom, setFormIntercom] = useState<string>('');
  const [formComment, setFormComment] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);

  // Fetch function
  const fetchAddresses = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    setError(null);
    console.log('[DeliveryAddresses] loading');
    try {
      const list = await mobileProfileApi.getAddresses();
      setAddresses(list || []);
      console.log('[DeliveryAddresses] loaded');
    } catch (err) {
      console.log('[DeliveryAddresses] failed');
      const errMessage = err instanceof Error ? err.message : String(err);
      setError(errMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAddresses(false);
  };

  const openAddModal = () => {
    setEditingAddress(null);
    // Reset inputs
    setFormAddress('');
    setFormStreet('');
    setFormDeliveryAddress('');
    setFormHouse('');
    setFormApartment('');
    setFormEntrance('');
    setFormFloor('');
    setFormIntercom('');
    setFormComment('');
    setFormName('');
    setFormPhone('');
    setFormIsDefault(addresses.length === 0); // Active by default if it's the first address
    setModalVisible(true);
  };

  const openEditModal = (item: MobileAddress) => {
    setEditingAddress(item);
    setFormAddress(item.address || '');
    setFormStreet(item.street || '');
    setFormDeliveryAddress(item.deliveryAddress || '');
    setFormHouse(item.house || '');
    setFormApartment(item.apartment || '');
    setFormEntrance(item.entrance || '');
    setFormFloor(item.floor || '');
    setFormIntercom(item.intercom || '');
    setFormComment(item.comment || '');
    setFormName(item.name || '');
    setFormPhone(item.phone || '');
    setFormIsDefault(item.isDefault);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmedAddress = formAddress.trim();
    const trimmedStreet = formStreet.trim();
    const trimmedDeliveryAddress = formDeliveryAddress.trim();

    // Check frontend validation: at least one core address component must not be empty
    if (!trimmedAddress && !trimmedStreet && !trimmedDeliveryAddress) {
      Alert.alert(
        'Ошибка заполнения',
        'Укажите полный адрес, улицу или адрес доставки'
      );
      return;
    }

    setSaving(true);
    console.log('[DeliveryAddresses] saving');

    const payload = {
      address: trimmedAddress || null,
      street: trimmedStreet || null,
      deliveryAddress: trimmedDeliveryAddress || null,
      house: formHouse.trim() || null,
      apartment: formApartment.trim() || null,
      entrance: formEntrance.trim() || null,
      floor: formFloor.trim() || null,
      intercom: formIntercom.trim() || null,
      comment: formComment.trim() || null,
      name: formName.trim() || null,
      phone: formPhone.trim() || null,
      isDefault: formIsDefault,
    };

    try {
      if (editingAddress) {
        // Update request
        const res = await mobileProfileApi.updateAddress(editingAddress.id, payload);
        if (Array.isArray(res)) {
          setAddresses(res);
        } else {
          // fallback if it returned a single object: fetch all again
          await fetchAddresses(false);
        }
      } else {
        // Create request
        const list = await mobileProfileApi.createAddress(payload);
        setAddresses(list || []);
      }
      setModalVisible(false);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      Alert.alert('Ошибка сохранения', errMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (processingId) {
      return;
    }
    Alert.alert(
      'Удаление адреса',
      'Вы действительно хотите удалить этот адрес доставки?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(id);
            console.log('[DeliveryAddresses] deleting');
            try {
              const list = await mobileProfileApi.deleteAddress(id);
              setAddresses(list || []);
            } catch (err) {
              const errMessage = err instanceof Error ? err.message : String(err);
              Alert.alert('Ошибка удаления', errMessage);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id: string) => {
    if (processingId) {
      return;
    }
    setProcessingId(id);
    try {
      const res = await mobileProfileApi.updateAddress(id, { isDefault: true });
      if (Array.isArray(res)) {
        setAddresses(res);
      } else {
        await fetchAddresses(false);
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      Alert.alert('Ошибка установки основного адреса', errMessage);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && addresses.length === 0) {
    return <LoadingView message="Загрузка адресов доставки..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} id="delivery-addresses-screen">
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
              Ошибка загрузки
            </AppText>
            <AppText variant="body" align="center" color="#4b5563" style={styles.errorText}>
              {error}
            </AppText>
            <AppButton
              title="Повторить"
              onPress={() => fetchAddresses(true)}
              style={styles.retryBtn}
            />
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyIcon} align="center">📍</AppText>
            <AppText variant="title" weight="bold" color="#1f2937" align="center" style={styles.emptyTitle}>
              Адресов пока нет
            </AppText>
            <AppText variant="caption" align="center" color="#6b7280" style={styles.emptyDescription}>
              Добавьте адрес доставки, чтобы быстрее оформлять новые заказы.
            </AppText>
            <AppButton
              title="Добавить первый адрес"
              onPress={openAddModal}
              style={styles.addBtn}
            />
          </View>
        ) : (
          <View>
            <View style={styles.addressListTitleRow}>
              <AppText variant="title" weight="bold" color="#111827">
                Сохраненные адреса
              </AppText>
              <TouchableOpacity onPress={openAddModal} activeOpacity={0.7}>
                <AppText variant="body" color="#3b82f6" weight="bold">
                  + Добавить
                </AppText>
              </TouchableOpacity>
            </View>

            {addresses.map((item) => (
              <AddressCard
                key={item.id}
                address={item}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                isProcessing={processingId === item.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modern Modal overlay for address form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
          }
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <AppText variant="h2" weight="bold" color="#111827">
                  {editingAddress ? 'Редактировать адрес' : 'Новый адрес'}
                </AppText>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <AppText variant="h2" color="#9ca3af">✕</AppText>
                </TouchableOpacity>
              </View>

              {/* Modal Form Content */}
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Core Address Fields */}
                <View style={styles.fieldSection}>
                  <AppText variant="body" weight="bold" color="#4b5563" style={styles.sectionTitle}>
                    Главные сведения
                  </AppText>

                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Город / Весь Адрес (обязательно или выберите улицу)
                  </AppText>
                  <TextInput
                    style={styles.input}
                    value={formAddress}
                    onChangeText={setFormAddress}
                    placeholder="Пример: г. Москва, ул. Арбат, д. 4"
                    placeholderTextColor="#9ca3af"
                    editable={!saving}
                  />

                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Улица
                  </AppText>
                  <TextInput
                    style={styles.input}
                    value={formStreet}
                    onChangeText={setFormStreet}
                    placeholder="Пример: ул. Ленина"
                    placeholderTextColor="#9ca3af"
                    editable={!saving}
                  />

                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Номер дома / строения
                  </AppText>
                  <TextInput
                    style={styles.input}
                    value={formHouse}
                    onChangeText={setFormHouse}
                    placeholder="Пример: д. 10, стр. 2"
                    placeholderTextColor="#9ca3af"
                    editable={!saving}
                  />
                </View>

                {/* Additional Details */}
                <View style={styles.fieldSection}>
                  <AppText variant="body" weight="bold" color="#4b5563" style={styles.sectionTitle}>
                    Спецификация (квартира, этаж, домофон)
                  </AppText>

                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <AppText variant="caption" color="#6b7280" style={styles.label}>
                        Кв./Офис
                      </AppText>
                      <TextInput
                        style={styles.input}
                        value={formApartment}
                        onChangeText={setFormApartment}
                        placeholder="Кв. 12"
                        placeholderTextColor="#9ca3af"
                        editable={!saving}
                      />
                    </View>

                    <View style={styles.gridCol}>
                      <AppText variant="caption" color="#6b7280" style={styles.label}>
                        Подъезд
                      </AppText>
                      <TextInput
                        style={styles.input}
                        value={formEntrance}
                        onChangeText={setFormEntrance}
                        placeholder="3"
                        placeholderTextColor="#9ca3af"
                        editable={!saving}
                      />
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <AppText variant="caption" color="#6b7280" style={styles.label}>
                        Этаж
                      </AppText>
                      <TextInput
                        style={styles.input}
                        value={formFloor}
                        onChangeText={setFormFloor}
                        placeholder="5"
                        placeholderTextColor="#9ca3af"
                        editable={!saving}
                      />
                    </View>

                    <View style={styles.gridCol}>
                      <AppText variant="caption" color="#6b7280" style={styles.label}>
                        Домофон
                      </AppText>
                      <TextInput
                        style={styles.input}
                        value={formIntercom}
                        onChangeText={setFormIntercom}
                        placeholder="12к4242"
                        placeholderTextColor="#9ca3af"
                        editable={!saving}
                      />
                    </View>
                  </View>
                </View>

                {/* Receiver and Delivery Address fields */}
                <View style={styles.fieldSection}>
                  <AppText variant="body" weight="bold" color="#4b5563" style={styles.sectionTitle}>
                    Контакты получателя
                  </AppText>

                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Имя получателя
                  </AppText>
                  <TextInput
                    style={styles.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Пример: Александр"
                    placeholderTextColor="#9ca3af"
                    editable={!saving}
                  />

                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Телефон для связи
                  </AppText>
                  <TextInput
                    style={styles.input}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    placeholder="Пример: +7 (999) 123-4567"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    editable={!saving}
                  />
                </View>

                {/* Additional address tag or comment */}
                <View style={styles.fieldSection}>
                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Альтернативный адрес доставки (городского типа)
                  </AppText>
                  <TextInput
                    style={styles.input}
                    value={formDeliveryAddress}
                    onChangeText={setFormDeliveryAddress}
                    placeholder="Пример: Москва, ул. Ленина, 5"
                    placeholderTextColor="#9ca3af"
                    editable={!saving}
                  />

                  <AppText variant="caption" color="#6b7280" style={styles.label}>
                    Комментарий курьеру
                  </AppText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formComment}
                    onChangeText={setFormComment}
                    placeholder="Пример: синяя дверь в глубине двора"
                    placeholderTextColor="#9ca3af"
                    multiline={true}
                    numberOfLines={3}
                    editable={!saving}
                  />
                </View>

                {/* Default option */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => !saving && setFormIsDefault(!formIsDefault)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, formIsDefault && styles.checkboxActive]}>
                    {formIsDefault && <AppText style={styles.chkTick}>✓</AppText>}
                  </View>
                  <AppText variant="body" color="#111827" style={styles.chkLabel}>
                    Сделать основным адресом доставки
                  </AppText>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>

              {/* Modern Action button stick bar inside modal */}
              <View style={styles.modalFooter}>
                <AppButton
                  title={saving ? 'Сохранение...' : 'Сохранить адрес'}
                  onPress={handleSave}
                  style={styles.modalSubmitBtn}
                  disabled={saving}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  addressListTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    marginBottom: 24,
  },
  addBtn: {
    minWidth: 180,
  },
  // Modal layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    shadowColor: '#000033',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  fieldSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 14,
  },
  label: {
    marginBottom: 6,
    fontSize: 11,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 30,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chkTick: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chkLabel: {
    fontSize: 13,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  modalSubmitBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
  },
});

export default DeliveryAddressesScreen;
