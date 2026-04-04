import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getFirebaseConfig(): FirebaseConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error('Missing Firebase client environment variables.');
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

function getFirebaseApp() {
  if (getApps().length > 0) return getApp();
  return initializeApp(getFirebaseConfig());
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}
