# Testing Auth Flow

## Requirements
- Ensure all `EXPO_PUBLIC_FIREBASE_*` variables are set in your `.env`.
- Backend env: `TELEGRAM_MOBILE_REDIRECT_URI=gorodapp://auth/telegram/callback`.

## Steps
1. Launch the application.
2. Navigate to the Profile tab.
3. If not authorized, click the Login button to trigger Telegram login.
4. Complete the Telegram authorization process.
5. Upon callback, `pendingWebViewCustomToken` should be populated in the `authStore`.
6. ProfileScreen will detect `userId` and load the WebView.
7. `AppWebView` will send the auth token via `postMessage`.

## Troubleshooting
- Check logs for `[WebViewAuth] Web auth failed`.
- Verify the `Firebase config is incomplete` error if not configured.
- Ensure no tokens are logged to console.
