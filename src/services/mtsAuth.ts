import { API_BASE_URL } from '../config/auth';
import { saveUserAccessToken, saveMobileAuthSession } from './mobileAuth';

export const MTS_ERROR_MESSAGES: Record<string, string> = {
  SESSION_EXPIRED: 'Время действия сессии истекло. Попробуйте войти снова.',
  TOKEN_ISSUANCE_FAILED: 'Не удалось авторизоваться. Ошибка выпуска токена.',
  INVALID_SESSION_STATE: 'Неверное состояние сессии. Повторите попытку.',
  DATABASE_ERROR: 'Временная ошибка сервера. Пожалуйста, попробуйте позже.',
};

/**
 * Validates that the phone number contains 10 or 11 digits.
 */
export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length === 10 || clean.length === 11;
}

/**
 * Normalizes a Russian phone number to the standard +7... format.
 */
export function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+7${clean}`;
  }
  if (clean.length === 11) {
    if (clean.startsWith('8')) {
      return `+7${clean.slice(1)}`;
    }
    return `+${clean}`;
  }
  return phone;
}

/**
 * Initiates MTS ID auth session by calling the start endpoint.
 */
export async function initiateMtsAuth(phone: string, signal?: AbortSignal): Promise<string> {
  const normalized = normalizePhone(phone);
  const response = await fetch(`${API_BASE_URL}/api/auth/mts/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'mobile',
      phone: normalized,
    }),
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorCode = data.error || data.code || 'UNKNOWN_ERROR';
    const friendlyMessage = MTS_ERROR_MESSAGES[errorCode] || data.message || `Ошибка запуска авторизации (${errorCode})`;
    throw new Error(friendlyMessage);
  }

  const sessionId = data.sessionId || data.session_id;
  if (!sessionId) {
    throw new Error('Не удалось получить ID сессии от сервера');
  }

  return sessionId;
}

/**
 * Controls an active MTS ID polling session.
 */
export class MtsAuthSession {
  private timerId: any = null;
  private isAborted = false;
  private abortController = new AbortController();

  constructor(
    private sessionId: string,
    private onSuccess: (token: string, userId: string, isNewUser: boolean) => void,
    private onError: (errorMsg: string) => void
  ) {}

  public startPolling() {
    const poll = async () => {
      if (this.isAborted) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/mts/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId }),
          signal: this.abortController.signal,
        });

        if (this.isAborted) return;

        if (response.status === 202) {
          this.timerId = setTimeout(poll, 2000);
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (response.status === 200) {
          const token = data.accessToken;
          const userId = data.user?.id;

          if (
            typeof token !== 'string' ||
            !token.trim() ||
            typeof userId !== 'string' ||
            !userId.trim()
          ) {
            throw new Error('INVALID_AUTH_RESPONSE');
          }

          const isNewUser = !!data.isNewUser;

          // Save session using existing mobileAuth helpers
          await saveUserAccessToken(token);
          await saveMobileAuthSession({ userId, isNewUser });

          this.onSuccess(token, userId, isNewUser);
          return;
        }

        // Handle error responses
        const errorCode = data.error || data.code || 'UNKNOWN_ERROR';
        const friendlyMessage = MTS_ERROR_MESSAGES[errorCode] || data.message || `Ошибка авторизации (${errorCode})`;
        this.onError(friendlyMessage);

      } catch (err: any) {
        if (this.isAborted || err.name === 'AbortError') return;
        if (err.message === 'INVALID_AUTH_RESPONSE') {
          this.onError('INVALID_AUTH_RESPONSE');
          return;
        }
        // Retry polling on network issues
        this.timerId = setTimeout(poll, 2000);
      }
    };

    this.timerId = setTimeout(poll, 2000);
  }

  public abort() {
    this.isAborted = true;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.abortController.abort();
  }
}
