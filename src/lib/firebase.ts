/**
 * Firebase Client SDK — Unified Initialization
 * Contract: AURA.CONTRACT.AUTH.FIREBASE_HARDENING_V1.006
 *
 * Single-file initialization strategy. Uses the default Firebase authDomain
 * (firebaseapp.com) with signInWithPopup(). Per Firebase documentation,
 * the reverse-proxy pattern (Option 3) is only required for signInWithRedirect
 * flows affected by cross-origin storage partitioning. signInWithPopup
 * (Option 2) communicates via postMessage and is not affected.
 *
 * Ref: https://firebase.google.com/docs/auth/web/redirect-best-practices
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    return (import.meta as any).env?.[key];
  } catch {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyB8TsMnLCWSSFf84T9eXNDx9nRUG_EH_Fg',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'gen-lang-client-0281999829.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'gen-lang-client-0281999829',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'gen-lang-client-0281999829.firebasestorage.app',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '70323048967',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:70323048967:web:066a132c4d3c88e09550a2',
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authPromise: Promise<import('firebase/auth').Auth> | null = null;
let dbPromise: Promise<import('firebase/firestore').Firestore> | null = null;
let authInstance: import('firebase/auth').Auth | null = null;
let dbInstance: import('firebase/firestore').Firestore | null = null;

export async function getFirebaseAuth(): Promise<import('firebase/auth').Auth> {
  if (authInstance) return authInstance;
  if (!authPromise) {
    authPromise = import('firebase/auth').then(({ getAuth }) => {
      authInstance = getAuth(app);
      return authInstance;
    });
  }
  return authPromise;
}

export async function getFirebaseDb(): Promise<import('firebase/firestore').Firestore> {
  if (dbInstance) return dbInstance;
  if (!dbPromise) {
    dbPromise = import('firebase/firestore').then(({ getFirestore }) => {
      dbInstance = getFirestore(app);
      return dbInstance;
    });
  }
  return dbPromise;
}

const recaptchaSiteKey = getEnv('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY');
if (recaptchaSiteKey && typeof window !== 'undefined') {
  import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    })
    .catch((error) => console.error('Failed to initialize App Check:', error));
}

// Prefetch auth non-blockingly
getFirebaseAuth().catch((error) => console.error('Failed to pre-initialize Auth:', error));
