import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth, Persistence } from 'firebase/auth';

// Declare module augmentation to add getReactNativePersistence safely without @ts-ignore
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: any): Persistence;
}

import { getReactNativePersistence } from 'firebase/auth';


// Firebase configuration structure
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let firebaseConfigError: string | null = null;

// Simple check to verify config has been supplied
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isConfigValid) {
  firebaseConfigError = 'Firebase configuration is missing EXPO_PUBLIC_FIREBASE_API_KEY and/or EXPO_PUBLIC_FIREBASE_PROJECT_ID';
} else {
  try {
    // Safely check if Firebase app has already been initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }

    if (firebaseApp) {
      db = getFirestore(firebaseApp);
      
      try {
        // Safe Firebase Auth initialization for React Native/Expo using AsyncStorage
        auth = initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
        console.log('[FirebaseAuth] initialized with React Native persistence');
      } catch (authError) {
        // Handle double initialization gracefully, e.g. during Hot Module Replacement (HMR)
        try {
          auth = getAuth(firebaseApp);
          console.log('[FirebaseAuth] retrieved existing auth instance');
        } catch (getAuthError) {
          console.log('[FirebaseAuth] Error getting/initializing auth:', authError);
        }
      }

      if (auth) {
        auth.onAuthStateChanged((user) => {
          if (user) {
            console.log('[FirebaseAuth] currentUser exists');
          } else {
            console.log('[FirebaseAuth] currentUser is null');
          }
        });
      }
    }
  } catch (err) {
    firebaseConfigError = err instanceof Error ? err.message : String(err);
  }
}

export { firebaseApp as app, db, auth, firebaseConfigError };

