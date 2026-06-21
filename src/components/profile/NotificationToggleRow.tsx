import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { AppText } from '../ui/AppText';

interface NotificationToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const NotificationToggleRow: React.FC<NotificationToggleRowProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <View
      style={[styles.container, disabled && styles.disabledContainer]}
      id={`notification-toggle-row-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <View style={styles.textContainer}>
        <AppText
          variant="body"
          weight="medium"
          color={disabled ? '#9ca3af' : '#111827'}
          style={styles.title}
        >
          {title}
        </AppText>
        {subtitle && (
          <AppText
            variant="caption"
            color={disabled ? '#cbd5e1' : '#6b7280'}
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        )}
      </View>

      <View style={styles.switchContainer}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
          thumbColor={value ? '#3b82f6' : '#94a3b8'}
          ios_backgroundColor="#e2e8f0"
          id={`switch-${title.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  disabledContainer: {
    opacity: 0.6,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  switchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NotificationToggleRow;
