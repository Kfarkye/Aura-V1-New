// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// We use the same generic open Firebase config used in the client (development fallback).
firebase.initializeApp({
  apiKey: 'AIzaSyB8TsMnLCWSSFf84T9eXNDx9nRUG_EH_Fg',
  authDomain: 'gen-lang-client-0281999829.firebaseapp.com',
  projectId: 'gen-lang-client-0281999829',
  storageBucket: 'gen-lang-client-0281999829.firebasestorage.app',
  messagingSenderId: '70323048967',
  appId: '1:70323048967:web:066a132c4d3c88e09550a2',
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg', // Assuming default icon
    badge: '/vite.svg',
    data: payload.data // Pass deep linking data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Deep linking routing using aura_routing data
    if (event.notification.data && event.notification.data.aura_routing) {
        let routeData = event.notification.data.aura_routing;
        if (typeof routeData === 'string') {
            try { routeData = JSON.parse(routeData); } catch(e) {}
        }
        if (routeData.target === 'artifact' && routeData.artifact_id) {
            const urlToOpen = new URL(`/app?artifact=${routeData.artifact_id}`, self.location.origin).href;
            const promiseChain = clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then((windowClients) => {
                let matchingClient = null;
                for (let i = 0; i < windowClients.length; i++) {
                    const windowClient = windowClients[i];
                    if (windowClient.url === urlToOpen) {
                        matchingClient = windowClient;
                        break;
                    }
                }
                if (matchingClient) {
                    return matchingClient.focus();
                } else {
                    return clients.openWindow(urlToOpen);
                }
            });
            event.waitUntil(promiseChain);
        }
    }
});
