# Setup Gorodapp Mobile

This is an Expo React Native mobile project.

## What is gorodapp-mobile
It is the mobile application part of the Gorodapp ecosystem, built with Expo.

## Why it's not deployed to hosting
As a mobile application, it is packaged into installable files (APK/IPA) rather than served as a website. Android preview builds are managed via [EAS Build](https://docs.expo.dev/build/introduction/).

## System Requirements
- Node.js
- npm
- Expo/EAS CLI

## Parts of the system
- gorodapp-mobile (this app)
- backend API
- gorodapp.ru (web version inside WebView)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create local `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill in the required variables in `.env`.
   - Get your Firebase client config from: Firebase Console → Project settings → General → Your apps → Firebase SDK config.
   - Note: EXPO_PUBLIC_* variables are public and bundled into the app.
   - Note: Never store backend secrets in the mobile app.
4. Set backend environment variable needed:
   `TELEGRAM_MOBILE_REDIRECT_URI=gorodapp://auth/telegram/callback`

## EAS Setup
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Login:
   ```bash
   eas login
   ```
3. Configure the project:
   ```bash
   eas build:configure
   ```
4. Build Android preview APK:
   ```bash
   eas build --platform android --profile preview
   ```

After the build completes, download and install the APK on your device. Ensure the APK is configured correctly and connectivity works with the backend.
