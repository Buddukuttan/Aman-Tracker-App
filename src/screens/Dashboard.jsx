import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getISTBoundaries, formatIST, getDaysRemainingInMonth } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Calendar, Clock, AlertTriangle,
  ChevronDown, ChevronUp, BarChart3, PieChart, Trash2,
  Trophy, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { budgetEnabled, dailyBudget, currency } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      const breakdown = {};
      const dailyMap = {};

      const lastWeekStart = new Date(week); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(week);

      docs.forEach(exp => {
        const date = exp.timestamp?.toDate() || new Date(exp.dateIST);
        const amt = exp.amount;

        if (date >= today) tTotal += amt;
        if (date >= week) wTotal += amt;
        if (date >= lastWeekStart && date < lastWeekEnd) lwTotal += amt;
        if (date >= month) {
          mTotal += amt;
          breakdown[exp.category] = breakdown[exp.category] || { total: 0, items: [] };
          breakdown[exp.category].total += amt;
          breakdown[exp.category].items.push(exp);
          const dayKey = formatIST(date, 'MMM d');
          dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;
        }
      });
      setStats({ today: tTotal, week: wTotal, month: mTotal, lastWeek: lwTotal });
      setCategoryBreakdown(breakdown);
      setChartData(Object.entries(dailyMap).slice(0, 7).reverse());
      setLoading(false);
    }, (err) => {
      setError("Data error.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    if (window.confirm("Permanently remove this entry?")) {
      try { await deleteDoc(doc(db, 'expenses', id)); }
      catch (e) { alert("Delete failed."); }
    }
  };

  const maxChartValue = Math.max(...chartData.map(d => d[1]), 1);
  const daysRemaining = getDaysRemainingInMonth();
  const smartDailyBudget = (((dailyBudget * 30) - stats.month) / daysRemaining).toFixed(0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-8 pb-32 overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-display tracking-tight">Portfolio</h1>
        <button onClick={() => setShowWealthReport(true)} className="p-3 bg-primary/10 rounded-2xl text-primary"><Trophy className="w-5 h-5" /></button>
      </header>

      {/* Main Card */}
      <motion.div whileTap={{ scale: 0.98 }} className="bg-primary p-7 rounded-[40px] text-primary-foreground shadow-2xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <p className="text-primary-foreground/60 font-bold uppercase tracking-[0.25em] text-[9px] mb-2">Monthly Expenditure</p>
        <div className="text-5xl font-bold flex items-baseline"><span className="text-2xl mr-1 font-light">{currency}</span>{stats.month.toLocaleString()}</div>
        {budgetEnabled && (
          <div className="mt-8 flex justify-between items-center bg-white/10 p-4 rounded-[20px] backdrop-blur-md">
            <div><p className="text-[8px] font-bold uppercase opacity-60">Smart Daily Allowance</p><p className="text-lg font-bold">{currency}{smartDailyBudget}</p></div>
            <div className="text-right"><p className="text-[8px] font-bold uppercase opacity-60">Days Left</p><p className="text-lg font-bold">{daysRemaining}</p></div>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-foreground/5 p-5 rounded-[28px] border border-foreground/5">
          <p className="text-foreground/30 font-bold text-[9px] uppercase tracking-widest mb-1">Today</p>
          <div className="text-xl font-bold">{currency}{stats.today.toLocaleString()}</div>
        </div>
        <div className="bg-foreground/5 p-5 rounded-[28px] border border-foreground/5">
          <p className="text-foreground/30 font-bold text-[9px] uppercase tracking-widest mb-1">Weekly</p>
          <div className="text-xl font-bold">{currency}{stats.week.toLocaleString()}</div>
        </div>
      </div>

      {/* Trends */}
      <div className="bg-foreground/5 p-6 rounded-[32px] space-y-6 border border-foreground/5">
        <div className="flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/50 flex items-center gap-2"><BarChart3 className="w-3 h-3" /> Spending Trend</h2></div>
        <div className="h-28 flex items-end justify-between gap-3 px-1">
          {chartData.map(([day, amt]) => (
            <motion.div key={day} initial={{ height: 0 }} animate={{ height: `${(amt / maxChartValue) * 100}%` }} className="flex-1 bg-primary/20 rounded-t-md relative group">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[8px] font-bold bg-primary text-primary-foreground px-1 rounded transition-opacity">{amt}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Allocations with Swipe-to-Delete */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] ml-1 text-foreground/50 flex items-center gap-2"><PieChart className="w-3 h-3" /> Asset Allocations</h2>
        <div className="space-y-3">
          {Object.entries(categoryBreakdown).map(([cat, data]) => (
            <div key={cat} className="bg-foreground/3 rounded-[24px] overflow-hidden border border-foreground/5">
              <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)} className="w-full p-5 flex items-center justify-between">
                <div className="flex flex-col items-start gap-1"><span className="font-bold text-sm">{cat}</span><div className="h-1 w-20 bg-foreground/5 rounded-full overflow-hidden"><motion.div animate={{ width: `${(data.total / stats.month) * 100}%` }} className="h-full bg-primary/60" /></div></div>
                <div className="flex items-center gap-4"><div className="font-bold text-primary text-sm">{currency}{data.total.toLocaleString()}</div>{expandedCategory === cat ? <ChevronUp className="w-4 h-4 text-foreground/20" /> : <ChevronDown className="w-4 h-4 text-foreground/20" />}</div>
              </button>
              <AnimatePresence>
                {expandedCategory === cat && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="px-5 pb-5 space-y-2">
                    {data.items.map((item) => (
                      <motion.div
                        key={item.id}
                        drag="x"
                        dragConstraints={{ left: -100, right: 0 }}
                        onDragEnd={(e, info) => info.offset.x < -50 && handleDelete(item.id)}
                        className="relative flex justify-between items-center py-4 text-[10px] border-t border-foreground/5 bg-background group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="font-bold text-foreground/80">{item.note || 'General Expense'}</div>
                          <div className="text-[8px] font-medium text-foreground/30 uppercase">{formatIST(new Date(item.dateIST), 'MMM d, h:mm a')}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-bold">{currency}{item.amount}</div>
                          <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="absolute right-[-100px] h-full flex items-center px-6 bg-red-500 text-white font-bold rounded-r-xl">DELETE</div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Wealth Report Modal */}
      <AnimatePresence>
        {showWealthReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-background w-full max-w-sm rounded-[40px] p-8 border border-foreground/5 relative">
              <button onClick={() => setShowWealthReport(false)} className="absolute right-6 top-6 p-2 bg-foreground/5 rounded-full"><X className="w-4 h-4" /></button>
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto"><Trophy className="w-8 h-8" /></div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold font-display">Weekly Wealth Report</h3>
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Financial Performance Analysis</p>
                </div>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="bg-foreground/5 p-4 rounded-3xl">
                    <p className="text-[8px] font-bold text-foreground/40 uppercase mb-1">Spent This Week</p>
                    <p className="text-xl font-bold">{currency}{stats.week}</p>
                  </div>
                  <div className="bg-foreground/5 p-4 rounded-3xl">
                    <p className="text-[8px] font-bold text-foreground/40 uppercase mb-1">Last Week</p>
                    <p className="text-xl font-bold">{currency}{stats.lastWeek}</p>
                  </div>
                </div>
                <div className={`p-6 rounded-[32px] flex items-center justify-between ${stats.week < stats.lastWeek ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  <div className="text-left"><p className="text-[10px] font-bold uppercase opacity-60">Status</p><p className="font-bold text-lg">{stats.week < stats.lastWeek ? 'Improved' : 'Overspent'}</p></div>
                  {stats.week < stats.lastWeek ? <ArrowDownRight className="w-8 h-8" /> : <ArrowUpRight className="w-8 h-8" />}
                </div>
                <button onClick={() => setShowWealthReport(false)} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20">Analyze Portfolio</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
