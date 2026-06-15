import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { firebaseConfigError } from './src/services/firebase';

export default function App() {
  if (firebaseConfigError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ошибка конфигурации</Text>
        <Text style={styles.errorText}>{firebaseConfigError}</Text>
        <Text style={styles.hint}>Проверьте EAS Environment Variables для preview build.</Text>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <AppNavigator />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
