jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'mock-redirect-uri'),
  ResponseType: { Code: 'code' },
  AuthRequest: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

jest.mock('expo-secure-store', () => {
  let store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    _clear: () => {
      store = {};
    }
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

import { mobileProfileApi } from '../mobileProfileApi';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import * as SecureStore from 'expo-secure-store';
import type { MobileProfileResponse, MobileProfileUpdatePayload } from '../../types/mobileProfile';

describe('Phase M1 — Synchronize Mobile Profile/Auth Contract Tests', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().clearMobileAuthSession();
    useAppStore.getState().resetUser();
  });

  test('1. Contract sync: GET /api/mobile/profile correctly returns and handles bonusDebt and registration fields', async () => {
    const mockBackendResponse: MobileProfileResponse = {
      user: {
        userId: 'user_mts_999',
        firstName: 'Иван',
        lastName: 'Иванов',
        displayName: 'Иван Иванов',
        username: 'ivan999',
        photoUrl: 'https://example.com/avatar.jpg',
        phone: '+79991234567',
        email: 'ivan@example.com',
        birthday: '1990-05-15',
        gender: 'male',
        isAdmin: false,
        isPremium: true,
      },
      stats: {
        ordersCount: 5,
        friendsCount: 2,
        bonusBalance: 350,
        bonusDebt: 50,
      },
      referral: {
        referralCode: 'REF999',
      },
      sync: {
        status: 'synced',
      },
      registration: {
        phoneVerified: true,
        profileCompleted: true,
        hasRequiredConsents: true,
        missingRequiredFields: [],
      },
    };

    await SecureStore.setItemAsync('user_access_token', 'mock_jwt_token');
    useAuthStore.setState({ accessToken: 'mock_jwt_token', userId: 'user_mts_999' });

    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(mockBackendResponse),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockBackendResponse)),
    });

    const profile = await mobileProfileApi.getProfile();

    expect(profile.user.phone).toBe('+79991234567');
    expect(profile.stats.bonusDebt).toBe(50);
    expect(profile.stats.bonusBalance).toBe(350);
    expect(profile.registration.phoneVerified).toBe(true);
    expect(profile.registration.profileCompleted).toBe(true);
    expect(profile.registration.hasRequiredConsents).toBe(true);
    expect(profile.registration.missingRequiredFields).toEqual([]);
  });

  test('2. Contract sync: PATCH /api/mobile/profile payload sends only editable fields and NEVER includes phone', async () => {
    await SecureStore.setItemAsync('user_access_token', 'mock_jwt_token');
    useAuthStore.setState({ accessToken: 'mock_jwt_token', userId: 'user_mts_999' });

    let capturedRequestBody: any = null;
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (options?.body) {
        capturedRequestBody = JSON.parse(options.body);
      }
      const responseData = {
        user: {
          userId: 'user_mts_999',
          firstName: 'Петр',
          lastName: 'Иванов',
          displayName: 'Петр Иванов',
          username: 'ivan999',
          photoUrl: 'https://example.com/avatar.jpg',
          phone: '+79991234567',
          email: 'petr@example.com',
          birthday: '1990-05-15',
          gender: 'male',
        },
      };
      return Promise.resolve({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue(responseData),
        text: jest.fn().mockResolvedValue(JSON.stringify(responseData)),
      });
    });

    const updatePayload: MobileProfileUpdatePayload = {
      firstName: 'Петр',
      lastName: 'Иванов',
      email: 'petr@example.com',
      gender: 'male',
      birthday: '1990-05-15',
    };

    const updated = await mobileProfileApi.updateProfile(updatePayload);

    expect(capturedRequestBody).not.toBeNull();
    expect(capturedRequestBody).toEqual({
      firstName: 'Петр',
      lastName: 'Иванов',
      email: 'petr@example.com',
      gender: 'male',
      birthday: '1990-05-15',
    });
    // Ensure phone is NOT in request body
    expect(capturedRequestBody.phone).toBeUndefined();
    expect(updated.user.phone).toBe('+79991234567');
  });

  test('3. Store sync: setUserData properly stores bonusDebt and registration properties', () => {
    useAppStore.getState().setUserData({
      firstName: 'Алексей',
      lastName: 'Смирнов',
      phone: '+79998887766',
      userBalance: 500,
      bonusDebt: 100,
      phoneVerified: true,
      profileCompleted: false,
      hasRequiredConsents: true,
      missingRequiredFields: ['email'],
    });

    const state = useAppStore.getState();
    expect(state.firstName).toBe('Алексей');
    expect(state.phone).toBe('+79998887766');
    expect(state.userBalance).toBe(500);
    expect(state.bonusDebt).toBe(100);
    expect(state.phoneVerified).toBe(true);
    expect(state.profileCompleted).toBe(false);
    expect(state.hasRequiredConsents).toBe(true);
    expect(state.missingRequiredFields).toEqual(['email']);
  });

  test('4. Store sync: resetUser resets bonusDebt and registration fields to default', () => {
    useAppStore.getState().setUserData({
      bonusDebt: 100,
      phoneVerified: true,
      profileCompleted: true,
      hasRequiredConsents: true,
      missingRequiredFields: ['email'],
    });

    useAppStore.getState().resetUser();

    const state = useAppStore.getState();
    expect(state.bonusDebt).toBe(0);
    expect(state.phoneVerified).toBe(false);
    expect(state.profileCompleted).toBe(false);
    expect(state.hasRequiredConsents).toBe(false);
    expect(state.missingRequiredFields).toEqual([]);
  });

  test('5. Hardening: registration.phoneVerified fallback defaults to false and Address.phone remains independent', () => {
    // Check store initial defaults
    const state = useAppStore.getState();
    expect(state.phoneVerified).toBe(false);

    // Check Address phone structure is preserved and untouched
    const testAddress = {
      id: 'addr_1',
      title: 'Дом',
      city: 'Москва',
      street: 'Ленина',
      house: '10',
      phone: '+79990001122',
      isDefault: true,
    };
    useAppStore.getState().setUserData({
      addresses: [testAddress],
    });

    const updatedState = useAppStore.getState();
    expect(updatedState.addresses[0].phone).toBe('+79990001122');
  });
});
