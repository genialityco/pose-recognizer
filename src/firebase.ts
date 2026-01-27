import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase config read from Vite env vars (VITE_ prefix)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig as any);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics is optional and only initialised in browser
export let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    // Analytics might fail in some environments; ignore silently
    // console.warn('Firebase analytics init failed', e);
  }
}

export default app;
