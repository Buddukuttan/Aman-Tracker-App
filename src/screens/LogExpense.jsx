import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getISTDate } from '../lib/utils';

const LogExpense = () => {
  const { user } = useAuth();
  const { categories, quickAmounts, currency } = useSettings();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const amountInputRef = useRef(null);

  useEffect(() => { if (amountInputRef.current) amountInputRef.current.focus(); }, []);

  const handleQuickAdd = (value) => {
    setAmount(prev => {
      const current = Number(prev) || 0;
      return (current + value).toString();
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    setLoading(true);
    try {
      const istDate = getISTDate();
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: Number(amount),
        category,
        note,
        timestamp: serverTimestamp(),
        dateIST: istDate.toISOString(),
        createdAt: istDate.getTime(),
        currency
      });
      setShowSuccess(true); setAmount(''); setNote(''); setCategory(categories[0]);
      setTimeout(() => { setShowSuccess(false); if (amountInputRef.current) amountInputRef.current.focus(); }, 2000);
    } catch (e) { alert("Failed to save."); } finally { setLoading(false); }
  };

  return (
    <motion.div className="flex flex-col w-full max-w-md mx-auto p-6 pt-12">
      <header className="mb-12">
        <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">TRANSACTION</p>
        <h1 className="text-4xl font-bold font-display tracking-tight">Record</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="relative group text-center">
          <div className="text-primary/20 font-bold text-sm mb-2 uppercase tracking-widest">{currency} Amount</div>
          <input
            ref={amountInputRef}
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-7xl font-bold py-4 outline-none transition-all placeholder:text-foreground/5 text-center"
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          {quickAmounts.map((q, i) => (
            <motion.button key={`${q}-${i}`} type="button" whileTap={{ scale: 0.95 }} onClick={() => handleQuickAdd(Number(q))} className="py-4 bg-foreground/5 text-foreground/80 font-bold rounded-[20px] text-xs border border-foreground/5">+{q}</motion.button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex overflow-x-auto no-scrollbar py-2 -mx-6 px-6 space-x-3">
            {categories.map((c) => (
              <motion.button
                key={c}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-8 py-4 rounded-[24px] font-bold transition-all relative ${category === c ? 'text-primary-foreground shadow-lg' : 'bg-foreground/5 text-foreground/40'}`}
              >
                {category === c && <motion.div layoutId="activeCat" className="absolute inset-0 bg-primary rounded-[24px]" transition={{ type: "spring", bounce: 0.3, duration: 0.6 }} />}
                <span className="relative z-10">{c}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <input type="text" placeholder="Add a memo..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-foreground/5 rounded-[24px] py-6 px-8 outline-none border border-foreground/5 font-medium placeholder:text-foreground/20" />
        </div>

        <div className="pt-8">
          <motion.button
            layout
            type="submit"
            disabled={loading || !amount}
            whileTap={{ scale: 0.97 }}
            className={`w-full py-6 rounded-[32px] font-bold text-xl flex items-center justify-center space-x-3 transition-all ${loading || !amount ? 'bg-foreground/5 text-foreground/20' : 'bg-primary text-primary-foreground shadow-2xl shadow-primary/40'}`}
          >
            {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : <><Send className="w-5 h-5" /><span>Confirm Entry</span></>}
          </motion.button>
        </div>
      </form>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-primary text-primary-foreground px-12 py-10 rounded-[48px] shadow-2xl flex flex-col items-center space-y-4 border border-white/10 backdrop-blur-xl">
              <CheckCircle2 className="w-16 h-16" />
              <span className="font-bold text-2xl uppercase tracking-[0.2em]">Logged</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LogExpense;
