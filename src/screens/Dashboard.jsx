import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getISTBoundaries, formatIST } from '../lib/utils';
import { IndianRupee, TrendingUp, Calendar, Clock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState({});

  useEffect(() => {
    if (!user) return;

    const { today, week, month } = getISTBoundaries();

    // Using a simpler query first to avoid index requirements if possible,
    // though for Dashboard we really need the latest entries.
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setExpenses(docs);

      // Calculate Stats
      let tTotal = 0, wTotal = 0, mTotal = 0;
      const breakdown = {};

      const now = new Date();

      docs.forEach(exp => {
        const date = exp.timestamp?.toDate() || new Date(exp.dateIST);
        const amt = exp.amount;

        if (date >= today) tTotal += amt;
        if (date >= week) wTotal += amt;
        if (date >= month) {
          mTotal += amt;
          breakdown[exp.category] = (breakdown[exp.category] || 0) + amt;
        }
      });

      setStats({ today: tTotal, week: wTotal, month: mTotal });
      setCategoryBreakdown(breakdown);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const maxCategoryValue = Math.max(...Object.values(categoryBreakdown), 0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-8 pb-24">
      <h1 className="text-3xl font-bold font-display">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-primary p-6 rounded-3xl text-white shadow-xl shadow-primary/30 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <p className="text-primary-foreground/80 font-medium uppercase tracking-widest text-xs mb-1">Spent This Month</p>
          <div className="text-4xl font-bold flex items-baseline">
            <span className="text-2xl mr-1">₹</span>
            {stats.month.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-foreground/5 p-5 rounded-3xl border border-foreground/5">
            <p className="text-foreground/50 font-medium text-xs uppercase tracking-wider mb-1">Today</p>
            <div className="text-xl font-bold">₹{stats.today.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-foreground/5 p-5 rounded-3xl border border-foreground/5">
            <p className="text-foreground/50 font-medium text-xs uppercase tracking-wider mb-1">This Week</p>
            <div className="text-xl font-bold">₹{stats.week.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Category Breakdown
        </h2>
        <div className="space-y-4">
          {Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]) => (
              <div key={cat} className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>{cat}</span>
                  <span>₹{amt.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${(amt / maxCategoryValue) * 100}%` }}
                  />
                </div>
              </div>
            ))
          }
          {Object.keys(categoryBreakdown).length === 0 && (
            <p className="text-foreground/40 italic text-center py-4">No data for this month</p>
          )}
        </div>
      </div>

      {/* Recent History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display">Recent History</h2>
        <div className="space-y-3">
          {expenses.map((exp) => (
            <div key={exp.id} className="bg-foreground/5 p-4 rounded-2xl flex items-center justify-between border border-foreground/5">
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">{exp.category}</span>
                {exp.note && <span className="text-foreground/60 text-sm">{exp.note}</span>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">
                   <div className="flex items-center gap-1">
                     <Calendar className="w-3 h-3" />
                     {formatIST(exp.timestamp?.toDate() || new Date(exp.dateIST), 'MMM d, yyyy')}
                   </div>
                   <div className="flex items-center gap-1">
                     <Clock className="w-3 h-3" />
                     {formatIST(exp.timestamp?.toDate() || new Date(exp.dateIST), 'hh:mm a')}
                   </div>
                </div>
              </div>
              <div className="text-xl font-bold text-primary">
                ₹{exp.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
          {expenses.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="bg-foreground/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <IndianRupee className="w-8 h-8 text-foreground/20" />
              </div>
              <p className="text-foreground/40">No entries found. Start logging!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
