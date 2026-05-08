import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, IndianRupee, Plus } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getISTDate } from '../lib/utils';

const LogExpense = () => {
  const { user } = useAuth();
  const { categories, quickAmounts } = useSettings();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const amountInputRef = useRef(null);

  useEffect(() => {
    // Auto-focus amount input on mount
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;

    setLoading(true);
    try {
      const istDate = getISTDate();
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: Number(amount),
        category,
        note,
        timestamp: serverTimestamp(), // For global sorting
        dateIST: istDate.toISOString(), // For local display/logic
        createdAt: istDate.getTime()
      });

      setShowSuccess(true);
      setAmount('');
      setNote('');
      setCategory(categories[0]);

      setTimeout(() => {
        setShowSuccess(false);
        if (amountInputRef.current) amountInputRef.current.focus();
      }, 2000);
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12">
      <h1 className="text-3xl font-bold mb-8 text-center font-display">Log Expense</h1>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-8">
        <div className="relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-primary">
            ₹
          </div>
          <input
            ref={amountInputRef}
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary text-5xl font-bold py-4 pl-10 outline-none transition-colors"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q.toString())}
              className="py-3 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-2xl transition-colors active:scale-95"
            >
              +{q}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground/60 uppercase tracking-wider ml-1">Category</label>
          <div className="flex overflow-x-auto no-scrollbar py-2 -mx-6 px-6 space-x-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-6 py-3 rounded-full font-medium transition-all active:scale-95 ${
                  category === c
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-foreground/5 text-foreground/70'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground/60 uppercase tracking-wider ml-1">Notes</label>
          <input
            type="text"
            placeholder="What was this for? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-foreground/5 rounded-2xl py-4 px-6 outline-none focus:ring-2 ring-primary/50 transition-all"
          />
        </div>

        <div className="flex-1 flex items-end pb-8">
          <button
            type="submit"
            disabled={loading || !amount}
            className={`w-full py-5 rounded-3xl font-bold text-xl flex items-center justify-center space-x-3 transition-all active:scale-95 ${
              loading || !amount
                ? 'bg-foreground/10 text-foreground/30'
                : 'bg-primary text-white shadow-xl shadow-primary/40'
            }`}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6" />
                <span>Confirm Expense</span>
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-green-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-2">
              <CheckCircle2 className="w-12 h-12" />
              <span className="font-bold text-xl uppercase tracking-widest">Saved!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogExpense;
