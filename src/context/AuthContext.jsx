import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence to local (survives browser restarts)
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        return onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
      })
      .catch((error) => {
        console.error("Auth persistence error:", error);
        setLoading(false);
      });
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
