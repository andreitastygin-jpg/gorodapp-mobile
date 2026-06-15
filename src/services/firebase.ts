import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase public config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfigError =
  missingFirebaseKeys.length > 0
    ? `Firebase config is incomplete: ${missingFirebaseKeys.join(', ')}`
    : null;

let app;
try {
  if (!firebaseConfigError) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
} catch (e) {
  console.warn('[Firebase] Initialization error');
}

export const db = app ? initializeFirestore(app, {}) : null;
export const auth = app ? getAuth(app) : null;
