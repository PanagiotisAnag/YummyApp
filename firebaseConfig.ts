// firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ⚠️ ΒΑΛΕ ΤΑ ΔΙΚΑ ΣΟΥ CREDENTIALS ΕΔΩ (ό,τι είχες ήδη)
const firebaseConfig = {
  apiKey: "AIzaSyDaVsWvWgKdsJFBxw-r08-Bsr31rrtRHjI",
  authDomain: "yummyapp-db.firebaseapp.com",
  projectId: "yummyapp-db",          // το δικό σου projectId
  storageBucket: "yummyapp-db.appspot.com",
  messagingSenderId: "342563474811",
  appId: "1:342563474811:web:32da88a4bed219c5fd41de",
  // measurementId: "G-XXXX", // προαιρετικό
};

// ✅ Initialize exactly once (αποφεύγει duplicates)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Auth + Google provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
