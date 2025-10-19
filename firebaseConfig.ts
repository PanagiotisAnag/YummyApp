// firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
} from "firebase/auth";
import { Platform } from "react-native";

/** Your own credentials */
const firebaseConfig = {
  apiKey: "AIzaSyDaVsWvWgKdsJFBxw-r08-Bsr31rrtRHjI",
  authDomain: "yummyapp-db.firebaseapp.com",
  projectId: "yummyapp-db",
  storageBucket: "yummyapp-db.appspot.com",
  messagingSenderId: "342563474811",
  appId: "1:342563474811:web:32da88a4bed219c5fd41de",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

/**
 * Auth:
 * - Web: getAuth + setPersistence(indexedDB → fallback to localStorage)
 * - Native: initializeAuth + getReactNativePersistence(AsyncStorage)
 *   (loaded via require so web bundler never sees the RN entrypoint)
 */
let authInstance = getAuth(app);

if (Platform.OS === "web") {
  // Prefer IndexedDB on web; fall back to localStorage if not available.
  setPersistence(authInstance, indexedDBLocalPersistence).catch(() =>
    setPersistence(authInstance, browserLocalPersistence),
  );
} else {
  // Only load these on native to avoid web resolution errors
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence } = require("firebase/auth/react-native");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;

  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const auth = authInstance;

// Google provider (used for web popups, and for credential building on native)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
