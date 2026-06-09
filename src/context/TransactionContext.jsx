import React, { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { getISTDate } from '../lib/utils';

const TransactionContext = createContext();

export const useTransaction = () => useContext(TransactionContext);

export const TransactionProvider = ({ children }) => {
  const { user } = useAuth();
  const { categories, currency, currencyCode, travelMode, currentTrip } = useSettings();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync category with settings if it changes or on load
  React.useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const submitTransaction = useCallback(async () => {
    if (!user || !amount || isNaN(amount) || Number(amount) <= 0) return;

    setLoading(true);
    try {
      const istDate = getISTDate();
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: Number(amount),
        category: category || categories[0],
        note,
        timestamp: serverTimestamp(),
        dateIST: istDate.toISOString(),
        createdAt: istDate.getTime(),
        currency,
        currencyCode,
        ...(travelMode && currentTrip ? { tripId: currentTrip.id, tripName: currentTrip.name } : {})
      });

      setShowSuccess(true);
      setAmount('');
      setNote('');
      setCategory(categories[0]);

      setTimeout(() => setShowSuccess(false), 2000);
      return true;
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, amount, category, note, categories, currency, currencyCode, travelMode, currentTrip]);

  const value = {
    amount, setAmount,
    category, setCategory,
    note, setNote,
    loading,
    showSuccess, setShowSuccess,
    submitTransaction
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
