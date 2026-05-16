import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔧 FIREBASE PROJECT CREDENTIALS
// Using Environment Variables for security and flexibility
// Ensure these are set in your .env file or Vercel dashboard
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAY90tYv6vbToueuA9VCAuIHCk24dbG5aM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aman-tracker-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aman-tracker-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aman-tracker-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "279432045703",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:279432045703:web:b2d694d184c7d63b92c422",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-S2P23W0K3D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
