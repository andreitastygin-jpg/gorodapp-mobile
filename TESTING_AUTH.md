# Testing Auth Flow

## Requirements
- Ensure all `EXPO_PUBLIC_FIREBASE_*` variables are set in your `.env`.
- Ensure backend is reachable via `EXPO_PUBLIC_API_BASE_URL`.
- Backend environment set correctly: `TELEGRAM_MOBILE_REDIRECT_URI=gorodapp://auth/telegram/callback`.
- Telegram OAuth redirect configured in backend/Telegram.

## Manual Test Checklist
1. Open the application.
2. Navigate to the Profile tab.
3. Verify that you see the AuthScreen.
4. Click the Telegram login button.
5. Successfully complete the Telegram OAuth flow in the browser.
6. Verify you are redirected back to the app (`gorodapp://`).
7. Verify native Firebase login is successful.
8. Verify that the app transitions to the `ProfileScreen` which loads the WebView.
9. Verify the auth token is correctly passed (postMessage) to the WebView.
10. Verify that the web version within the WebView is successfully authenticated.

## Troubleshooting
- **Telegram redirect error**: Check `TELEGRAM_MOBILE_REDIRECT_URI` configuration.
- **Backend error**: Verify backend API availability via `EXPO_PUBLIC_API_BASE_URL`.
- **Firebase config incomplete**: Verify all `EXPO_PUBLIC_FIREBASE_*` variables in `.env`.
- **WebView auth error**: Check `[WebViewAuth]` logs in the console.
- **After logout**: Verify that local storage/secure storage is cleared and user is redirected back to AuthScreen.
