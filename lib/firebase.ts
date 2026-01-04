import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Only initialize Firebase if we're in the browser AND we have the required config
if (typeof window !== 'undefined') {
  try {
    // Check if Firebase config is complete
    const hasFirebaseConfig = 
      firebaseConfig.apiKey && 
      firebaseConfig.projectId && 
      firebaseConfig.appId;

    if (hasFirebaseConfig && getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      
      // Only initialize messaging if service worker is supported
      if ('serviceWorker' in navigator && app) {
        messaging = getMessaging(app);
      }
    } else {
      console.log('[Firebase] Firebase config incomplete or already initialized');
    }
  } catch (error) {
    console.error('[Firebase] Error initializing Firebase:', error);
    // Don't throw - just log and continue without Firebase
  }
}

export { app, messaging };
