import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../ui/AppText';

interface SettingsRowProps {
  title: string;
  value?: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  rightText?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  value,
  subtitle,
  onPress,
  disabled = false,
  danger = false,
  rightText,
}) => {
  const isClickable = onPress && !disabled;

  const renderContent = () => (
    <View style={styles.container} id={`settings-row-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <View style={styles.textContainer}>
        <AppText
          variant="body"
          weight="medium"
          color={danger ? '#ef4444' : '#111827'}
          style={styles.title}
        >
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color="#6b7280" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>

      <View style={styles.rightContainer}>
        {value && (
          <AppText
            variant="body"
            color={danger ? '#fca5a5' : '#6b7280'}
            style={[styles.value, !!rightText && { marginRight: 4 }]}
          >
            {value}
          </AppText>
        )}
        {rightText && (
          <AppText variant="caption" color="#9ca3af" style={styles.rightText}>
            {rightText}
          </AppText>
        )}
        {isClickable && (
          <AppText variant="body" color="#9ca3af" style={styles.arrow}>
            ⟩
          </AppText>
        )}
      </View>
    </View>
  );

  if (isClickable) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.clickableWrapper}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return <View style={styles.staticWrapper}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  clickableWrapper: {
    backgroundColor: '#ffffff',
  },
  staticWrapper: {
    backgroundColor: '#ffffff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    marginRight: 6,
  },
  rightText: {
    marginRight: 6,
  },
  arrow: {
    fontSize: 16,
    color: '#cbd5e1',
    marginLeft: 4,
  },
});

export default SettingsRow;
