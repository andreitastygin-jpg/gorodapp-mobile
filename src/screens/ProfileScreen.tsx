import React from 'react';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useAuthStore } from '../store/useAuthStore';
import { AuthScreen } from './AuthScreen';
import { ProfileStackNavigator } from './profile/ProfileStackNavigator';

export const ProfileScreen: React.FC = () => {
  const { userId } = useAuthStore();
  
  if (!userId) {
      return (
          <ScreenContainer>
              <AuthScreen />
          </ScreenContainer>
      );
  }

  return (
    <ProfileStackNavigator />
  );
};

export default ProfileScreen;