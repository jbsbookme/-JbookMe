import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let cachedApp = null as ReturnType<typeof initializeApp> | null;

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables.');
  }

  return { projectId, clientEmail, privateKey };
}

function getAdminApp() {
  if (cachedApp) return cachedApp;
  const apps = getApps();
  if (apps.length > 0) {
    cachedApp = apps[0];
    return cachedApp;
  }

  const serviceAccount = getServiceAccount();
  cachedApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return cachedApp;
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
