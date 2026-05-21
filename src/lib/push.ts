import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from './firebase';

export async function requestPushPermissionsAndSaveToken() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('Push messaging is not supported by this browser.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      
      // We need a VAPID key to generate tokens. If you don't have one, this will fail.
      // But we can try without one to see if Firebase auto-provisions it on simple setups,
      // or we can pass a dummy one if required. For now, leaving empty to let Firebase handle it.
      const currentToken = await getToken(messaging, {
          // vapidKey: import.meta.env.VITE_VAPID_KEY
      });
      
      if (currentToken) {
        console.log('Got FCM token:', currentToken);
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const db = getFirestore(app);
          const deviceRef = doc(db, 'users', user.uid, 'devices', 'primary');
          await setDoc(deviceRef, {
            fcm_token: currentToken,
            updated_at: new Date(),
            device_type: navigator.userAgent
          }, { merge: true });
          console.log('Token saved to Firestore');
          return true;
        }
      } else {
        console.log('No registration token available.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
    return false;
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return false;
  }
}

export function listenForForegroundMessages() {
  try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // We could trigger a local browser notification or toast here
        if (payload.notification) {
          const notificationTitle = payload.notification.title || 'Notification';
          const notificationOptions = {
            body: payload.notification.body,
            icon: '/vite.svg'
          };
          new Notification(notificationTitle, notificationOptions);
        }
      });
  } catch (e) {
      console.warn("Foreground message listener failed to bind. Ensure push is supported.", e);
  }
}
