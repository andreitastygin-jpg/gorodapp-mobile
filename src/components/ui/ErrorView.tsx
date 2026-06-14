import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ 
  message = 'Произошла ошибка при загрузке.', 
  onRetry 
}) => {
  return (
    <View style={styles.container}>
      <AppText variant="h2" align="center" style={styles.title} color="#ef4444">
        Ошибка
      </AppText>
      <AppText variant="body" align="center" style={styles.message} color="#4b5563">
        {message}
      </AppText>
      {onRetry && (
        <AppButton 
          title="Повторить попытку" 
          onPress={onRetry} 
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
  },
  button: {
    minWidth: 160,
  }
});

export default ErrorView;
