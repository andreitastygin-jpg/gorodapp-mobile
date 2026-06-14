import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';

interface OfflineScreenProps {
  onRetry?: () => void;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.card}>
        <AppText variant="h1" align="center" style={styles.emoji}>
          📶🛑
        </AppText>
        <AppText variant="h2" align="center" style={styles.title}>
          Нет соединения с интернетом
        </AppText>
        <AppText variant="body" align="center" style={styles.description} color="#6b7280">
          Пожалуйста, проверьте подключение к сети Wi-Fi или сотовой связи и попробуйте еще раз.
        </AppText>
        {onRetry && (
          <AppButton
            title="Повторить"
            onPress={onRetry}
            style={styles.button}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    color: '#1f2937',
  },
  description: {
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    minWidth: 200,
  },
});

export default OfflineScreen;
