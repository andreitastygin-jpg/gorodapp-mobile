import * as Linking from 'expo-linking';

/**
 * Expo deep linking configuration for Gorodapp mobile.
 * Handles incoming URLs like gorodapp://market or https://gorodapp.ru/food.
 */
export const linkingConfiguration = {
  prefixes: [Linking.createURL('/'), 'gorodapp://', 'https://gorodapp.ru'],
  config: {
    screens: {
      HomeTab: 'home',
      MarketTab: 'market',
      FoodTab: 'food',
      CartTab: 'cart',
      ProfileTab: 'profile',
    },
  },
};

export const handleOpenMobileURL = async (url: string) => {
  try {
    const parsed = Linking.parse(url);
    console.log('[DeepLink] Parsed incoming link:', parsed);
    // Deep links can navigate inside the AppNavigator accordingly
  } catch (error) {
    console.error('[DeepLink] Error executing link:', error);
  }
};
