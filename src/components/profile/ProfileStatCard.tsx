import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';

interface ProfileStatCardProps {
  label: string;
  value: string | number;
}

export const ProfileStatCard: React.FC<ProfileStatCardProps> = ({ label, value }) => {
  return (
    <View style={styles.card}>
      <AppText variant="h2" weight="bold" color="#1f2937" align="center">
        {value}
      </AppText>
      <AppText variant="caption" color="#6b7280" align="center" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 4,
  },
  label: {
    marginTop: 4,
  },
});

export default ProfileStatCard;
