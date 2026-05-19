/**
 * Firebase Init — Re-export shim
 * Contract: AURA.CONTRACT.AUTH.FIREBASE_HARDENING_V1.005
 *
 * All initialization logic is now in firebase.ts.
 * This file exists solely so main.tsx's `import './lib/firebase-init'`
 * continues to work without changes.
 */
export { app } from './firebase';
