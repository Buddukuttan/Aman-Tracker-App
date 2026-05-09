import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getISTBoundaries, formatIST, getDaysRemainingInMonth } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, TrendingUp, Calendar, Clock, AlertTriangle,
  ChevronDown, ChevronUp, BarChart3, PieChart
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { budgetEnabled, dailyBudget } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('daily');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!user) return;
    const { today, week, month } = getISTBoundaries();
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(docs);

      let tTotal = 0, wTotal = 0, mTotal = 0;
      const breakdown = {};
      const dailyMap = {};

      docs.forEach(exp => {
        const date = exp.timestamp?.toDate() || new Date(exp.dateIST);
        const amt = exp.amount;

        if (date >= today) tTotal += amt;
        if (date >= week) wTotal += amt;
        if (date >= month) {
          mTotal += amt;
          breakdown[exp.category] = breakdown[exp.category] || { total: 0, items: [] };
          breakdown[exp.category].total += amt;
          breakdown[exp.category].items.push(exp);
          const dayKey = formatIST(date, 'MMM d');
          dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;
        }
      });
      setStats({ today: tTotal, week: wTotal, month: mTotal });
      setCategoryBreakdown(breakdown);
      setChartData(Object.entries(dailyMap).slice(0, 7).reverse());
      setLoading(false);
      setError(null);
    }, (err) => {
      setError(err.code === 'failed-precondition' ? "Index required." : "Data error.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const maxChartValue = Math.max(...chartData.map(d => d[1]), 1);
  const daysRemaining = getDaysRemainingInMonth();
  const remainingBudget = Math.max(0, (dailyBudget * 30) - stats.month);
  const smartDailyBudget = (remainingBudget / daysRemaining).toFixed(0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-8 pb-32 overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-display tracking-tight">Portfolio</h1>
        {budgetEnabled && (
          <div className="bg-primary/10 px-4 py-2 rounded-2xl text-primary font-bold text-[10px] tracking-widest uppercase">
            ₹{smartDailyBudget} Limit
          </div>
        )}
      </header>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-5 rounded-3xl text-sm italic">{error}</div>}

      <div className="grid grid-cols-1 gap-4">
        <motion.div whileTap={{ scale: 0.98 }} className="bg-primary p-7 rounded-[40px] text-primary-foreground shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <p className="text-primary-foreground/60 font-bold uppercase tracking-[0.25em] text-[9px] mb-2">Monthly Expenditure</p>
          <div className="text-5xl font-bold flex items-baseline">
            <span className="text-2xl mr-1 font-light">₹</span>
            {stats.month.toLocaleString('en-IN')}
          </div>
          {budgetEnabled && (
            <div className="mt-6 h-1 w-full bg-primary-foreground/20 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.month / (dailyBudget * 30)) * 100)}%` }} className="h-full bg-primary-foreground shadow-[0_0_10px_#fff]" />
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-foreground/5 p-5 rounded-[28px] border border-foreground/5">
            <p className="text-foreground/30 font-bold text-[9px] uppercase tracking-widest mb-1">Today</p>
            <div className="text-xl font-bold">₹{stats.today.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-foreground/5 p-5 rounded-[28px] border border-foreground/5">
            <p className="text-foreground/30 font-bold text-[9px] uppercase tracking-widest mb-1">Weekly</p>
            <div className="text-xl font-bold">₹{stats.week.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-foreground/5 p-6 rounded-[32px] space-y-6 border border-foreground/5">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-2 text-foreground/50"><BarChart3 className="w-3 h-3" /> Trend Analysis</h2>
          <div className="flex bg-foreground/10 p-1 rounded-xl">
            <button onClick={() => setViewType('daily')} className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${viewType === 'daily' ? 'bg-background text-primary' : 'text-foreground/40'}`}>DAILY</button>
            <button onClick={() => setViewType('weekly')} className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${viewType === 'weekly' ? 'bg-background text-primary' : 'text-foreground/40'}`}>WEEKLY</button>
          </div>
        </div>
        <div className="h-32 flex items-end justify-between gap-3 px-1">
          {chartData.map(([day, amt]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-2 group relative">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(amt / maxChartValue) * 100}%` }} className="w-full bg-primary/20 group-hover:bg-primary transition-colors rounded-t-md" />
              <span className="text-[8px] font-bold text-foreground/30">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] ml-1 text-foreground/50 flex items-center gap-2"><PieChart className="w-3 h-3" /> Allocations</h2>
        <div className="space-y-3">
          {Object.entries(categoryBreakdown).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
            <div key={cat} className="bg-foreground/3 rounded-[24px] overflow-hidden border border-foreground/5">
              <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)} className="w-full p-5 flex items-center justify-between active:bg-foreground/5 transition-colors">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-bold text-sm tracking-tight">{cat}</span>
                  <div className="h-1 w-24 bg-foreground/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(data.total / stats.month) * 100}%` }} className="h-full bg-primary/60" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-primary text-sm">₹{data.total.toLocaleString('en-IN')}</div>
                    <div className="text-[9px] font-bold text-foreground/20 uppercase">{data.items.length} ops</div>
                  </div>
                  {expandedCategory === cat ? <ChevronUp className="w-4 h-4 text-foreground/20" /> : <ChevronDown className="w-4 h-4 text-foreground/20" />}
                </div>
              </button>
              <AnimatePresence>
                {expandedCategory === cat && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5 space-y-2">
                    {data.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-3 text-[10px] border-t border-foreground/5">
                        <div className="flex flex-col gap-0.5">
                          <div className="font-bold text-foreground/80">{item.note || 'General'}</div>
                          <div className="text-[8px] font-medium text-foreground/30 uppercase tracking-wider">{formatIST(new Date(item.dateIST), 'MMM d, h:mm a')}</div>
                        </div>
                        <div className="font-bold text-foreground/60">₹{item.amount}</div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
