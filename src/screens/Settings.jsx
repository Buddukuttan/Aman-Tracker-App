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
  Palette, Target, Wallet, Globe, ShieldCheck, Coins, HelpCircle
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
  const [activeTutorial, setActiveTutorial] = useState(null);

  const luxuryThemes = [
    { id: 'qatar', name: 'Qatar Airways', colors: ['#4b0d1a', '#c4a46d'] },
    { id: 'onyx', name: 'Midnight Onyx', colors: ['#000000', '#ffd700'] },
    { id: 'emerald', name: 'Royal Emerald', colors: ['#064e3b', '#d1d5db'] },
    { id: 'nordic', name: 'Nordic Slate', colors: ['#1e293b', '#fb923c'] },
    { id: 'champagne', name: 'Champagne', colors: ['#f8fafc', '#9f1239'] }
  ];

  const tutorials = {
    pwa: {
      title: "Add to Home Screen",
      steps: [
        { icon: <Smartphone className="w-6 h-6" />, text: "Open the app in Safari on your iPhone" },
        { icon: <ChevronRight className="rotate-90 w-6 h-6" />, text: "Tap the Share button at the bottom" },
        { icon: <Plus className="w-6 h-6" />, text: "Tap 'Add to Home Screen'" },
        { text: "Give it a name and tap 'Add'" }
      ]
    },
    backtap: {
      title: "Set Up Back Tap Shortcut",
      steps: [
        { text: "Open iPhone Shortcuts app" },
        { icon: <Plus className="w-6 h-6" />, text: "Create new 'Open App' shortcut" },
        { text: "Select 'Ka-Ching'" },
        { text: "Go to Settings → Accessibility → Touch → Back Tap" },
        { text: "Select your new shortcut" }
      ]
    }
  };

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
    } catch (e) { alert("Export failed."); } finally { setExporting(false); }
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

      {/* Security & Currency */}
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

      {/* Quick Values */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Coins className="w-3.5 h-3.5" /> Quick Entry Values</h2>
        <div className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5"><div className="grid grid-cols-2 gap-4">
          {quickAmounts.map((amt, i) => (
            <div key={i} className="space-y-1.5"><p className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest text-center">Slot {i + 1}</p><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground/20">{currency}</span><input type="number" value={amt} onChange={(e) => updateQuickAmount(i, e.target.value)} className="w-full bg-background/40 rounded-2xl py-4 px-8 font-bold text-center outline-none ring-1 ring-foreground/5 focus:ring-primary text-sm" /></div></div>
          ))}
        </div></div>
      </section>

      {/* Asset Classes */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Asset Categories</h2>
        <div className="bg-foreground/5 rounded-[32px] border border-foreground/5">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center justify-between p-5 border-b border-foreground/5 last:border-0">
              {editingCategory === cat ? (
                <div className="flex-1 flex items-center gap-3"><input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(cat)} onKeyDown={(e) => e.key === 'Enter' && handleRename(cat)} className="flex-1 bg-background px-4 py-2 rounded-xl outline-none ring-2 ring-primary" /><button onClick={() => handleRename(cat)} className="text-primary"><Check className="w-6 h-6" /></button></div>
              ) : (
                <><span className="font-bold text-foreground/80 ml-2">{cat}</span><div className="flex gap-2"><button onClick={() => { setEditingCategory(cat); setEditValue(cat); }} className="p-3 text-foreground/20 active:text-primary"><Edit2 className="w-4 h-4" /></button>{categories.length > 1 && <button onClick={() => removeCategory(cat)} className="p-3 text-red-500/20 active:text-red-500"><Trash2 className="w-4 h-4" /></button>}</div></>
              )}
            </div>
          ))}
          <div className="p-4"><div className="flex gap-3"><input type="text" placeholder="New Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 bg-background rounded-2xl py-4 px-6 outline-none border border-foreground/5 font-medium" /><button onClick={() => { if (newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory(''); } }} className="bg-primary text-primary-foreground p-4 rounded-2xl active:scale-95"><Plus className="w-6 h-6" /></button></div></div>
        </div>
      </section>

      {/* Guides & System */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><HelpCircle className="w-3.5 h-3.5" /> Guides & System</h2>
        <div className="space-y-3">
          <button onClick={() => setActiveTutorial('pwa')} className="w-full flex items-center justify-between bg-foreground/5 p-6 rounded-[32px] font-bold active:bg-foreground/10 transition-all border border-foreground/5"><div className="flex items-center gap-4"><Smartphone className="w-6 h-6 text-primary" />Home Screen</div><ChevronRight className="w-5 h-5 opacity-40" /></button>
          <button onClick={() => setActiveTutorial('backtap')} className="w-full flex items-center justify-between bg-foreground/5 p-6 rounded-[32px] font-bold active:bg-foreground/10 transition-all border border-foreground/5"><div className="flex items-center gap-4"><Fingerprint className="w-6 h-6 text-primary" />Back Tap</div><ChevronRight className="w-5 h-5 opacity-40" /></button>
          <button onClick={handleExport} disabled={exporting} className="w-full flex items-center justify-between bg-primary/5 p-6 rounded-[32px] font-bold active:bg-primary/10 transition-all border border-primary/10 text-primary"><div className="flex items-center gap-4"><Download className="w-6 h-6" />Export Report</div><ChevronRight className="w-5 h-5 opacity-40" /></button>
          <button onClick={logout} className="w-full flex items-center justify-between bg-red-500/5 p-6 rounded-[32px] font-bold text-red-500 active:bg-red-500/10 border border-red-500/10"><div className="flex items-center gap-4"><LogOut className="w-6 h-6" />Terminate Session</div></button>
        </div>
      </section>

      {activeTutorial && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
          <div className="bg-background w-full max-w-sm rounded-[48px] p-10 space-y-8 relative max-h-[85vh] overflow-y-auto border border-foreground/5">
            <button onClick={() => setActiveTutorial(null)} className="absolute right-8 top-8 p-3 bg-foreground/5 rounded-full"><X className="w-5 h-5" /></button>
            <h3 className="text-3xl font-bold font-display pt-4">{tutorials[activeTutorial].title}</h3>
            <div className="space-y-6">
              {tutorials[activeTutorial].steps.map((step, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">{i + 1}</div>
                  <div className="flex-1 space-y-3">
                    <p className="font-bold text-foreground/80 leading-tight">{step.text}</p>
                    {step.icon && <div className="w-fit p-4 bg-foreground/5 rounded-[24px] text-primary">{step.icon}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTutorial(null)} className="w-full py-5 bg-primary text-primary-foreground rounded-[24px] font-bold shadow-2xl">Confirm Guide</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Settings;
