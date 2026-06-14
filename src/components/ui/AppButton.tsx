import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AppText } from './AppText';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style
}) => {
  const getContainerStyle = () => {
    const list: ViewStyle[] = [styles.button];
    if (variant === 'primary') list.push(styles.primaryButton);
    else if (variant === 'secondary') list.push(styles.secondaryButton);
    else if (variant === 'outline') list.push(styles.outlineButton);

    if (disabled || loading) list.push(styles.disabledButton);
    return list;
  };

  const getTextColor = () => {
    if (variant === 'outline') return '#3b82f6';
    return '#ffffff';
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <AppText style={{ color: getTextColor(), fontWeight: '600' }}>{title}</AppText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#4b5563',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AppButton;
