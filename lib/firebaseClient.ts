import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
};

function getFirebaseConfig(): FirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'bookme-65bd5';

  if (!apiKey || !authDomain || !projectId) return null;

  return { apiKey, authDomain, projectId };
}

export function getFirestoreDb() {
  const config = getFirebaseConfig();
  if (!config) return null;
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return getFirestore(app);
}
