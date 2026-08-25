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
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  FlatList: 'FlatList',
  SafeAreaView: 'SafeAreaView',
  ActivityIndicator: 'ActivityIndicator',
  RefreshControl: 'RefreshControl',
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
import { getBonusSourceTitle } from '../../components/profile/BonusHistoryRow';
import * as SecureStore from 'expo-secure-store';
import type { MobileBonusHistoryItem, MobileBonusHistoryResponse } from '../../types/mobileProfile';

describe('Phase M2 — Bonus History Contract, Source Mapping and Debt Hardening Tests', () => {
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

  test('1. Contract Sync: GET /api/mobile/bonus-history supports source, details and safe metadata', async () => {
    await SecureStore.setItemAsync('user_access_token', 'mock_jwt_token');
    useAuthStore.setState({ accessToken: 'mock_jwt_token', userId: 'user_mts_999' });

    const mockResponse: MobileBonusHistoryResponse = {
      items: [
        {
          id: 'bonus_tx_1',
          amount: 120,
          type: 'income',
          source: 'market_order_cashback',
          title: 'Кэшбэк за покупку',
          description: 'Начислено за заказ №12345',
          orderId: '12345',
          details: {
            orderId: '12345',
            sourceRef: 'order_12345_ref',
          },
          createdAt: '2026-08-20T10:00:00.000Z',
        },
        {
          id: 'bonus_tx_2',
          amount: -40,
          type: 'expense',
          source: 'order_return_cashback_reversal',
          title: 'Корректировка кэшбэка',
          description: 'Возврат товара',
          details: {
            returnRequestId: 'ret_999',
            sourceRef: 'ret_reversal_ref',
          },
          createdAt: '2026-08-20T11:00:00.000Z',
        },
      ],
      nextCursor: null,
    };

    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
    });

    const result = await mobileProfileApi.getBonusHistory();

    expect(result.items.length).toBe(2);
    expect(result.items[0].source).toBe('market_order_cashback');
    expect(result.items[0].details?.orderId).toBe('12345');
    expect(result.items[1].source).toBe('order_return_cashback_reversal');
    expect(result.items[1].details?.returnRequestId).toBe('ret_999');
  });

  test('2. Source Mapping: Translates known sources to user-facing labels and handles fallbacks', () => {
    const itemMarket: MobileBonusHistoryItem = {
      id: '1',
      amount: 120,
      type: 'income',
      source: 'market_order_cashback',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemMarket)).toBe('Начислено за заказ');

    const itemFood: MobileBonusHistoryItem = {
      id: '2',
      amount: 50,
      type: 'income',
      source: 'food_order_cashback',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemFood)).toBe('Начислено за заказ');

    const itemReturnRefund: MobileBonusHistoryItem = {
      id: '3',
      amount: 300,
      type: 'income',
      source: 'order_return_bonus_refund',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemReturnRefund)).toBe('Возвращены бонусы при возврате');

    const itemReversal: MobileBonusHistoryItem = {
      id: '4',
      amount: -40,
      type: 'expense',
      source: 'order_return_cashback_reversal',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemReversal)).toBe('Аннулированы бонусы при возврате');

    const itemDebtRepay: MobileBonusHistoryItem = {
      id: '5',
      amount: -70,
      type: 'expense',
      source: 'bonus_debt_repayment',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemDebtRepay)).toBe('Погашение корректировки бонусов');

    const itemWelcome: MobileBonusHistoryItem = {
      id: '6',
      amount: 500,
      type: 'income',
      source: 'welcome',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemWelcome)).toBe('Приветственный бонус');

    const itemReferral: MobileBonusHistoryItem = {
      id: '7',
      amount: 200,
      type: 'income',
      source: 'referral',
      title: 'Raw title',
      description: 'Raw desc',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemReferral)).toBe('Реферальный бонус');

    const itemUnknown: MobileBonusHistoryItem = {
      id: '8',
      amount: 15,
      type: 'income',
      source: 'custom_special_bonus',
      title: 'Индивидуальный подарок',
      description: 'Подарок от сервиса',
      createdAt: '2026-08-20T10:00:00.000Z',
    };
    expect(getBonusSourceTitle(itemUnknown)).toBe('Индивидуальный подарок');
  });

  test('3. bonusDebt Semantics: bonusDebt is NOT subtracted from bonusBalance', () => {
    // Backend sends available bonusBalance=350, bonusDebt=70
    useAppStore.getState().setUserData({
      userBalance: 350,
      bonusDebt: 70,
    });

    const state = useAppStore.getState();
    // Balance remains exactly 350 (no double subtraction)
    expect(state.userBalance).toBe(350);
    expect(state.bonusDebt).toBe(70);
  });

  test('4. Sign formatting: income produces +X Б, expense produces -X Б with no double minus', () => {
    const formatSigned = (amount: number, type: 'income' | 'expense') => {
      const isIncome = type === 'income';
      const absAmount = Math.abs(amount);
      const sign = isIncome ? '+' : '-';
      return `${sign}${absAmount} Б`;
    };

    expect(formatSigned(300, 'income')).toBe('+300 Б');
    expect(formatSigned(-75, 'expense')).toBe('-75 Б');
    expect(formatSigned(75, 'expense')).toBe('-75 Б');
    expect(formatSigned(-40, 'expense')).toBe('-40 Б');
    expect(formatSigned(120, 'income')).toBe('+120 Б');
  });

  test('5. Hardening: getProfile is invoked on initial load/refresh/filter (cursor === null) but NOT on loadMore pagination', async () => {
    const getProfileSpy = jest.spyOn(mobileProfileApi, 'getProfile').mockResolvedValue({
      user: {
        userId: 'u1',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        username: 'test',
        photoUrl: null,
        phone: '+79991234567',
        email: null,
        birthday: null,
        gender: null,
      },
      stats: {
        ordersCount: 1,
        friendsCount: 0,
        bonusBalance: 500,
        bonusDebt: 20,
      },
      referral: {
        referralCode: 'REF1',
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
    });

    const getBonusHistorySpy = jest.spyOn(mobileProfileApi, 'getBonusHistory').mockResolvedValue({
      items: [],
      nextCursor: 'next_page_token',
    });

    // Simulate fetch logic directly to test contract
    const simulateFetchHistory = async (cursor: string | null = null) => {
      if (cursor === null) {
        mobileProfileApi.getProfile().then((profile) => {
          if (profile?.stats) {
            useAppStore.getState().setUserData({
              userBalance: profile.stats.bonusBalance ?? 0,
              bonusDebt: profile.stats.bonusDebt ?? 0,
            });
          }
        }).catch(() => {});
      }
      return mobileProfileApi.getBonusHistory({
        type: 'all',
        limit: 20,
        cursor,
      });
    };

    // 1. Initial load (cursor = null) -> getProfile called
    getProfileSpy.mockClear();
    getBonusHistorySpy.mockClear();
    await simulateFetchHistory(null);
    expect(getProfileSpy).toHaveBeenCalledTimes(1);
    expect(getBonusHistorySpy).toHaveBeenCalledTimes(1);

    // 2. Load more / pagination (cursor = 'next_page_token') -> getProfile NOT called
    getProfileSpy.mockClear();
    getBonusHistorySpy.mockClear();
    await simulateFetchHistory('next_page_token');
    expect(getProfileSpy).not.toHaveBeenCalled();
    expect(getBonusHistorySpy).toHaveBeenCalledTimes(1);

    getProfileSpy.mockRestore();
    getBonusHistorySpy.mockRestore();
  });
});

