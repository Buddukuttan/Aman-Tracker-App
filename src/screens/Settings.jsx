import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { formatIST } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { currencies } from '../lib/currencies';
import { registerBiometrics, unregisterBiometrics, isWebAuthnSupported } from '../lib/webauthn';
import {
  LogOut, Plus, Trash2, Download, BookOpen, Search,
  ChevronRight, X, Smartphone, Fingerprint, Edit2, Check,
  Palette, Target, Wallet, Globe, ShieldCheck, Coins, HelpCircle, Briefcase, History
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
    isBiometricEnrolled, setIsBiometricEnrolled,
    currency, setCurrency,
    currencyCode, setCurrencyCode,
    convertAmount,
    travelMode, setTravelMode,
    currentTrip, startTrip, endTrip,
    trips, deleteTrip
  } = useSettings();

  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [exporting, setExporting] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripName, setTripName] = useState('');
  const [tripBudget, setTripBudget] = useState('');
  const [showTravelHistory, setShowTravelHistory] = useState(false);
  const [registeringBiometrics, setRegisteringBiometrics] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportData, setReportData] = useState({ expenses: [], total: 0, breakdown: {} });

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

  const filteredCurrencies = currencies.filter(c =>
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const prepareReportData = async (tripId = null) => {
    if (!user) return;
    setExporting(true);
    try {
      let q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredData = tripId ? rawData.filter(d => d.tripId === tripId) : rawData;

      if (filteredData.length === 0) {
        alert("No expenses found for this report.");
        return;
      }

      let totalSum = 0;
      const breakdown = {};

      const processedExpenses = filteredData.map(d => {
        let date;
        try {
          date = d.timestamp?.toDate ? d.timestamp.toDate() : (d.dateIST ? new Date(d.dateIST) : new Date());
          if (isNaN(date.getTime())) date = new Date();
        } catch (e) {
          date = new Date();
        }

        const originalAmt = Number(d.amount) || 0;
        const amt = convertAmount(originalAmt, d.currencyCode || 'INR');
        totalSum += amt;

        if (d.category) {
          breakdown[d.category] = (breakdown[d.category] || 0) + amt;
        }

        return { ...d, resolvedDate: date, resolvedAmount: amt };
      });

      setReportData({
        expenses: processedExpenses,
        total: totalSum,
        breakdown,
        tripTitle: tripId ? filteredData[0]?.tripName : null
      });
      setShowReportPreview(true);
    } catch (e) {
      console.error(e);
      alert("Failed to prepare report.");
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    const { expenses, total, tripTitle } = reportData;
    const data = expenses.map((d, index) => ({
      'Sl. No.': expenses.length - index,
      'Note': d.note || '-',
      'Category': d.category || 'Other',
      'Amount': d.resolvedAmount,
      'Currency': currency,
      'Original Amount': d.amount,
      'Original Currency': d.currency || '₹',
      'Date': formatIST(d.resolvedDate, 'yyyy-MM-dd'),
      'Time': formatIST(d.resolvedDate, 'HH:mm:ss')
    }));

    const wb = XLSX.utils.book_new();
    const masterWithTotal = [...data, {}, { 'Note': 'TOTAL EXPENDITURE', 'Amount': total }];
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

    const fileName = tripTitle ? `Trip_${tripTitle}_${formatIST(new Date(), 'yyyy-MM-dd')}.xlsx` : `Wealth_Portfolio_${formatIST(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('report-content');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: window.getComputedStyle(element).backgroundColor
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // If it's too long, it might need more than one page, but for a summary we'll keep it simple
    // and maybe just let it be a bit longer than A4 if needed, or scale it.
    // Standard A4 is 210 x 297mm.

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Wealth_Report_${formatIST(new Date(), 'yyyy-MM-dd')}.pdf`);
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

        <div className="bg-foreground/5 rounded-[32px] p-6 border border-foreground/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${biometricEnabled ? 'bg-primary text-primary-foreground' : 'bg-foreground/10 text-foreground/40'}`}><ShieldCheck className="w-6 h-6" /></div>
              <div>
                <p className="font-bold">Biometric Lock</p>
                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">{biometricEnabled ? 'Active' : 'Disabled'}</p>
              </div>
            </div>
            <button
              onClick={() => setBiometricEnabled(!biometricEnabled)}
              className={`w-14 h-8 rounded-full relative transition-colors ${biometricEnabled ? 'bg-primary' : 'bg-foreground/20'}`}
            >
              <motion.div animate={{ x: biometricEnabled ? 24 : 4 }} className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm" />
            </button>
          </div>

          {biometricEnabled && (
            <div className="pt-4 border-t border-foreground/5">
              {!isWebAuthnSupported() ? (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl flex items-center gap-3">
                  <X className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Unsupported (Use Safari/HTTPS)</span>
                </div>
              ) : !isBiometricEnrolled ? (
                <button
                  disabled={registeringBiometrics}
                  onClick={async () => {
                    setRegisteringBiometrics(true);
                    try {
                      await registerBiometrics(user);
                      setIsBiometricEnrolled(true);
                    } catch (e) {
                      alert("Enrollment failed: " + (e.message || "Unknown error"));
                    } finally {
                      setRegisteringBiometrics(false);
                    }
                  }}
                  className="w-full py-4 bg-primary/10 text-primary rounded-2xl font-bold text-xs uppercase tracking-widest active:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4" />
                  {registeringBiometrics ? 'Opening Scanner...' : 'Register FaceID / TouchID'}
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                   <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-2xl flex items-center gap-3">
                      <Check className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Device Enrolled</span>
                   </div>
                   <button
                    onClick={async () => {
                      if (confirm("Remove biometric enrollment from this device?")) {
                        await unregisterBiometrics(user);
                        setIsBiometricEnrolled(false);
                      }
                    }}
                    className="text-[10px] font-bold text-red-500/40 uppercase tracking-widest text-center"
                   >
                     Unregister Device
                   </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => setShowCurrencyModal(true)} className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 flex items-center justify-between active:scale-[0.98] transition-all">
             <div className="p-3 rounded-2xl bg-foreground/10 text-primary"><Globe className="w-6 h-6" /></div>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Unit</span>
                <span className="font-bold text-lg">{currency}</span>
             </div>
          </button>
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

      {/* Travel Mode Section */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Travel Mode</h2>
        <div className="bg-foreground/5 rounded-[32px] overflow-hidden border border-foreground/5">
          <div className="p-6 flex items-center justify-between border-b border-foreground/5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${travelMode ? 'bg-primary text-primary-foreground' : 'bg-foreground/10 text-foreground/40'}`}><Briefcase className="w-6 h-6" /></div>
              <div>
                <p className="font-bold">Travel Mode</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">{travelMode ? currentTrip?.name : 'Inactive'}</p>
                  {travelMode && currentTrip && (
                    <button onClick={(e) => { e.stopPropagation(); prepareReportData(currentTrip.id); }} className="text-primary active:scale-90 transition-transform">
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (travelMode) {
                   // End trip logic moved to Dashboard but can be here too
                   // For now, toggle off just disables it if no active trip,
                   // or we can show the modal to start a trip
                   if (currentTrip) {
                      // Already has trip, maybe we just want to disable it?
                      // Actually requirement says "when toggle this on 2 pop ups open"
                   }
                } else {
                  setShowTripModal(true);
                }
              }}
              className={`w-14 h-8 rounded-full relative transition-colors ${travelMode ? 'bg-primary' : 'bg-foreground/20'}`}
            >
              <motion.div animate={{ x: travelMode ? 24 : 4 }} className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm" />
            </button>
          </div>
          <button onClick={() => setShowTravelHistory(true)} className="w-full flex items-center justify-between p-6 active:bg-foreground/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-foreground/10 text-foreground/40"><History className="w-6 h-6" /></div>
              <span className="font-bold">Travel History</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-40" />
          </button>
        </div>
      </section>

      {/* Guides & System */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] ml-2 text-foreground/40 flex items-center gap-2"><HelpCircle className="w-3.5 h-3.5" /> Guides & System</h2>
        <div className="space-y-3">
          <button onClick={() => setActiveTutorial('pwa')} className="w-full flex items-center justify-between bg-foreground/5 p-6 rounded-[32px] font-bold active:bg-foreground/10 transition-all border border-foreground/5"><div className="flex items-center gap-4"><Smartphone className="w-6 h-6 text-primary" />Home Screen</div><ChevronRight className="w-5 h-5 opacity-40" /></button>
          <button onClick={() => setActiveTutorial('backtap')} className="w-full flex items-center justify-between bg-foreground/5 p-6 rounded-[32px] font-bold active:bg-foreground/10 transition-all border border-foreground/5"><div className="flex items-center gap-4"><Fingerprint className="w-6 h-6 text-primary" />Back Tap</div><ChevronRight className="w-5 h-5 opacity-40" /></button>
          <button onClick={() => prepareReportData()} disabled={exporting} className="w-full flex items-center justify-between bg-primary/5 p-6 rounded-[32px] font-bold active:bg-primary/10 transition-all border border-primary/10 text-primary"><div className="flex items-center gap-4"><Download className="w-6 h-6" />{exporting ? 'Preparing...' : 'Export Report'}</div><ChevronRight className="w-5 h-5 opacity-40" /></button>
          <button onClick={logout} className="w-full flex items-center justify-between bg-red-500/5 p-6 rounded-[32px] font-bold text-red-500 active:bg-red-500/10 border border-red-500/10"><div className="flex items-center gap-4"><LogOut className="w-6 h-6" />Terminate Session</div></button>
        </div>
      </section>

      {/* Currency Modal */}
      <AnimatePresence>
        {showCurrencyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-background w-full max-w-sm rounded-[48px] p-8 space-y-6 relative max-h-[80vh] overflow-hidden flex flex-col border border-foreground/5">
              <button onClick={() => setShowCurrencyModal(false)} className="absolute right-6 top-6 p-2 bg-foreground/5 rounded-full"><X className="w-5 h-5" /></button>
              <h3 className="text-2xl font-bold font-display pt-2 text-center">Select Currency</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                  type="text"
                  placeholder="Search currencies..."
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  className="w-full bg-foreground/5 rounded-2xl py-4 pl-12 pr-4 outline-none border border-foreground/5 font-medium"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar px-1">
                {filteredCurrencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrency(c.symbol);
                      setCurrencyCode(c.code);
                      setShowCurrencyModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${currencyCode === c.code ? 'bg-primary/10 text-primary' : 'active:bg-foreground/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 font-bold text-center text-lg">{c.symbol}</span>
                      <div className="text-left">
                        <p className="font-bold text-sm">{c.code}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">{c.name}</p>
                      </div>
                    </div>
                    {currency === c.symbol && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Trip Modal */}
      <AnimatePresence>
        {showTripModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-background w-full max-w-sm rounded-[48px] p-10 space-y-8 relative border border-foreground/5">
              <button onClick={() => setShowTripModal(false)} className="absolute right-8 top-8 p-3 bg-foreground/5 rounded-full"><X className="w-5 h-5" /></button>
              <div className="text-center space-y-2 pt-4">
                <h3 className="text-3xl font-bold font-display">New Adventure</h3>
                <p className="text-foreground/40 text-sm">Where are you heading today?</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-4 text-foreground/40">Trip Name</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Paris Summer"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    className="w-full bg-foreground/5 rounded-[24px] py-6 px-8 outline-none border border-foreground/5 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest ml-4 text-foreground/40">Optional Budget ({currency})</label>
                  <input
                    type="number"
                    placeholder="Set a limit..."
                    value={tripBudget}
                    onChange={(e) => setTripBudget(e.target.value)}
                    className="w-full bg-foreground/5 rounded-[24px] py-6 px-8 outline-none border border-foreground/5 font-bold"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (tripName.trim()) {
                    startTrip(tripName.trim(), tripBudget);
                    setShowTripModal(false);
                    setTripName('');
                    setTripBudget('');
                  }
                }}
                disabled={!tripName.trim()}
                className="w-full py-6 bg-primary text-primary-foreground rounded-[24px] font-bold shadow-2xl disabled:opacity-50"
              >
                Launch Trip
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Travel History Modal */}
      <AnimatePresence>
        {showTravelHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-background w-full max-w-sm rounded-[48px] p-8 space-y-6 relative max-h-[80vh] overflow-hidden flex flex-col border border-foreground/5">
              <button onClick={() => setShowTravelHistory(false)} className="absolute right-6 top-6 p-2 bg-foreground/5 rounded-full"><X className="w-5 h-5" /></button>
              <h3 className="text-2xl font-bold font-display pt-2 text-center">Past Adventures</h3>
              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar px-1">
                {trips.length === 0 ? (
                  <div className="text-center py-20 text-foreground/20">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">No trips recorded yet</p>
                  </div>
                ) : (
                  trips.map((trip) => (
                    <div key={trip.id} className="bg-foreground/5 p-6 rounded-[32px] border border-foreground/5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{trip.name}</h4>
                          <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">{formatIST(new Date(trip.startDate), 'MMM d, yyyy')}</p>
                        </div>
                        <button onClick={() => prepareReportData(trip.id)} className="p-3 bg-primary/10 text-primary rounded-2xl active:scale-90 transition-transform">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <p className="text-[8px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Spent</p>
                            <p className="font-bold">{currency}{trip.totalSpent?.toLocaleString() || 0}</p>
                         </div>
                         {trip.budget && (
                           <div className="space-y-1">
                              <p className="text-[8px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Budget</p>
                              <p className="font-bold">{currency}{trip.budget?.toLocaleString()}</p>
                           </div>
                         )}
                      </div>
                      <button onClick={() => deleteTrip(trip.id)} className="text-[9px] font-bold text-red-500 uppercase tracking-widest self-end">Delete Records</button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showReportPreview && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex flex-col p-4 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-6 pt-safe">
             <button onClick={() => setShowReportPreview(false)} className="p-3 bg-foreground/10 rounded-full text-foreground"><X className="w-6 h-6" /></button>
             <div className="flex gap-2">
                <button onClick={exportToExcel} className="p-3 bg-primary/10 rounded-full text-primary flex items-center gap-2 font-bold text-xs"><Download className="w-4 h-4" /> EXCEL</button>
                <button onClick={exportToPDF} className="p-3 bg-primary rounded-full text-primary-foreground flex items-center gap-2 font-bold text-xs"><Download className="w-4 h-4" /> PDF</button>
             </div>
          </div>

          <div id="report-content" className="bg-background rounded-[48px] p-8 space-y-10 border border-foreground/5 shadow-2xl overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -left-20 bottom-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

            <div className="relative space-y-4">
               <p className="text-primary font-bold tracking-[0.4em] text-[10px] uppercase">Wealth Report • {formatIST(new Date(), 'MMM yyyy')}</p>
               <h2 className="text-5xl font-bold font-display tracking-tighter leading-none text-foreground">
                 {reportData.tripTitle ? reportData.tripTitle : 'Total Portfolio'}
               </h2>
               <div className="h-1 w-20 bg-primary rounded-full" />
            </div>

            <div className="grid grid-cols-1 gap-8 relative">
               <div className="space-y-1">
                 <p className="text-foreground/30 font-bold uppercase tracking-widest text-[10px]">Net Outflow</p>
                 <div className="text-6xl font-bold tracking-tighter text-foreground flex items-baseline">
                   <span className="text-2xl mr-1 opacity-40">{currency}</span>
                   {reportData.total.toLocaleString()}
                 </div>
               </div>

               <div className="space-y-4">
                 <p className="text-foreground/30 font-bold uppercase tracking-widest text-[10px]">Spending Trend</p>
                 <div className="flex items-end justify-between h-20 gap-2 px-2 pt-4">
                    {(() => {
                      const trend = {};
                      reportData.expenses.slice(0, 30).forEach(exp => {
                        const day = formatIST(exp.resolvedDate, 'EEE');
                        trend[day] = (trend[day] || 0) + exp.resolvedAmount;
                      });
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      const maxTrend = Math.max(...Object.values(trend), 1);
                      return days.map(day => (
                        <div key={day} className="flex-1 flex flex-col items-center gap-2">
                           <div className="w-full bg-primary/10 rounded-full h-12 flex items-end overflow-hidden">
                              <div className="w-full bg-primary" style={{ height: `${((trend[day] || 0) / maxTrend) * 100}%` }} />
                           </div>
                           <span className="text-[8px] font-black text-foreground/20 uppercase">{day}</span>
                        </div>
                      ));
                    })()}
                 </div>
               </div>

               <div className="space-y-4">
                 <p className="text-foreground/30 font-bold uppercase tracking-widest text-[10px]">Allocation Breakdown</p>
                 <div className="space-y-3">
                   {Object.entries(reportData.breakdown).sort((a,b) => b[1] - a[1]).map(([cat, amt]) => (
                     <div key={cat} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                           <span className="text-foreground/60">{cat}</span>
                           <span className="text-primary">{currency}{amt.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${(amt / reportData.total) * 100}%` }} />
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>

            <div className="space-y-4 relative">
               <p className="text-foreground/30 font-bold uppercase tracking-widest text-[10px]">Recent Activity</p>
               <div className="space-y-4">
                 {reportData.expenses.slice(0, 10).map((exp, i) => (
                   <div key={i} className="flex justify-between items-center pb-4 border-b border-foreground/5 last:border-0">
                      <div className="space-y-0.5">
                         <p className="font-bold text-sm text-foreground/80">{exp.note || 'General'}</p>
                         <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">{formatIST(exp.resolvedDate, 'MMM d')}</p>
                      </div>
                      <div className="text-right">
                         <p className="font-bold text-sm text-foreground/60">{currency}{exp.resolvedAmount.toLocaleString()}</p>
                         <p className="text-[8px] font-black text-primary/40 uppercase tracking-tighter">{exp.category}</p>
                      </div>
                   </div>
                 ))}
                 {reportData.expenses.length > 10 && (
                   <p className="text-center text-[10px] font-bold text-foreground/20 uppercase tracking-widest pt-2">+ {reportData.expenses.length - 10} more transactions</p>
                 )}
               </div>
            </div>

            <div className="pt-10 border-t border-foreground/5 flex justify-between items-center opacity-30">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs">K</div>
                  <span className="font-black tracking-tighter text-sm italic">Ka-Ching!</span>
               </div>
               <p className="text-[8px] font-bold uppercase tracking-widest">Confidential Wealth Summary</p>
            </div>
          </div>
          <div className="h-20" />
        </div>
      )}

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
