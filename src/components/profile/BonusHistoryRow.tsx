import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import type { MobileBonusHistoryItem } from '../../types/mobileProfile';

interface BonusHistoryRowProps {
  item: MobileBonusHistoryItem;
}

const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
};

/**
 * Maps transaction source to user-facing localized title.
 * Unknown sources fall back cleanly to backend title or description.
 */
export const getBonusSourceTitle = (item: MobileBonusHistoryItem): string => {
  const source = item.source?.trim().toLowerCase();

  switch (source) {
    case 'food_order_cashback':
    case 'market_order_cashback':
      return 'Начислено за заказ';
    case 'order_return_bonus_refund':
      return 'Возвращены бонусы при возврате';
    case 'order_return_cashback_reversal':
      return 'Аннулированы бонусы при возврате';
    case 'bonus_debt_repayment':
      return 'Погашение корректировки бонусов';
    case 'welcome':
      return 'Приветственный бонус';
    case 'referral':
      return 'Реферальный бонус';
    default:
      if (source?.startsWith('game')) {
        return 'Бонус за игру';
      }
      if (source?.startsWith('promo')) {
        return 'Промо-начисление';
      }
      return item.title || item.description || (item.type === 'income' ? 'Начисление бонусов' : 'Списание бонусов');
  }
};

const getBonusSourceEmoji = (item: MobileBonusHistoryItem): string => {
  if (item.iconType) {
    return item.iconType;
  }
  const source = item.source?.trim().toLowerCase();
  switch (source) {
    case 'food_order_cashback':
    case 'market_order_cashback':
      return '🛍️';
    case 'order_return_bonus_refund':
      return '↩️';
    case 'order_return_cashback_reversal':
      return '📉';
    case 'bonus_debt_repayment':
      return '⚖️';
    case 'welcome':
      return '🎁';
    case 'referral':
      return '👥';
    default:
      if (source?.startsWith('game')) return '🎮';
      if (source?.startsWith('promo')) return '🎟️';
      return item.type === 'income' ? '📈' : '📉';
  }
};

export const BonusHistoryRow: React.FC<BonusHistoryRowProps> = ({ item }) => {
  const isIncome = item.type === 'income';
  const displayTitle = getBonusSourceTitle(item);
  const iconEmoji = getBonusSourceEmoji(item);
  const displayOrderId = item.orderId || item.details?.orderId;
  
  const absAmount = Math.abs(item.amount);
  const sign = isIncome ? '+' : '-';
  const formattedAmount = `${sign}${absAmount} Б`;

  return (
    <View style={styles.container} id={`bonus-item-${item.id}`}>
      <View style={styles.leftCol}>
        <View style={[styles.iconWrapper, isIncome ? styles.incomeIcon : styles.expenseIcon]}>
          <AppText style={styles.emoji}>{iconEmoji}</AppText>
        </View>
        <View style={styles.textDetails}>
          <AppText variant="title" weight="medium" color="#111827">
            {displayTitle}
          </AppText>
          
          {item.description && item.description !== displayTitle && (
            <AppText variant="caption" color="#4b5563" style={styles.description}>
              {item.description}
            </AppText>
          )}

          <View style={styles.metaRow}>
            <AppText variant="caption" color="#9ca3af">
              {formatDate(item.createdAt)}
            </AppText>
            
            {displayOrderId && (
              <View style={styles.orderBadge}>
                <AppText variant="caption" color="#3b82f6" weight="medium" style={styles.orderText}>
                  Заказ №{displayOrderId}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightCol}>
        <AppText
          variant="title"
          weight="bold"
          color={isIncome ? '#10b981' : '#ef4444'}
          style={styles.amountText}
        >
          {formattedAmount}
        </AppText>
        <AppText variant="caption" color="#9ca3af" align="right">
          {isIncome ? 'начисление' : 'списание'}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incomeIcon: {
    backgroundColor: '#f0fdf4',
  },
  expenseIcon: {
    backgroundColor: '#fef2f2',
  },
  emoji: {
    fontSize: 20,
  },
  textDetails: {
    flex: 1,
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  orderBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  orderText: {
    fontSize: 10,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 85,
  },
  amountText: {
    fontSize: 16,
  },
});

export default BonusHistoryRow;
