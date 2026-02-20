import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyATGitTQBdTKwdofWHiSRbHiAVieCF3dXk",
  authDomain: "sapa-tracker-c5886.firebaseapp.com",
  projectId: "sapa-tracker-c5886",
  storageBucket: "sapa-tracker-c5886.firebasestorage.app",
  messagingSenderId: "1023110880932",
  appId: "1:1023110880932:web:bed370ffece0ee4fe69031",
};

const rawFirebaseEnv = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim(),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || "").trim(),
};

const firebaseConfig = {
  apiKey: rawFirebaseEnv.apiKey || FALLBACK_FIREBASE_CONFIG.apiKey,
  authDomain: rawFirebaseEnv.authDomain || FALLBACK_FIREBASE_CONFIG.authDomain,
  projectId: rawFirebaseEnv.projectId || FALLBACK_FIREBASE_CONFIG.projectId,
  storageBucket: rawFirebaseEnv.storageBucket || FALLBACK_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: rawFirebaseEnv.messagingSenderId || FALLBACK_FIREBASE_CONFIG.messagingSenderId,
  appId: rawFirebaseEnv.appId || FALLBACK_FIREBASE_CONFIG.appId,
};

const requiredEnvMap = {
  VITE_FIREBASE_API_KEY: rawFirebaseEnv.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: rawFirebaseEnv.authDomain,
  VITE_FIREBASE_PROJECT_ID: rawFirebaseEnv.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: rawFirebaseEnv.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: rawFirebaseEnv.messagingSenderId,
  VITE_FIREBASE_APP_ID: rawFirebaseEnv.appId,
};

const missingFirebaseEnv = Object.entries(requiredEnvMap)
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

let app = null;
let db = null;
let auth = null;
let firebaseInitError = "";
let firebaseInitWarning = "";

if (missingFirebaseEnv.length) {
  firebaseInitWarning = `Missing Firebase env vars: ${missingFirebaseEnv.join(", ")}. Using app fallback config.`;
}

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (err) {
  firebaseInitError = err?.message || "Firebase initialization failed.";
}

if (firebaseInitError) {
  console.error(`SapaTracker Firebase setup error: ${firebaseInitError}`);
}
if (firebaseInitWarning) {
  console.warn(`SapaTracker Firebase warning: ${firebaseInitWarning}`);
}

export { app, db, auth, firebaseInitError, firebaseInitWarning };
export const isFirebaseReady = Boolean(app && db && auth);
