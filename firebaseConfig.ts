// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// (optional: analytics, but not needed for search)
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDaVsWvWgKdsJFBxw-r08-Bsr31rrtRHjI",
  authDomain: "yummyapp-db.firebaseapp.com",
  projectId: "yummyapp-db",
  storageBucket: "yummyapp-db.firebasestorage.app",
  messagingSenderId: "342563474811",
  appId: "1:342563474811:web:32da88a4bed219c5fd41de",
  measurementId: "G-MF1DYDGBLN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 👇 export Firestore (this is what you use everywhere else)
export const db = getFirestore(app);

// Optional: log projectId when the app starts
console.log("[Firebase] Connected project:", firebaseConfig.projectId);


