import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { linkingConfiguration } from '../services/deeplinks';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import MarketScreen from '../screens/MarketScreen';
import FoodScreen from '../screens/FoodScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer linking={linkingConfiguration}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            height: Platform.OS === 'ios' 
              ? 88 
              : (insets.bottom > 0 ? 60 + insets.bottom : 60),
            paddingBottom: Platform.OS === 'ios' 
              ? 24 
              : (insets.bottom > 0 ? insets.bottom : 8),
            paddingTop: 8,
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Главная',
            tabBarIcon: ({ color }) => (
              <AppText style={{ fontSize: 20, color }}>🏠</AppText>
            ),
          }}
        />
        <Tab.Screen
          name="MarketTab"
          component={MarketScreen}
          options={{
            tabBarLabel: 'Маркет',
            tabBarIcon: ({ color }) => (
              <AppText style={{ fontSize: 20, color }}>🛍️</AppText>
            ),
          }}
        />
        <Tab.Screen
          name="FoodTab"
          component={FoodScreen}
          options={{
            tabBarLabel: 'Еда',
            tabBarIcon: ({ color }) => (
              <AppText style={{ fontSize: 20, color }}>🍔</AppText>
            ),
          }}
        />
        <Tab.Screen
          name="CartTab"
          component={CartScreen}
          options={{
            tabBarLabel: 'Корзина',
            tabBarIcon: ({ color }) => (
              <AppText style={{ fontSize: 20, color }}>🛒</AppText>
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Профиль',
            tabBarIcon: ({ color }) => (
              <AppText style={{ fontSize: 20, color }}>👤</AppText>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
