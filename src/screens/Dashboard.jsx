import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getISTBoundaries, formatIST, getDaysRemainingInMonth } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Trash2, Trophy, ArrowUpRight, ArrowDownRight, X, ChevronRight, Info
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { budgetEnabled, dailyBudget, currency } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showWealthReport, setShowWealthReport] = useState(false);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, lastWeek: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState({});

  useEffect(() => {
    if (!user) return;
    const { today, week, month } = getISTBoundaries();
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(docs);
      let tTotal = 0, wTotal = 0, mTotal = 0, lwTotal = 0;
      const breakdown = {};
      const lastWeekStart = new Date(week); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      docs.forEach(exp => {
        const date = exp.timestamp?.toDate() || new Date(exp.dateIST);
        const amt = exp.amount;
        if (date >= today) tTotal += amt;
        if (date >= week) wTotal += amt;
        if (date >= lastWeekStart && date < week) lwTotal += amt;
        if (date >= month) {
          mTotal += amt;
          breakdown[exp.category] = breakdown[exp.category] || { total: 0, items: [] };
          breakdown[exp.category].total += amt;
          breakdown[exp.category].items.push(exp);
        }
      });
      setStats({ today: tTotal, week: wTotal, month: mTotal, lastWeek: lwTotal });
      setCategoryBreakdown(breakdown);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (e) {
      console.error(e);
    }
  };

  const daysRemaining = getDaysRemainingInMonth();
  const smartDailyBudget = (((dailyBudget * 30) - stats.month) / daysRemaining).toFixed(0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-10 pb-32 overflow-y-auto no-scrollbar font-sans">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">{formatIST(new Date(), 'EEEE, MMM d')}</p>
          <h1 className="text-4xl font-bold font-display tracking-tight">Portfolio</h1>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowWealthReport(true)} className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center text-primary border border-foreground/5 transition-colors active:bg-foreground/10"><Trophy className="w-6 h-6" /></motion.button>
      </header>

      {/* Hero Card */}
      <motion.div whileTap={{ scale: 0.98 }} className="bg-primary p-8 rounded-[48px] text-primary-foreground shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <p className="text-primary-foreground/50 font-bold uppercase tracking-[0.3em] text-[10px] mb-3">Net Outflow</p>
        <div className="text-6xl font-bold flex items-baseline tracking-tighter"><span className="text-3xl mr-1 font-light opacity-60">{currency}</span>{stats.month.toLocaleString()}</div>

        {budgetEnabled && (
          <div className="mt-10 pt-8 border-t border-white/10 flex justify-between">
            <div className="space-y-1"><p className="text-[9px] font-bold uppercase opacity-50">Safe Daily</p><p className="text-xl font-bold">{currency}{smartDailyBudget}</p></div>
            <div className="text-right space-y-1"><p className="text-[9px] font-bold uppercase opacity-50">Remaining</p><p className="text-xl font-bold">{daysRemaining}d</p></div>
          </div>
        )}
      </motion.div>

      {/* Allocation Classes */}
      <div className="space-y-6 pb-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2"><PieChart className="w-3.5 h-3.5" /> Allocation Classes</h2>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase bg-primary/5 px-3 py-1.5 rounded-full">
            <Info className="w-3 h-3" />
            <span>Swipe left to delete</span>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(categoryBreakdown).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
            <div key={cat} className="rounded-[40px] border border-foreground/5 bg-foreground/3 overflow-hidden shadow-sm">
              <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)} className="w-full p-6 flex items-center justify-between active:bg-foreground/5 transition-colors">
                <div className="flex flex-col items-start gap-2"><span className="font-bold text-base tracking-tight">{cat}</span><div className="h-1.5 w-24 bg-foreground/10 rounded-full overflow-hidden"><motion.div animate={{ width: `${(data.total / stats.month) * 100}%` }} className="h-full bg-primary/60" /></div></div>
                <div className="flex items-center gap-5"><div className="font-bold text-primary text-base">{currency}{data.total.toLocaleString()}</div><ChevronRight className={`w-4 h-4 text-foreground/20 transition-transform ${expandedCategory === cat ? 'rotate-90' : ''}`} /></div>
              </button>

              <AnimatePresence>
                {expandedCategory === cat && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-3 pb-4 space-y-3 bg-foreground/5 border-t border-foreground/5 overflow-hidden">
                    <div className="pt-2" />
                    {data.items.map((item) => (
                      <div key={item.id} className="relative h-20 group overflow-hidden">
                        {/* THE DELETE INDICATOR (REAR LAYER) */}
                        <div className="absolute inset-0 bg-red-500 rounded-[32px] flex justify-end items-center px-8 text-white font-bold text-sm tracking-widest uppercase">
                           DELETE
                        </div>

                        {/* THE CONTENT (FRONT LAYER) */}
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: -300, right: 0 }}
                          dragElastic={0.05}
                          onDragEnd={(_, info) => {
                            if (info.offset.x < -140) {
                              handleDelete(item.id);
                            }
                          }}
                          className="absolute inset-0 flex justify-between items-center px-6 rounded-[32px] bg-background border border-foreground/5 z-10 touch-pan-x"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-sm text-foreground/80 leading-tight truncate max-w-[150px]">{item.note || 'General Entry'}</div>
                            <div className="text-[9px] font-semibold text-foreground/20 uppercase tracking-widest">{formatIST(new Date(item.dateIST), 'MMM d • h:mm a')}</div>
                          </div>
                          <div className="font-bold text-sm text-foreground/60">{currency}{item.amount}</div>
                        </motion.div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showWealthReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-background w-full max-w-sm rounded-[56px] p-10 border border-foreground/5 relative overflow-hidden">
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <button onClick={() => setShowWealthReport(false)} className="absolute right-8 top-8 p-3 bg-foreground/5 rounded-full"><X className="w-4 h-4" /></button>
              <div className="text-center space-y-10 relative">
                <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto shadow-inner"><Trophy className="w-10 h-10" /></div>
                <div className="space-y-2"><h3 className="text-3xl font-bold font-display tracking-tight">Weekly Review</h3></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-foreground/3 p-5 rounded-[28px]"><p className="text-[9px] font-bold text-foreground/40 uppercase mb-2">Current</p><p className="text-2xl font-bold">{currency}{stats.week}</p></div>
                  <div className="bg-foreground/3 p-5 rounded-[28px]"><p className="text-[9px] font-bold text-foreground/40 uppercase mb-2">Previous</p><p className="text-2xl font-bold">{currency}{stats.lastWeek}</p></div>
                </div>
                <button onClick={() => setShowWealthReport(false)} className="w-full py-5 bg-primary text-primary-foreground rounded-[24px] font-bold shadow-2xl">Confirm Insight</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
