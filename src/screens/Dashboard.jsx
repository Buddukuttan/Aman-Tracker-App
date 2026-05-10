import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getISTBoundaries, formatIST, getDaysRemainingInMonth } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, PieChart, Trash2, Trophy, ArrowUpRight, ArrowDownRight, X, ChevronRight
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { budgetEnabled, dailyBudget, currency } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('daily');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showWealthReport, setShowWealthReport] = useState(false);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, lastWeek: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!user) return;
    const { today, week, month } = getISTBoundaries();
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(docs);
      let tTotal = 0, wTotal = 0, mTotal = 0, lwTotal = 0;
      const breakdown = {}; const dailyMap = {};
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
          dailyMap[formatIST(date, 'MMM d')] = (dailyMap[formatIST(date, 'MMM d')] || 0) + amt;
        }
      });
      setStats({ today: tTotal, week: wTotal, month: mTotal, lastWeek: lwTotal });
      setCategoryBreakdown(breakdown);
      setChartData(Object.entries(dailyMap).slice(0, 7).reverse());
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this item?")) {
      await deleteDoc(doc(db, 'expenses', id));
    }
  };

  const daysRemaining = getDaysRemainingInMonth();
  const smartDailyBudget = (((dailyBudget * 30) - stats.month) / daysRemaining).toFixed(0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-10 pb-32 overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">{formatIST(new Date(), 'EEEE, MMM d')}</p>
          <h1 className="text-4xl font-bold font-display tracking-tight">Portfolio</h1>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowWealthReport(true)} className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center text-primary border border-foreground/5"><Trophy className="w-6 h-6" /></motion.button>
      </header>

      {/* Hero Card - High iOS Radius */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">Today</p>
          <div className="text-2xl font-bold tracking-tight">{currency}{stats.today.toLocaleString()}</div>
        </div>
        <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">Week</p>
          <div className="text-2xl font-bold tracking-tight">{currency}{stats.week.toLocaleString()}</div>
        </div>
      </div>

      {/* Trend Graph */}
      <div className="bg-foreground/3 p-8 rounded-[40px] space-y-8 border border-foreground/5">
        <div className="flex justify-between items-center"><h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Analytics</h2></div>
        <div className="h-32 flex items-end justify-between gap-4">
          {chartData.map(([day, amt]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-3 group relative">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(amt / Math.max(...chartData.map(d => d[1]), 1)) * 100}%` }} className="w-full bg-primary/20 group-hover:bg-primary transition-all rounded-full" />
              <span className="text-[8px] font-bold text-foreground/20">{day.split(' ')[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grouped Lists (iOS Style) */}
      <div className="space-y-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><PieChart className="w-3.5 h-3.5" /> Allocation Classes</h2>
        <div className="space-y-4">
          {Object.entries(categoryBreakdown).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
            <div key={cat} className="ios-card bg-foreground/3">
              <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)} className="w-full p-6 flex items-center justify-between active:bg-foreground/5">
                <div className="flex flex-col items-start gap-1.5"><span className="font-bold text-base tracking-tight">{cat}</span><div className="h-1 w-24 bg-foreground/10 rounded-full overflow-hidden"><motion.div animate={{ width: `${(data.total / stats.month) * 100}%` }} className="h-full bg-primary/60" /></div></div>
                <div className="flex items-center gap-5"><div className="font-bold text-primary text-base">{currency}{data.total.toLocaleString()}</div><ChevronRight className={`w-4 h-4 text-foreground/20 transition-transform ${expandedCategory === cat ? 'rotate-90' : ''}`} /></div>
              </button>
              <AnimatePresence>
                {expandedCategory === cat && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-6 pb-4 space-y-1">
                    {data.items.map((item) => (
                      <motion.div key={item.id} drag="x" dragConstraints={{ left: -80, right: 0 }} onDragEnd={(_, info) => info.offset.x < -40 && handleDelete(item.id)} className="flex justify-between items-center py-4 border-t border-foreground/5 bg-transparent active:bg-foreground/5 relative">
                        <div className="flex flex-col gap-0.5"><div className="font-bold text-sm text-foreground/80">{item.note || 'General'}</div><div className="text-[9px] font-medium text-foreground/20 uppercase tracking-widest">{formatIST(new Date(item.dateIST), 'MMM d, h:mm a')}</div></div>
                        <div className="font-bold text-sm text-foreground/60">{currency}{item.amount}</div>
                        <div className="absolute right-[-80px] h-full flex items-center px-4 bg-red-500 text-white font-bold text-xs">DELETE</div>
                      </motion.div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-3xl flex items-center justify-center p-8">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-background w-full max-w-sm rounded-[56px] p-10 border border-foreground/5 relative overflow-hidden">
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <button onClick={() => setShowWealthReport(false)} className="absolute right-8 top-8 p-3 bg-foreground/5 rounded-full"><X className="w-4 h-4" /></button>
              <div className="text-center space-y-10 relative">
                <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto shadow-inner"><Trophy className="w-10 h-10" /></div>
                <div className="space-y-2"><h3 className="text-3xl font-bold font-display tracking-tight">Weekly Review</h3><p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.25em]">Financial Intelligence</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-foreground/3 p-5 rounded-[28px]"><p className="text-[9px] font-bold text-foreground/40 uppercase mb-2">Current</p><p className="text-2xl font-bold">{currency}{stats.week}</p></div>
                  <div className="bg-foreground/3 p-5 rounded-[28px]"><p className="text-[9px] font-bold text-foreground/40 uppercase mb-2">Previous</p><p className="text-2xl font-bold">{currency}{stats.lastWeek}</p></div>
                </div>
                <div className={`p-8 rounded-[40px] flex items-center justify-between ${stats.week < stats.lastWeek ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  <div className="text-left font-bold"><p className="text-[10px] uppercase opacity-60">Insight</p><p className="text-xl tracking-tight">{stats.week < stats.lastWeek ? 'Asset Growth' : 'Over Limit'}</p></div>
                  {stats.week < stats.lastWeek ? <ArrowDownRight className="w-10 h-10" /> : <ArrowUpRight className="w-10 h-10" />}
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
