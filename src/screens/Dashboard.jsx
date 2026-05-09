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
  const [viewType, setViewType] = useState('daily'); // daily or weekly toggle
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
      const weeklyMap = {};

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

          // For Chart
          const dayKey = formatIST(date, 'MMM d');
          dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;
        }
      });

      setStats({ today: tTotal, week: wTotal, month: mTotal });
      setCategoryBreakdown(breakdown);

      // Prep Chart Data (last 7 days for daily)
      const sortedDaily = Object.entries(dailyMap).slice(0, 7).reverse();
      setChartData(sortedDaily);

      setLoading(false);
      setError(null);
    }, (err) => {
      setError(err.code === 'failed-precondition' ? "Index missing. See FIREBASE_SETUP.md." : "Failed to load data.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const maxChartValue = Math.max(...chartData.map(d => d[1]), 1);
  const daysRemaining = getDaysRemainingInMonth();
  const monthlyBudgetPool = dailyBudget * 30; // Approximation or configurable
  const remainingBudget = Math.max(0, monthlyBudgetPool - stats.month);
  const smartDailyBudget = (remainingBudget / daysRemaining).toFixed(0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-8 pb-32 overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-display">Dashboard</h1>
        {budgetEnabled && (
          <div className="bg-primary/10 px-4 py-2 rounded-2xl text-primary font-bold text-xs">
            ₹{smartDailyBudget}/day left
          </div>
        )}
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-5 rounded-3xl flex items-start gap-4 text-sm leading-relaxed">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-primary p-6 rounded-[32px] text-white shadow-xl shadow-primary/30 relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <p className="text-primary-foreground/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Spent This Month</p>
          <div className="text-5xl font-bold flex items-baseline">
            <span className="text-2xl mr-1">₹</span>
            {stats.month.toLocaleString('en-IN')}
          </div>
          {budgetEnabled && (
            <div className="mt-4 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.month / (dailyBudget * 30)) * 100)}%` }}
                className="h-full bg-white"
              />
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-foreground/5 p-5 rounded-[28px] border border-foreground/5">
            <p className="text-foreground/40 font-bold text-[10px] uppercase tracking-wider mb-1">Today</p>
            <div className="text-xl font-bold">₹{stats.today.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-foreground/5 p-5 rounded-[28px] border border-foreground/5">
            <p className="text-foreground/40 font-bold text-[10px] uppercase tracking-wider mb-1">Week</p>
            <div className="text-xl font-bold">₹{stats.week.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Animated Spending Graph */}
      <div className="bg-foreground/5 p-6 rounded-[32px] space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Spending Trend
          </h2>
          <div className="flex bg-foreground/10 p-1 rounded-xl">
            <button
              onClick={() => setViewType('daily')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewType === 'daily' ? 'bg-background text-primary shadow-sm' : 'text-foreground/40'}`}
            >DAILY</button>
            <button
              onClick={() => setViewType('weekly')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewType === 'weekly' ? 'bg-background text-primary shadow-sm' : 'text-foreground/40'}`}
            >WEEKLY</button>
          </div>
        </div>

        <div className="h-40 flex items-end justify-between gap-2 px-2">
          {chartData.length > 0 ? chartData.map(([day, amt], i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex flex-col justify-end h-32">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(amt / maxChartValue) * 100}%` }}
                  className="w-full bg-primary/40 group-hover:bg-primary rounded-t-lg transition-colors"
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[8px] font-bold bg-primary text-white px-1.5 py-0.5 rounded">
                  ₹{amt}
                </div>
              </div>
              <span className="text-[8px] font-bold text-foreground/40 uppercase">{day}</span>
            </div>
          )) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs italic">No data yet</div>
          )}
        </div>
      </div>

      {/* Category Drill-down */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Breakdown & Details
        </h2>
        <div className="space-y-3">
          {Object.entries(categoryBreakdown)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([cat, data]) => (
              <div key={cat} className="bg-foreground/5 rounded-[24px] overflow-hidden border border-foreground/5">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                  className="w-full p-5 flex items-center justify-between active:bg-foreground/5 transition-colors"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-bold">{cat}</span>
                    <div className="h-1.5 w-32 bg-foreground/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.total / stats.month) * 100}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-primary">₹{data.total.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] font-bold text-foreground/30">{data.items.length} entries</div>
                    </div>
                    {expandedCategory === cat ? <ChevronUp className="w-4 h-4 text-foreground/20" /> : <ChevronDown className="w-4 h-4 text-foreground/20" />}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategory === cat && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-5 space-y-2 border-t border-foreground/5"
                    >
                      {data.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-2 text-xs border-b border-foreground/5 last:border-0">
                          <div>
                            <div className="font-semibold text-foreground/80">{item.note || 'No note'}</div>
                            <div className="text-[10px] text-foreground/40">{formatIST(new Date(item.dateIST), 'MMM d, h:mm a')}</div>
                          </div>
                          <div className="font-bold">₹{item.amount}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
