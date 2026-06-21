import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { AppText } from '../../components/ui/AppText';
import ProfileMainScreen from './ProfileMainScreen';
import { BonusHistoryScreen } from './BonusHistoryScreen';
import { DeliveryAddressesScreen } from './DeliveryAddressesScreen';
import { PersonalDataScreen } from './PersonalDataScreen';
import { ReferralScreen } from './ReferralScreen';
import { AppSettingsScreen } from './AppSettingsScreen';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { OrdersScreen } from './OrdersScreen';
import { OrderDetailsScreen } from './OrderDetailsScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Orders: undefined;
  OrderDetails: { orderId: string };
  BonusHistory: undefined;
  Referral: undefined;
  PersonalData: undefined;
  DeliveryAddresses: undefined;
  NotificationSettings: undefined;
  AppSettings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// Custom placeholder helper for secondary screens
const createPlaceholderScreen = (title: string): React.FC => {
  return () => (
    <ScreenContainer style={styles.placeholderContainer}>
      <View style={styles.card}>
        <AppText variant="h1" align="center" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" align="center" color="#6b7280">
          Этот раздел пока находится в разработке. Он будет доступен в следующих обновлениях приложения.
        </AppText>
      </View>
    </ScreenContainer>
  );
};

export const ProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ProfileMain"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: '#1f2937',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileMainScreen}
        options={{
          title: 'Профиль',
          headerShown: false, // We'll render custom top card in main
        }}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Мои заказы' }}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{ title: 'Детали заказа' }}
      />
      <Stack.Screen
        name="BonusHistory"
        component={BonusHistoryScreen}
        options={{ title: 'Мои бонусы' }}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ title: 'Пригласить друга' }}
      />
      <Stack.Screen
        name="PersonalData"
        component={PersonalDataScreen}
        options={{ title: 'Мои данные' }}
      />
      <Stack.Screen
        name="DeliveryAddresses"
        component={DeliveryAddressesScreen}
        options={{ title: 'Мои адреса доставки' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Уведомления' }}
      />
      <Stack.Screen
        name="AppSettings"
        component={AppSettingsScreen}
        options={{ title: 'Настройки приложения' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: '#f6f7fb',
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    marginBottom: 12,
  },
});

export default ProfileStackNavigator;
