import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { formatIST } from '../lib/utils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Plus, Trash2, Download, BookOpen,
  ChevronRight, X, Smartphone, Fingerprint, Edit2, Check,
  Palette, Target, Wallet, Globe, ShieldCheck, Coins
} from 'lucide-react';

const Settings = () => {
  const { logout, user } = useAuth();
  const {
    categories, addCategory, removeCategory, setCategories,
    quickAmounts, updateQuickAmount,
    colorScheme, setColorScheme,
    budgetEnabled, setBudgetEnabled,
    dailyBudget, setDailyBudget,
    biometricEnabled, setBiometricEnabled,
    currency, setCurrency
  } = useSettings();

  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [exporting, setExporting] = useState(false);

  const luxuryThemes = [
    { id: 'qatar', name: 'Qatar Airways', colors: ['#4b0d1a', '#c4a46d'] },
    { id: 'onyx', name: 'Midnight Onyx', colors: ['#000000', '#ffd700'] },
    { id: 'emerald', name: 'Royal Emerald', colors: ['#064e3b', '#d1d5db'] },
    { id: 'nordic', name: 'Nordic Slate', colors: ['#1e293b', '#fb923c'] },
    { id: 'champagne', name: 'Champagne', colors: ['#f8fafc', '#9f1239'] }
  ];

  const handleDetectCurrency = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {
        setCurrency('$');
        alert("Currency updated to $ (Simulated)");
      });
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      let totalSum = 0;
      const data = snapshot.docs.map((doc, index) => {
        const d = doc.data();
        const date = d.timestamp?.toDate() || (d.dateIST ? new Date(d.dateIST) : new Date());
        const amt = Number(d.amount) || 0;
        totalSum += amt;
        return {
          'Sl. No.': snapshot.docs.length - index,
          'Note': d.note || '-',
          'Category': d.category || 'Other',
          'Amount': amt,
          'Currency': d.currency || '₹',
          'Date': formatIST(date, 'yyyy-MM-dd'),
          'Time': formatIST(date, 'HH:mm:ss')
        };
      });

      const wb = XLSX.utils.book_new();

      // Add Summary Row to Master Sheet
      const masterWithTotal = [...data, {}, { 'Note': 'TOTAL EXPENDITURE', 'Amount': totalSum }];
      const ws = XLSX.utils.json_to_sheet(masterWithTotal);
      XLSX.utils.book_append_sheet(wb, ws, "Master Portfolio");

      const categoriesInEntries = [...new Set(data.map(item => item.Category))];
      categoriesInEntries.forEach(cat => {
        const catData = data.filter(item => item.Category === cat);
        const catSum = catData.reduce((acc, curr) => acc + curr.Amount, 0);
        const catWithTotal = [...catData, {}, { 'Note': `TOTAL ${cat.toUpperCase()}`, 'Amount': catSum }];
        const catWs = XLSX.utils.json_to_sheet(catWithTotal);
        XLSX.utils.book_append_sheet(wb, catWs, cat.substring(0, 31));
      });

      XLSX.writeFile(wb, `Wealth_Portfolio_${formatIST(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      alert("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleRename = (oldName) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== oldName) setCategories(categories.map(c => c === oldName ? trimmed : c));
    setEditingCategory(null); setEditValue('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full max-w-md mx-auto p-6 pt-12 space-y-10 pb-80">
      <header>
        <p className="text-foreground/30 font-bold text-[10px] uppercase tracking-widest mb-1">CONFIGURATION</p>
        <h1 className="text-4xl font-bold font-display tracking-tight">Luxury Suite</h1>
      </header>

      {/* Theme Section */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Appearance</h2>
        <div className="bg-foreground/5 rounded-[32px] overflow-hidden border border-foreground/5">
          {luxuryThemes.map((theme, i) => (
            <button key={theme.id} onClick={() => setColorScheme(theme.id)} className={`w-full flex items-center justify-between p-6 transition-all border-b border-foreground/5 last:border-0 active:bg-foreground/5 ${colorScheme === theme.id ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-1.5">
                  <div className="w-5 h-5 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: theme.colors[0] }} />
                  <div className="w-5 h-5 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: theme.colors[1] }} />
                </div>
                <span className={`font-bold ${colorScheme === theme.id ? 'text-primary' : 'text-foreground/80'}`}>{theme.name}</span>
              </div>
              {colorScheme === theme.id && <Check className="w-5 h-5 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      {/* Security & Currency Group */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Security & Locale</h2>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setBiometricEnabled(!biometricEnabled)} className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 flex flex-col items-center gap-3 active:scale-95 transition-all">
            <div className={`p-3 rounded-2xl ${biometricEnabled ? 'bg-primary text-primary-foreground' : 'bg-foreground/10 text-foreground/40'}`}><ShieldCheck className="w-6 h-6" /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{biometricEnabled ? 'FaceID ON' : 'Security OFF'}</span>
          </button>
          <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 flex flex-col items-center gap-3">
             <button onClick={handleDetectCurrency} className="p-3 rounded-2xl bg-foreground/10 text-primary active:scale-90 transition-transform"><Globe className="w-6 h-6" /></button>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Unit</span>
                <input type="text" maxLength={1} value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-8 bg-transparent text-center font-bold text-lg outline-none" />
             </div>
          </div>
        </div>
      </section>

      {/* Smart Budget Card */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Intelligence</h2>
        <div className="bg-foreground/5 p-8 rounded-[40px] border border-foreground/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-2xl text-primary"><Wallet className="w-6 h-6" /></div><span className="font-bold">Smart Budget</span></div>
            <button onClick={() => setBudgetEnabled(!budgetEnabled)} className={`w-14 h-7 rounded-full transition-all relative ${budgetEnabled ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-foreground/20'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${budgetEnabled ? 'left-8' : 'left-1'}`} /></button>
          </div>
          {budgetEnabled && (
            <div className="space-y-3">
              <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="w-full bg-background/50 rounded-2xl py-5 px-8 font-bold outline-none ring-1 ring-foreground/10 focus:ring-primary text-2xl text-center" />
              <p className="text-[9px] text-foreground/20 font-bold uppercase tracking-[0.3em] text-center">Standard Daily Pool</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Amount Configuration */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Coins className="w-3.5 h-3.5" /> Quick Entry Values</h2>
        <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5">
          <div className="grid grid-cols-2 gap-4">
            {quickAmounts.map((amt, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest text-center">Slot {i + 1}</p>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground/20">{currency}</span>
                   <input
                     type="number"
                     value={amt}
                     onChange={(e) => updateQuickAmount(i, e.target.value)}
                     className="w-full bg-background/40 rounded-2xl py-4 px-8 font-bold text-center outline-none ring-1 ring-foreground/5 focus:ring-primary text-sm"
                   />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Group */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Asset Categories</h2>
        <div className="bg-foreground/5 rounded-[32px] overflow-hidden border border-foreground/5">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center justify-between p-5 border-b border-foreground/5 last:border-0 group">
              {editingCategory === cat ? (
                <div className="flex-1 flex items-center gap-3"><input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(cat)} onKeyDown={(e) => e.key === 'Enter' && handleRename(cat)} className="flex-1 bg-background px-4 py-2 rounded-xl outline-none ring-2 ring-primary" /><button onClick={() => handleRename(cat)} className="text-primary"><Check className="w-6 h-6" /></button></div>
              ) : (
                <><span className="font-bold text-foreground/80 ml-2">{cat}</span><div className="flex gap-2"><button onClick={() => { setEditingCategory(cat); setEditValue(cat); }} className="p-3 text-foreground/20 active:text-primary"><Edit2 className="w-4 h-4" /></button>{categories.length > 1 && <button onClick={() => removeCategory(cat)} className="p-3 text-red-500/20 active:text-red-500"><Trash2 className="w-4 h-4" /></button>}</div></>
              )}
            </div>
          ))}
          <div className="p-4 bg-background/30"><div className="flex gap-3"><input type="text" placeholder="New Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 bg-background rounded-2xl py-4 px-6 outline-none border border-foreground/5 font-medium" /><button onClick={() => { if (newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory(''); } }} className="bg-primary text-primary-foreground p-4 rounded-2xl active:scale-95 transition-all"><Plus className="w-6 h-6" /></button></div></div>
        </div>
      </section>

      {/* Export & Out */}
      <section className="space-y-4 pt-4 pb-40">
        <button onClick={handleExport} disabled={exporting} className="w-full flex items-center justify-between bg-primary/5 p-6 rounded-[32px] font-bold active:bg-primary/10 transition-all border border-primary/10 text-primary">
          <div className="flex items-center gap-4"><Download className="w-6 h-6" />Export Report</div>
          <ChevronRight className="w-5 h-5 opacity-40" />
        </button>
        <button onClick={logout} className="w-full flex items-center justify-between bg-red-500/5 p-6 rounded-[32px] font-bold text-red-500 active:bg-red-500/10 transition-all border border-red-500/10">
          <div className="flex items-center gap-4"><LogOut className="w-6 h-6" />Terminate Session</div>
        </button>
      </section>
    </motion.div>
  );
};

export default Settings;
