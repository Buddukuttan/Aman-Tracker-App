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
  Palette, Target, Wallet, Globe, ShieldCheck
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
      const data = snapshot.docs.map((doc, index) => {
        const d = doc.data();
        const date = d.timestamp?.toDate() || (d.dateIST ? new Date(d.dateIST) : new Date());
        return {
          'Sl. No.': snapshot.docs.length - index,
          'Note': d.note || '-',
          'Category': d.category || 'Other',
          'Amount': d.amount || 0,
          'Currency': d.currency || '₹',
          'Date': formatIST(date, 'yyyy-MM-dd'),
          'Time': formatIST(date, 'HH:mm:ss')
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Master Portfolio");

      const categoriesInEntries = [...new Set(data.map(item => item.Category))];
      categoriesInEntries.forEach(cat => {
        const catData = data.filter(item => item.Category === cat);
        const catWs = XLSX.utils.json_to_sheet(catData);
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
    setEditingCategory(null);
    setEditValue('');
  };

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-8 pb-32">
      <header><h1 className="text-3xl font-bold font-display tracking-tight">Luxury Suite</h1></header>

      {/* Theme */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Palette className="w-3 h-3" /> Visual Theme</h2>
        <div className="grid grid-cols-1 gap-2">
          {luxuryThemes.map((theme) => (
            <button key={theme.id} onClick={() => setColorScheme(theme.id)} className={`flex items-center justify-between p-4 rounded-[20px] transition-all border-2 ${colorScheme === theme.id ? 'border-primary bg-primary/5' : 'border-foreground/5 bg-foreground/5 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <div className="w-4 h-4 rounded-full border border-background shadow-sm" style={{ backgroundColor: theme.colors[0] }} />
                  <div className="w-4 h-4 rounded-full border border-background shadow-sm" style={{ backgroundColor: theme.colors[1] }} />
                </div>
                <span className={`font-bold text-sm ${colorScheme === theme.id ? 'text-primary' : ''}`}>{theme.name}</span>
              </div>
              {colorScheme === theme.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Security & Jetsetter */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-foreground/5 p-4 rounded-[24px] space-y-3 border border-foreground/5">
          <div className="flex items-center gap-2 text-primary"><ShieldCheck className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">FaceID Lock</span></div>
          <button onClick={() => setBiometricEnabled(!biometricEnabled)} className={`w-full py-2 rounded-xl font-bold text-[10px] ${biometricEnabled ? 'bg-primary text-primary-foreground' : 'bg-foreground/10 text-foreground/40'}`}>
            {biometricEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
        <div className="bg-foreground/5 p-4 rounded-[24px] space-y-3 border border-foreground/5">
          <div className="flex items-center gap-2 text-primary"><Globe className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Jetsetter Mode</span></div>
          <div className="flex gap-2">
            <button onClick={handleDetectCurrency} className="flex-1 bg-foreground/10 p-2 rounded-xl text-lg flex items-center justify-center transition-transform active:scale-90">{currency}</button>
            <input type="text" maxLength={1} value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-10 bg-background rounded-xl text-center font-bold text-sm outline-none ring-1 ring-foreground/10 focus:ring-primary" />
          </div>
        </div>
      </div>

      {/* Daily Budget */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Target className="w-3 h-3" /> Dynamic Allocation</h2>
        <div className="bg-foreground/5 p-6 rounded-[32px] space-y-5 border border-foreground/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl"><Wallet className="w-5 h-5 text-primary" /></div><span className="font-bold">Daily Budget</span></div>
            <button onClick={() => setBudgetEnabled(!budgetEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${budgetEnabled ? 'bg-primary' : 'bg-foreground/20'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${budgetEnabled ? 'left-7' : 'left-1'}`} /></button>
          </div>
          {budgetEnabled && <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="w-full bg-background/50 rounded-2xl py-4 px-6 font-bold outline-none ring-1 ring-foreground/5 focus:ring-primary text-xl" />}
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1">Log Pre-sets</h2>
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((amt, i) => (
            <input key={i} type="number" value={amt} onChange={(e) => updateQuickAmount(i, e.target.value)} className="bg-foreground/5 rounded-xl py-3 font-bold text-center outline-none focus:ring-2 ring-primary/50 text-xs border border-foreground/5" />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1">Asset Classes</h2>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center justify-between bg-foreground/5 p-4 rounded-2xl border border-foreground/5 group">
              {editingCategory === cat ? (
                <div className="flex-1 flex items-center gap-2">
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(cat)} onKeyDown={(e) => e.key === 'Enter' && handleRename(cat)} className="flex-1 bg-background px-3 py-2 rounded-xl outline-none ring-1 ring-primary" />
                  <button onClick={() => handleRename(cat)} className="text-primary"><Check className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <span className="font-bold">{cat}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCategory(cat); setEditValue(cat); }} className="p-2 text-foreground/30 active:text-primary"><Edit2 className="w-4 h-4" /></button>
                    {categories.length > 1 && <button onClick={() => removeCategory(cat)} className="p-2 text-red-500/30 active:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input type="text" placeholder="Add Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 bg-foreground/5 rounded-2xl py-4 px-6 outline-none focus:ring-2 ring-primary/50" />
            <button onClick={() => { if (newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory(''); } }} className="bg-primary text-primary-foreground p-4 rounded-2xl active:scale-95 transition-transform"><Plus className="w-6 h-6" /></button>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 pb-20">
        <button onClick={() => setActiveTutorial('pwa')} className="w-full flex items-center justify-between bg-foreground/5 p-5 rounded-3xl font-bold active:bg-foreground/10 transition-colors"><div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-primary" />Tutorial: Home Screen</div><ChevronRight className="w-5 h-5 text-foreground/20" /></button>
        <button onClick={() => setActiveTutorial('backtap')} className="w-full flex items-center justify-between bg-foreground/5 p-5 rounded-3xl font-bold active:bg-foreground/10 transition-colors"><div className="flex items-center gap-3"><Fingerprint className="w-5 h-5 text-primary" />Tutorial: Back Tap</div><ChevronRight className="w-5 h-5 text-foreground/20" /></button>
        <button onClick={handleExport} disabled={exporting} className="w-full flex items-center justify-between bg-foreground/5 p-5 rounded-3xl font-bold active:bg-foreground/10 disabled:opacity-50 transition-colors"><div className="flex items-center gap-3"><Download className="w-5 h-5 text-primary" />Export Data</div><ChevronRight className="w-5 h-5 text-foreground/20" /></button>
        <button onClick={logout} className="w-full flex items-center justify-between bg-red-500/10 p-5 rounded-3xl font-bold text-red-500 active:bg-red-500/20 transition-colors"><div className="flex items-center gap-3"><LogOut className="w-5 h-5" />Sign Out</div></button>
      </div>

      {activeTutorial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-background w-full max-w-sm rounded-[40px] p-8 space-y-6 relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setActiveTutorial(null)} className="absolute right-6 top-6 p-2 bg-foreground/5 rounded-full"><X className="w-5 h-5" /></button>
            <h3 className="text-2xl font-bold font-display pt-2">{tutorials[activeTutorial].title}</h3>
            <div className="space-y-4">
              {tutorials[activeTutorial].steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{i + 1}</div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-foreground/80 leading-snug">{step.text}</p>
                    {step.icon && <div className="w-fit p-3 bg-foreground/5 rounded-2xl text-primary">{step.icon}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTutorial(null)} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold mt-4">Got it!</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Settings;
