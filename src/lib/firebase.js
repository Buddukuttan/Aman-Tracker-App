import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔧 FIREBASE PROJECT CREDENTIALS
const firebaseConfig = {
  apiKey: "AIzaSyAY90tYv6vbToueuA9VCAuIHCk24dbG5aM",
  authDomain: "aman-tracker-app.firebaseapp.com",
  projectId: "aman-tracker-app",
  storageBucket: "aman-tracker-app.firebasestorage.app",
  messagingSenderId: "279432045703",
  appId: "1:279432045703:web:b2d694d184c7d63b92c422",
  measurementId: "G-S2P23W0K3D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
