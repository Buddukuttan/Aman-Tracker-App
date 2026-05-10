import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Send, Mic, MicOff } from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);

  const amountInputRef = useRef(null);

  useEffect(() => {
    if (amountInputRef.current) amountInputRef.current.focus();
  }, []);

  const handleVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Voice Transcript:", transcript);

      // Basic Parser: "Spent 500 on Food" or "500 Shopping"
      const amountMatch = transcript.match(/\d+/);
      if (amountMatch) {
        setAmount(amountMatch[0]);
      }

      const foundCategory = categories.find(c => transcript.includes(c.toLowerCase()));
      if (foundCategory) {
        setCategory(foundCategory);
      }

      if (transcript.includes("for ")) {
        const noteMatch = transcript.split("for ")[1];
        if (noteMatch) setNote(noteMatch);
      }
    };

    recognition.start();
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
        currency: currency
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
      alert("Failed to save expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full max-w-md mx-auto p-6 pt-12">
      <header className="mb-10 flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-display tracking-tight">Record Entry</h1>
          <p className="text-foreground/40 font-medium text-sm italic">Capture your recent transaction</p>
        </div>
        <button
          onClick={handleVoiceCommand}
          className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-10">
        <div className="relative group">
          <motion.div className="absolute -left-2 top-1/2 -translate-y-1/2 text-5xl font-bold text-primary/20 group-focus-within:text-primary transition-colors">{currency}</motion.div>
          <input
            ref={amountInputRef}
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent border-b-4 border-foreground/5 focus:border-primary text-6xl font-bold py-6 pl-12 outline-none transition-all placeholder:text-foreground/5"
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          {quickAmounts.map((q, i) => (
            <motion.button key={`${q}-${i}`} type="button" whileTap={{ scale: 0.9 }} onClick={() => setAmount(q.toString())} className="py-4 bg-foreground/5 hover:bg-primary/10 text-foreground/80 hover:text-primary font-bold rounded-2xl transition-all text-xs border border-transparent hover:border-primary/20">+{q}</motion.button>
          ))}
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1">Asset Category</label>
          <div className="flex overflow-x-auto no-scrollbar py-2 -mx-6 px-6 space-x-3">
            {categories.map((c) => (
              <motion.button
                key={c}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-8 py-4 rounded-2xl font-bold transition-all relative ${category === c ? 'text-primary-foreground' : 'bg-foreground/5 text-foreground/40'}`}
              >
                {category === c && (
                  <motion.div layoutId="activeCat" className="absolute inset-0 bg-primary rounded-2xl shadow-lg" transition={{ type: "spring", bounce: 0.3, duration: 0.6 }} />
                )}
                <span className="relative z-10">{c}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1">Memo</label>
          <input type="text" placeholder={isListening ? "Listening for details..." : "Transaction details..."} value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-foreground/5 rounded-[24px] py-5 px-8 outline-none focus:ring-4 ring-primary/10 transition-all font-medium" />
        </div>

        <div className="flex-1 flex items-end pb-12">
          <motion.button
            layout
            type="submit"
            disabled={loading || !amount}
            whileTap={{ scale: 0.96 }}
            className={`w-full py-6 rounded-[32px] font-bold text-xl flex items-center justify-center space-x-3 transition-all ${loading || !amount ? 'bg-foreground/5 text-foreground/20' : 'bg-primary text-primary-foreground shadow-2xl'}`}
          >
            {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : <><Send className="w-6 h-6" /><span>Confirm Entry</span></>}
          </motion.button>
        </div>
      </form>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-primary text-primary-foreground px-10 py-8 rounded-[40px] shadow-2xl flex flex-col items-center space-y-4 border-4 border-white/10 backdrop-blur-md">
              <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} className="bg-white/20 p-4 rounded-full"><CheckCircle2 className="w-12 h-12" /></motion.div>
              <span className="font-bold text-2xl uppercase tracking-[0.2em]">Logged</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LogExpense;
