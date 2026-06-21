import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../ui/AppText';
import type { MobileAddress } from '../../types/mobileProfile';

interface AddressCardProps {
  address: MobileAddress;
  onEdit: (item: MobileAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isProcessing?: boolean;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isProcessing = false,
}) => {
  // Built complete human-readable address line
  const mainAddressLine =
    address.address ||
    address.deliveryAddress ||
    [address.street, address.house].filter(Boolean).join(', ') ||
    'Адрес без улицы';

  // Details row items
  const detailsItems: string[] = [];
  if (address.apartment) detailsItems.push(`Кв./офис: ${address.apartment}`);
  if (address.entrance) detailsItems.push(`Подъезд: ${address.entrance}`);
  if (address.floor) detailsItems.push(`Этаж: ${address.floor}`);
  if (address.intercom) detailsItems.push(`Домофон: ${address.intercom}`);

  const detailsRow = detailsItems.join(', ');

  return (
    <View style={[styles.card, isProcessing && styles.cardProcessing]} id={`address-card-${address.id}`}>
      <View style={styles.header}>
        {address.isDefault ? (
          <View style={styles.defaultBadge}>
            <AppText variant="caption" color="#10b981" weight="bold" style={styles.badgeText}>
              ✓ Основной адрес
            </AppText>
          </View>
        ) : (
          <View style={styles.nonDefaultBadge}>
            <AppText variant="caption" color="#6b7280" style={styles.badgeText}>
              Дополнительный
            </AppText>
          </View>
        )}
        
        {address.name && (
          <View style={styles.nameBadge}>
            <AppText variant="caption" color="#3b82f6" weight="medium" style={styles.nameBadgeText}>
              {address.name}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <AppText variant="body" weight="bold" color="#111827">
          {mainAddressLine}
        </AppText>

        {detailsRow ? (
          <AppText variant="caption" color="#4b5563" style={styles.detailsText}>
            {detailsRow}
          </AppText>
        ) : null}

        {address.comment && (
          <AppText variant="caption" color="#4b5563" style={styles.commentText}>
            Комментарий: {address.comment}
          </AppText>
        )}

        {address.phone && (
          <AppText variant="caption" color="#6b7280" style={styles.phoneText}>
            Связь: {address.phone}
          </AppText>
        )}
      </View>

      <View style={styles.actions}>
        {isProcessing ? (
          <View style={styles.processingRow}>
            <AppText variant="caption" color="#9ca3af" weight="bold">
              ⏳ Обработка операции...
            </AppText>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(address)}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <AppText variant="caption" color="#3b82f6" weight="bold">
                ✏️ Изменить
              </AppText>
            </TouchableOpacity>

            {!address.isDefault && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onSetDefault(address.id)}
                activeOpacity={0.7}
                disabled={isProcessing}
              >
                <AppText variant="caption" color="#10b981" weight="bold">
                  ★ Сделать основным
                </AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(address.id)}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <AppText variant="caption" color="#ef4444" weight="bold">
                🗑️ Удалить
              </AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardProcessing: {
    opacity: 0.55,
  },
  processingRow: {
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  defaultBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nonDefaultBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
  },
  nameBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nameBadgeText: {
    fontSize: 11,
  },
  content: {
    marginBottom: 14,
  },
  detailsText: {
    marginTop: 4,
    lineHeight: 16,
  },
  commentText: {
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  phoneText: {
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  deleteButton: {
    marginLeft: 'auto',
  },
});

export default AddressCard;
