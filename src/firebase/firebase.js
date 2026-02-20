import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredEnvMap = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
};

const missingFirebaseEnv = Object.entries(requiredEnvMap)
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

let app = null;
let db = null;
let auth = null;
let firebaseInitError = "";

if (missingFirebaseEnv.length) {
  firebaseInitError = `Missing Firebase env vars: ${missingFirebaseEnv.join(", ")}.`;
} else {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    firebaseInitError = err?.message || "Firebase initialization failed.";
  }
}

if (firebaseInitError) {
  console.error(`SapaTracker Firebase setup error: ${firebaseInitError}`);
}

export { app, db, auth, firebaseInitError };
export const isFirebaseReady = Boolean(app && db && auth);
