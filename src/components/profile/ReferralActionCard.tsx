import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AppText } from '../ui/AppText';

interface ReferralActionProps {
  title: string;
  value: string;
  buttonText: string;
  onPress: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

export const ReferralActionCard: React.FC<ReferralActionProps> = ({
  title,
  value,
  buttonText,
  onPress,
  secondaryButtonText,
  onSecondaryPress,
}) => {
  return (
    <View style={styles.card} id={`referral-action-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <AppText variant="caption" color="#4b5563" weight="bold" style={styles.title}>
        {title}
      </AppText>
      
      <View style={styles.valueContainer}>
        <AppText variant="body" weight="bold" color="#1f2937" selectable={true} style={styles.valueText}>
          {value}
        </AppText>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <AppText variant="caption" color="#ffffff" weight="bold" style={styles.buttonText}>
            {buttonText}
          </AppText>
        </TouchableOpacity>

        {secondaryButtonText && onSecondaryPress && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onSecondaryPress}
            activeOpacity={0.7}
          >
            <AppText variant="caption" color="#3b82f6" weight="bold" style={styles.buttonText}>
              {secondaryButtonText}
            </AppText>
          </TouchableOpacity>
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
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  title: {
    marginBottom: 10,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  valueText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
  },
});

export default ReferralActionCard;
