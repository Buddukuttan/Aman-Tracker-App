import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfDay, subDays, isSameDay, startOfWeek, subWeeks, isSameWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

import { useSettings } from '../context/SettingsContext';
import { parseSafeDate } from '../lib/utils';

const SpendingChart = ({ expenses, currency }) => {
  const { convertAmount } = useSettings();
  const [view, setView] = useState('daily'); // 'daily' or 'weekly'

  const chartData = useMemo(() => {
    const now = toZonedTime(new Date(), IST_TIMEZONE);

    if (view === 'daily') {
      // Last 7 days
      return Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(now, 6 - i);
        const dayName = format(date, 'EEE');
        const dayStart = startOfDay(date);

        const total = expenses.reduce((acc, exp) => {
          const expDate = parseSafeDate(exp.timestamp || exp.dateIST);
          if (isSameDay(startOfDay(expDate), dayStart)) {
            return acc + convertAmount(Number(exp.amount) || 0, exp.currencyCode || 'INR');
          }
          return acc;
        }, 0);

        return { label: dayName, value: total };
      }).reverse();
    } else {
      // Last 4 weeks
      return Array.from({ length: 4 }).map((_, i) => {
        const date = subWeeks(now, 3 - i);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        const label = i === 3 ? 'This Week' : `Wk ${format(weekStart, 'd')}`;

        const total = expenses.reduce((acc, exp) => {
          const expDate = parseSafeDate(exp.timestamp || exp.dateIST);
          if (isSameWeek(expDate, weekStart, { weekStartsOn: 1 })) {
            return acc + convertAmount(Number(exp.amount) || 0, exp.currencyCode || 'INR');
          }
          return acc;
        }, 0);

        return { label, value: total };
      }).reverse();
    }
  }, [expenses, view]);

  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="bg-foreground/5 rounded-[40px] p-8 border border-foreground/5 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/40">Spending Trend</h3>
        <div className="flex bg-background/50 p-1 rounded-2xl border border-foreground/5">
          <button
            onClick={() => setView('daily')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${view === 'daily' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground/40'}`}
          >
            DAILY
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${view === 'weekly' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground/40'}`}
          >
            WEEKLY
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between h-32 gap-2 pt-2">
        {chartData.slice().reverse().map((data, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
            <div className="relative w-full flex justify-center items-end h-24">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(data.value / maxVal) * 100}%` }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="w-full max-w-[12px] bg-primary rounded-full relative"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {currency}{data.value.toLocaleString()}
                </div>
              </motion.div>
            </div>
            <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-tighter">{data.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpendingChart;
