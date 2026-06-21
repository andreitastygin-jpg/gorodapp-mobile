import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';

interface ProfileMenuItemProps {
  title: string;
  subtitle?: string | null;
  icon?: string;
  onPress: () => void;
  showArrow?: boolean;
  titleColor?: string;
}

export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  showArrow = true,
  titleColor = '#1f2937',
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftSection}>
        {icon && (
          <View style={styles.iconContainer}>
            <AppText style={styles.icon}>{icon}</AppText>
          </View>
        )}
        <View style={styles.textContainer}>
          <AppText variant="body" weight="medium" style={{ color: titleColor }}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="caption" style={styles.subtitle}>
              {subtitle}
            </AppText>
          )}
        </View>
      </View>
      {showArrow && (
        <AppText variant="body" color="#9ca3af" style={styles.arrow}>
          ›
        </AppText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
});

export default ProfileMenuItem;
