import { getFirebaseDb } from '../../lib/firebase.ts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// In-memory fallback map for operational resilience during local simulation
const memoryStore = new Map<string, any>();

/**
 * Stores credentials for a specific platform under a user's workspace_credentials subcollection.
 * Supported platforms: 'github' | 'cloudrun' | 'vercel' | 'google'
 */
export const storePlatformCredentials = async (
  uid: string,
  platform: 'github' | 'cloudrun' | 'vercel' | 'google',
  credentials: any
): Promise<void> => {
  try {
    const db = await getFirebaseDb();
    const credentialDoc = doc(db, 'users', uid, 'workspace_credentials', platform);
    await setDoc(credentialDoc, {
      ...credentials,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn(`[FirestoreTokenStore] Falling back to in-memory store due to Firestore permission/credential error: ${err.message || err}`);
    memoryStore.set(`${uid}:${platform}`, {
      ...credentials,
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Retrieves credentials for a specific platform. Falls back to environment variables if not present in DB.
 */
export const getPlatformCredentials = async (
  uid: string,
  platform: 'github' | 'cloudrun' | 'vercel' | 'google'
): Promise<any> => {
  try {
    const db = await getFirebaseDb();
    const credentialDoc = doc(db, 'users', uid, 'workspace_credentials', platform);
    const snap = await getDoc(credentialDoc);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err: any) {
    console.warn(`[FirestoreTokenStore] Reading from in-memory fallback due to Firestore permission/credential error: ${err.message || err}`);
  }

  // Check in-memory fallback
  const cached = memoryStore.get(`${uid}:${platform}`);
  if (cached) return cached;

  // Graceful fallback to env if present
  const envKey = `${platform.toUpperCase()}_TOKEN`;
  if (process.env[envKey]) {
    return { access_token: process.env[envKey] };
  }
  return null;
};

/**
 * Backward compatibility wrapper for storing Google workspace credentials.
 */
export const storeWorkspaceTokens = async (uid: string, data: any): Promise<void> => {
  await storePlatformCredentials(uid, 'google', data);
};

/**
 * Backward compatibility wrapper for retrieving Google workspace credentials.
 */
export const getWorkspaceTokens = async (uid: string): Promise<any> => {
  return await getPlatformCredentials(uid, 'google');
};
