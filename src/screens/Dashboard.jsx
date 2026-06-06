import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { registerBiometrics, isWebAuthnSupported } from '../lib/webauthn';
import { getISTBoundaries, formatIST, getDaysRemainingInMonth, parseSafeDate } from '../lib/utils';
import SpendingChart from '../components/SpendingChart';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  PieChart, Trash2, Trophy, ArrowUpRight, ArrowDownRight, X, ChevronRight, Info, TrendingUp, History, ShieldCheck
} from 'lucide-react';

const SwipeableItem = ({ children, onDelete }) => {
  const x = useMotionValue(0);
  const scale = useTransform(x, [-100, 0], [0.94, 1]);
  const opacity = useTransform(x, [-100, -20], [1, 0]);
  const btnScale = useTransform(x, [-100, -20], [1, 0.4]);

  return (
    <div className="relative h-20 group overflow-hidden rounded-[32px] bg-transparent">
      {/* Delete Action Area */}
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center">
        <motion.button
          style={{ opacity, scale: btnScale }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-500/20 active:scale-90 transition-transform z-0"
        >
          <Trash2 className="w-5 h-5" />
        </motion.button>
      </div>

      {/* The Swipeable Oval */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.05}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        style={{ x, scale }}
        className="absolute inset-0 flex justify-between items-center px-6 rounded-[32px] bg-background border border-foreground/5 z-10 touch-pan-x shadow-sm origin-right"
      >
        {children}
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const {
    budgetEnabled, dailyBudget, currency, currencyCode,
    convertAmount, travelMode, currentTrip, endTrip,
    isBiometricEnrolled, setIsBiometricEnrolled, setBiometricEnabled
  } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showWealthReport, setShowWealthReport] = useState(false);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' or 'ledger'
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, lastWeek: 0, total: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [tripStats, setTripStats] = useState({ total: 0, breakdown: {} });
  const [showEndTripConfirm, setShowEndTripConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const { today, week, month } = getISTBoundaries();
    // Fetch with snapshot listener
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let tTotal = 0, wTotal = 0, mTotal = 0, lwTotal = 0, allTotal = 0;
      const breakdown = {};
      const lastWeekStart = new Date(week); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      let tripTotal = 0;
      const tripBreakdown = {};

      docs.forEach(exp => {
        const date = parseSafeDate(exp.timestamp || exp.dateIST);

        // Convert amount to current currency if it was recorded in a different one
        const originalAmt = Number(exp.amount) || 0;
        const amt = convertAmount(originalAmt, exp.currencyCode || 'INR'); // Default to INR for old records

        allTotal += amt;

        if (date >= today) tTotal += amt;
        if (date >= week) wTotal += amt;
        if (date >= lastWeekStart && date < week) lwTotal += amt;
        if (date >= month) {
          mTotal += amt;
          if (exp.category) {
            breakdown[exp.category] = breakdown[exp.category] || { total: 0, items: [] };
            breakdown[exp.category].total += amt;
            breakdown[exp.category].items.push({ ...exp, resolvedDate: date });
          }
        }

        if (travelMode && currentTrip && exp.tripId === currentTrip.id) {
          tripTotal += amt;
          if (exp.category) {
            tripBreakdown[exp.category] = (tripBreakdown[exp.category] || 0) + amt;
          }
        }
      });

      setExpenses(docs);
      setStats({ today: tTotal, week: wTotal, month: mTotal, lastWeek: lwTotal, total: allTotal });
      setCategoryBreakdown(breakdown);
      setTripStats({ total: tripTotal, breakdown: tripBreakdown });
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, travelMode, currentTrip, convertAmount]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const daysRemaining = getDaysRemainingInMonth();
  const smartDailyBudget = (((Number(dailyBudget) * 30) - stats.month) / daysRemaining).toFixed(0);

  if (loading && expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pt-12 space-y-10 safe-area-pt">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">{formatIST(new Date(), 'EEEE, MMM d')}</p>
          <h1 className="text-4xl font-bold font-display tracking-tight">Portfolio</h1>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowWealthReport(true)} className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center text-primary border border-foreground/5 transition-colors active:bg-foreground/10">
          <Trophy className="w-6 h-6" />
        </motion.button>
      </header>

      {/* Biometric Enrollment Prompt */}
      {!isBiometricEnrolled && isWebAuthnSupported() && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary/5 p-6 rounded-[32px] border border-primary/20 flex flex-col gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm">Secure Your Wealth</h3>
              <p className="text-[10px] text-foreground/40 font-medium leading-tight">Enable FaceID or TouchID for instant, secure access to your portfolio.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await registerBiometrics(user);
                setIsBiometricEnrolled(true);
                setBiometricEnabled(true);
              } catch (e) {
                console.error("Dashboard enrollment failed:", e);
              }
            }}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
          >
            Register Biometrics
          </button>
        </motion.div>
      )}

      {/* Travel Mode Dashboard */}
      {travelMode && currentTrip && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-foreground/5 p-8 rounded-[48px] border border-primary/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-6">
             <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Live Trip</div>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-foreground/30 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">{currentTrip.name}</p>
              <div className="text-4xl font-bold tracking-tighter">
                <span className="text-xl mr-1 opacity-40">{currency}</span>
                {tripStats.total.toLocaleString()}
              </div>
            </div>

            {currentTrip.budget && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                  <span>Balance</span>
                  <span>{((tripStats.total / currentTrip.budget) * 100).toFixed(0)}% Spent</span>
                </div>
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((tripStats.total / currentTrip.budget) * 100, 100)}%` }}
                    className={`h-full ${tripStats.total > currentTrip.budget ? 'bg-red-500' : 'bg-primary'}`}
                  />
                </div>
                <p className="text-right font-bold text-sm">
                  {currency}{(currentTrip.budget - tripStats.total).toLocaleString()} remaining
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-foreground/5">
               <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-3">Trip Breakdown</p>
               <div className="grid grid-cols-2 gap-3">
                 {Object.entries(tripStats.breakdown).map(([cat, amt]) => (
                   <div key={cat} className="flex justify-between items-center bg-background/50 p-3 rounded-2xl border border-foreground/5">
                      <span className="text-[10px] font-bold text-foreground/60">{cat}</span>
                      <span className="text-[10px] font-bold text-primary">{currency}{amt.toLocaleString()}</span>
                   </div>
                 ))}
               </div>
            </div>

            <button
              onClick={() => setShowEndTripConfirm(true)}
              className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold text-xs uppercase tracking-widest active:bg-red-500/20 transition-colors"
            >
              Terminate Trip
            </button>
          </div>
        </motion.div>
      )}

      {/* Hero Card - Lifetime Wealth */}
      <motion.div whileTap={{ scale: 0.98 }} className="bg-primary p-8 rounded-[48px] text-primary-foreground shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-primary-foreground/50 font-bold uppercase tracking-[0.3em] text-[10px] mb-3">Total Net Outflow</p>
          <div className="text-6xl font-bold flex items-baseline tracking-tighter">
            <span className="text-3xl mr-1 font-light opacity-60">{currency}</span>
            {(stats.total || 0).toLocaleString()}
          </div>

          {budgetEnabled && (
            <div className="mt-10 pt-8 border-t border-white/10 flex justify-between">
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase opacity-50 text-white/70">Safe Daily</p>
                <p className="text-xl font-bold">{currency}{smartDailyBudget}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[9px] font-bold uppercase opacity-50 text-white/70">Remaining</p>
                <p className="text-xl font-bold">{daysRemaining}d</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">Today</p>
          <div className="text-2xl font-bold tracking-tight">{currency}{(stats.today || 0).toLocaleString()}</div>
        </div>
        <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 space-y-1">
          <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest">Month</p>
          <div className="text-2xl font-bold tracking-tight">{currency}{(stats.month || 0).toLocaleString()}</div>
        </div>
      </div>

      <SpendingChart expenses={expenses} currency={currency} />

      {/* Allocation / Ledger Switcher */}
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center px-2">
          <div className="flex bg-foreground/5 p-1 rounded-2xl border border-foreground/5">
            <button
              onClick={() => setViewMode('categories')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'categories' ? 'bg-background text-primary shadow-sm' : 'text-foreground/30 hover:text-foreground/60'}`}
            >
              <PieChart className="w-3 h-3" />
              Allocation
            </button>
            <button
              onClick={() => setViewMode('ledger')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'ledger' ? 'bg-background text-primary shadow-sm' : 'text-foreground/30 hover:text-foreground/60'}`}
            >
              <History className="w-3 h-3" />
              Ledger
            </button>
          </div>
          {viewMode === 'ledger' && (
             <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase tracking-widest">
               {expenses.length} Records
             </div>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {viewMode === 'categories' ? (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {Object.entries(categoryBreakdown).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
                  <div key={cat} className="rounded-[40px] border border-foreground/5 bg-foreground/3 overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)} className="w-full p-6 flex items-center justify-between active:bg-foreground/5 transition-colors text-left">
                      <div className="flex flex-col items-start gap-2">
                        <span className="font-bold text-base tracking-tight">{cat}</span>
                        <div className="h-1.5 w-24 bg-foreground/10 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${((data.total || 0) / (stats.month || 1)) * 100}%` }} className="h-full bg-primary/60" />
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="font-bold text-primary text-base">{currency}{(data.total || 0).toLocaleString()}</div>
                        <ChevronRight className={`w-4 h-4 text-foreground/20 transition-transform ${expandedCategory === cat ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedCategory === cat && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-3 pb-4 space-y-3 bg-foreground/5 border-t border-foreground/5 overflow-hidden">
                          <div className="pt-2" />
                          {data.items.map((item) => (
                            <SwipeableItem
                              key={item.id}
                              onDelete={() => handleDelete(item.id)}
                            >
                              <div className="flex flex-col gap-1">
                                <div className="font-bold text-sm text-foreground/80 leading-tight truncate max-w-[150px]">{item.note || 'General Entry'}</div>
                                <div className="text-[9px] font-semibold text-foreground/20 uppercase tracking-widest">{formatIST(item.resolvedDate, 'MMM d • h:mm a')}</div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="font-bold text-sm text-foreground/60">{currency}{convertAmount(item.amount, item.currencyCode || 'INR').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                {item.currencyCode && item.currencyCode !== currencyCode && (
                                  <div className="text-[8px] opacity-30 font-bold">{item.currency}{item.amount}</div>
                                )}
                              </div>
                            </SwipeableItem>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                {Object.keys(categoryBreakdown).length === 0 && (
                  <div className="text-center py-20 bg-foreground/3 rounded-[40px] border border-dashed border-foreground/10">
                    <TrendingUp className="w-10 h-10 text-foreground/10 mx-auto mb-4" />
                    <p className="text-foreground/30 font-medium text-sm">No assets recorded this month</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="ledger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase bg-primary/5 px-4 py-2 rounded-full w-fit mb-2">
                   <Info className="w-3 h-3" />
                   <span>Swipe left to reveal delete</span>
                </div>
                {expenses.map((item) => {
                  const date = parseSafeDate(item.timestamp || item.dateIST);
                  return (
                    <SwipeableItem
                      key={item.id}
                      onDelete={() => handleDelete(item.id)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <div className="px-1.5 py-0.5 rounded-md bg-foreground/5 text-[8px] font-black text-foreground/40 uppercase tracking-tighter">{item.category}</div>
                           <div className="font-bold text-sm text-foreground/80 leading-tight truncate max-w-[120px]">{item.note || 'General Entry'}</div>
                        </div>
                        <div className="text-[9px] font-semibold text-foreground/20 uppercase tracking-widest">{formatIST(date, 'MMM d • h:mm a')}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-sm text-foreground/60">{currency}{convertAmount(item.amount, item.currencyCode || 'INR').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                        {item.currencyCode && item.currencyCode !== currencyCode && (
                          <div className="text-[8px] opacity-30 font-bold">{item.currency}{item.amount}</div>
                        )}
                      </div>
                    </SwipeableItem>
                  );
                })}
                {expenses.length === 0 && (
                  <div className="text-center py-20 bg-foreground/3 rounded-[40px] border border-dashed border-foreground/10">
                    <TrendingUp className="w-10 h-10 text-foreground/10 mx-auto mb-4" />
                    <p className="text-foreground/30 font-medium text-sm">Vault Archive is empty</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showEndTripConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-background w-full max-w-sm rounded-[56px] p-10 border border-foreground/5 relative overflow-hidden text-center space-y-10">
               <div className="absolute -left-10 -top-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
               <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center text-red-500 mx-auto shadow-inner"><X className="w-10 h-10" /></div>
               <div className="space-y-3">
                 <h3 className="text-3xl font-bold font-display tracking-tight">End Adventure?</h3>
                 <p className="text-foreground/40 text-sm font-medium">This will finalize your trip and move all records to history.</p>
               </div>
               <div className="grid grid-cols-1 gap-3">
                 <button
                  onClick={() => {
                    endTrip(tripStats.total);
                    setShowEndTripConfirm(false);
                  }}
                  className="w-full py-5 bg-red-500 text-white rounded-[24px] font-bold shadow-2xl shadow-red-500/20 active:scale-95 transition-transform"
                 >
                   Terminate & Save
                 </button>
                 <button onClick={() => setShowEndTripConfirm(false)} className="w-full py-5 bg-foreground/5 text-foreground/40 rounded-[24px] font-bold active:bg-foreground/10 transition-colors">
                   Continue Trip
                 </button>
               </div>
            </motion.div>
          </motion.div>
        )}

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
