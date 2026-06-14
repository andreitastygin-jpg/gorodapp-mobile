export const TELEGRAM_AUTH_URL = 'https://oauth.telegram.org/auth';
export const TELEGRAM_CLIENT_ID = process.env.EXPO_PUBLIC_TELEGRAM_CLIENT_ID || '';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.gorodapp.ru';
export const MOBILE_AUTH_ENDPOINT = `${API_BASE_URL}/api/auth/mobile/telegram`;
