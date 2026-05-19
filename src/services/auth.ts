import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.modify');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.setCustomParameters({ prompt: 'consent' });

let isSigningIn = false;

// Persistent token storage to handle mobile browser suspensions/reloads
const STORAGE_KEY_TOKEN = 'aura_workspace_token';
const STORAGE_KEY_AUTH_ERROR = 'aura_workspace_auth_error';

export const setWorkspaceAuthError = (hasError: boolean) => {
  if (hasError) {
    localStorage.setItem(STORAGE_KEY_AUTH_ERROR, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY_AUTH_ERROR);
  }
  window.dispatchEvent(new Event('workspace_auth_status_changed'));
};

const saveToken = (token: string) => {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  setWorkspaceAuthError(false); // Clear error on new token
};

const getSavedToken = () => {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      let token = getSavedToken();
      
      // If token is missing from local storage, try to recover it from the server vault
      if (!token && !isSigningIn) {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/auth/google/picker-config', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.accessToken) {
              token = data.accessToken;
              saveToken(token!);
            }
          }
        } catch (err) {
          console.error('Failed to recover token from server:', err);
        }
      }

      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    
    // Check if we are on mobile/small screen to decide between Popup and Redirect
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    // In our specific iframe environment, popups are often blocked on mobile.
    // However, redirects can be even trickier in an iframe.
    // We'll try popup first, but catch the specific error that indicates it was blocked.
    
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      console.warn('Popup blocked or failed, attempting redirect strategy:', popupErr);
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        // Redirect might not work in the AI Studio iframe depending on CSP, 
        // but it's the only remaining option for mobile if popups are hard-blocked.
        // For now, we'll stick to a clearer error message or try to handle the popup better.
        throw popupErr;
      }
      throw popupErr;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    if (!accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    saveToken(accessToken);
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getSavedToken();
};

export const logout = async () => {
  await auth.signOut();
  localStorage.removeItem(STORAGE_KEY_TOKEN);
};
