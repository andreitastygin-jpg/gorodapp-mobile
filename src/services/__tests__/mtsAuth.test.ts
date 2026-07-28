import {
  initiateMtsAuth,
  MtsAuthSession,
  normalizePhone,
  validatePhone
} from '../mtsAuth';
import { saveUserAccessToken, saveMobileAuthSession } from '../mobileAuth';

jest.mock('../mobileAuth', () => ({
  saveUserAccessToken: jest.fn(),
  saveMobileAuthSession: jest.fn(),
}));

const flushPromises = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

describe('MTS ID Auth Tests', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('1. validatePhone и normalizePhone работают корректно', () => {
    expect(validatePhone('9991234567')).toBe(true);
    expect(validatePhone('89991234567')).toBe(true);
    expect(validatePhone('+79991234567')).toBe(true);
    expect(validatePhone('123')).toBe(false);

    expect(normalizePhone('9991234567')).toBe('+79991234567');
    expect(normalizePhone('89991234567')).toBe('+79991234567');
    expect(normalizePhone('+79991234567')).toBe('+79991234567');
  });

  test('2. initiateMtsAuth отправляет channel=mobile и передает signal', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ sessionId: 'session_123' }),
    });
    global.fetch = mockFetch;

    const controller = new AbortController();
    const sessionId = await initiateMtsAuth('9991234567', controller.signal);

    expect(sessionId).toBe('session_123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/mts/start'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ channel: 'mobile', phone: '+79991234567' }),
        signal: controller.signal,
      })
    );
  });

  test('3. MtsAuthSession передает signal в /mts/login', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 202,
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = mockFetch;

    const onSuccess = jest.fn();
    const onError = jest.fn();

    const session = new MtsAuthSession('session_123', onSuccess, onError);
    session.startPolling();

    // Fast-forward timers to run poll
    jest.advanceTimersByTime(2000);

    // Give microtasks a chance to resolve
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/mts/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session_123' }),
        signal: expect.any(AbortSignal),
      })
    );
  });

  test('4. HTTP 202 создает следующий polling с тем же sessionId', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 202,
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = mockFetch;

    const onSuccess = jest.fn();
    const onError = jest.fn();

    const session = new MtsAuthSession('session_123', onSuccess, onError);
    session.startPolling();

    // Run first timer
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Run second timer
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ sessionId: 'session_123' }),
      })
    );
  });

  test('5. HTTP 200 читает accessToken и user.id', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue({
        accessToken: 'fake_jwt',
        user: { id: 'real_user_id' },
        isNewUser: true,
      }),
    });
    global.fetch = mockFetch;

    const onSuccess = jest.fn();
    const onError = jest.fn();

    const session = new MtsAuthSession('session_123', onSuccess, onError);
    session.startPolling();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    expect(saveUserAccessToken).toHaveBeenCalledWith('fake_jwt');
    expect(saveMobileAuthSession).toHaveBeenCalledWith({ userId: 'real_user_id', isNewUser: true });
    expect(onSuccess).toHaveBeenCalledWith('fake_jwt', 'real_user_id', true);
  });

  test('6. отсутствие user.id вызывает INVALID_AUTH_RESPONSE и phone не используется как fallback', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue({
        accessToken: 'fake_jwt',
        phone: '+79991234567', // shouldn't fallback to this
        user: {}, // user.id is missing!
      }),
    });
    global.fetch = mockFetch;

    const onSuccess = jest.fn();
    const onError = jest.fn();

    const session = new MtsAuthSession('session_123', onSuccess, onError);
    session.startPolling();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    expect(saveUserAccessToken).not.toHaveBeenCalled();
    expect(saveMobileAuthSession).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('INVALID_AUTH_RESPONSE');
  });

  test('7. abort() делает signal.aborted === true и прекращает новые fetch', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 202,
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = mockFetch;

    const onSuccess = jest.fn();
    const onError = jest.fn();

    const session = new MtsAuthSession('session_123', onSuccess, onError);
    session.startPolling();

    // Abort immediately
    session.abort();

    // Advance timers
    jest.advanceTimersByTime(2000);
    await flushPromises();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('8. SESSION_EXPIRED останавливает polling с ошибкой', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'SESSION_EXPIRED' }),
    });
    global.fetch = mockFetch;

    const onSuccess = jest.fn();
    const onError = jest.fn();

    const session = new MtsAuthSession('session_123', onSuccess, onError);
    session.startPolling();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    expect(onError).toHaveBeenCalledWith('Время действия сессии истекло. Попробуйте войти снова.');
    
    // Ensure no more timers are scheduled
    mockFetch.mockClear();
    jest.advanceTimersByTime(2000);
    await flushPromises();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
