import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { formatIST } from '../lib/utils';
import * as XLSX from 'xlsx';
import {
  LogOut,
  Moon,
  Sun,
  Plus,
  Trash2,
  Download,
  BookOpen,
  ChevronRight,
  X,
  Smartphone,
  Fingerprint,
  Edit2,
  Check
} from 'lucide-react';

const Settings = () => {
  const { logout } = useAuth();
  const {
    categories, addCategory, removeCategory, setCategories,
    quickAmounts, updateQuickAmount,
    darkMode, setDarkMode
  } = useSettings();

  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [exporting, setExporting] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(null);

  const { user } = useAuth();

  const handleExport = async () => {
    setExporting(true);
    try {
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc, index) => {
        const d = doc.data();
        const date = d.timestamp?.toDate() || new Date(d.dateIST);
        return {
          'Sl. No.': snapshot.docs.length - index,
          'Note': d.note || '-',
          'Category': d.category,
          'Amount (₹)': d.amount,
          'Date': formatIST(date, 'yyyy-MM-dd'),
          'Time': formatIST(date, 'HH:mm:ss')
        };
      });

      const wb = XLSX.utils.book_new();

      // Master Sheet
      const wsMaster = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, wsMaster, 'Master Sheet');

      // Sheet per category
      const categoriesInEntries = [...new Set(data.map(item => item.Category))];
      categoriesInEntries.forEach(cat => {
        const catData = data.filter(item => item.Category === cat);
        const wsCat = XLSX.utils.json_to_sheet(catData);
        XLSX.utils.book_append_sheet(wb, wsCat, cat);
      });

      XLSX.writeFile(wb, `KaChing_Expenses_${formatIST(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleRename = (oldName) => {
    if (editValue && editValue !== oldName) {
      const newCategories = categories.map(c => c === oldName ? editValue : c);
      setCategories(newCategories);
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const tutorials = {
    pwa: {
      title: "Add to Home Screen",
      steps: [
        { icon: <Smartphone className="w-6 h-6" />, text: "Open the app in Safari on your iPhone" },
        { icon: <ChevronRight className="rotate-90 w-6 h-6" />, text: "Tap the Share button (box with upward arrow) at the bottom" },
        { icon: <Plus className="w-6 h-6" />, text: "Scroll down and tap 'Add to Home Screen'" },
        { icon: <Fingerprint className="w-6 h-6" />, text: "Give it a name and tap 'Add'" },
        { icon: <CheckCircleIcon />, text: "The app icon will now appear on your home screen" }
      ]
    },
    backtap: {
      title: "Set Up Back Tap Shortcut",
      steps: [
        { text: "First, make sure the app is added to your Home Screen" },
        { text: "Open the iPhone Shortcuts app" },
        { icon: <Plus className="w-6 h-6" />, text: "Tap the + button to create a new shortcut" },
        { text: "Tap 'Add Action', search for 'Open App', and select it" },
        { text: "Choose 'Ka-Ching' from the list" },
        { text: "Tap the shortcut name at the top and rename it (e.g. 'Log Expense')" },
        { text: "Tap Done" },
        { text: "Go to Settings → Accessibility → Touch → Back Tap" },
        { text: "Choose Double Tap or Triple Tap" },
        { text: "Select the shortcut you just created" },
        { text: "Done — tapping the back of your iPhone will now open the app!" }
      ]
    }
  };

  const CheckCircleIcon = () => (
    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</div>
  );

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 pt-12 space-y-8 pb-32">
      <h1 className="text-3xl font-bold font-display">Settings</h1>

      {/* Dark Mode Toggle */}
      <div className="bg-foreground/5 p-2 rounded-2xl flex">
        <button
          onClick={() => setDarkMode(false)}
          className={`flex-1 flex items-center justify-center py-3 space-x-2 rounded-xl transition-all ${!darkMode ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' : 'text-foreground/40'}`}
        >
          <Sun className="w-5 h-5" />
          <span className="font-bold">Light</span>
        </button>
        <button
          onClick={() => setDarkMode(true)}
          className={`flex-1 flex items-center justify-center py-3 space-x-2 rounded-xl transition-all ${darkMode ? 'bg-zinc-800 shadow-sm text-primary' : 'text-foreground/40'}`}
        >
          <Moon className="w-5 h-5" />
          <span className="font-bold">Dark</span>
        </button>
      </div>

      {/* Quick Amounts */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-widest ml-1">Quick Amounts (₹)</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickAmounts.map((amt, i) => (
            <div key={i} className="relative">
              <input
                type="number"
                value={amt}
                onChange={(e) => updateQuickAmount(i, e.target.value)}
                className="w-full bg-foreground/5 rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 ring-primary/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-widest ml-1">Categories</h2>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center justify-between bg-foreground/5 p-4 rounded-2xl">
              {editingCategory === cat ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleRename(cat)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(cat)}
                    className="flex-1 bg-white dark:bg-zinc-800 px-3 py-1 rounded-lg outline-none ring-1 ring-primary"
                  />
                  <button onClick={() => handleRename(cat)} className="text-primary"><Check className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <span className="font-bold">{cat}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setEditValue(cat);
                      }}
                      className="p-2 text-foreground/30 active:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {categories.length > 1 && (
                      <button
                        onClick={() => removeCategory(cat)}
                        className="p-2 text-red-500/30 active:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              placeholder="New Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-foreground/5 rounded-2xl py-4 px-6 outline-none focus:ring-2 ring-primary/50"
            />
            <button
              onClick={() => {
                addCategory(newCategory);
                setNewCategory('');
              }}
              className="bg-primary text-white p-4 rounded-2xl active:scale-95"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Tutorials & Export */}
      <div className="space-y-3 pt-4">
        <button
          onClick={() => setActiveTutorial('pwa')}
          className="w-full flex items-center justify-between bg-foreground/5 p-5 rounded-3xl font-bold active:bg-foreground/10"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            Tutorial: Add to Home Screen
          </div>
          <ChevronRight className="w-5 h-5 text-foreground/20" />
        </button>

        <button
          onClick={() => setActiveTutorial('backtap')}
          className="w-full flex items-center justify-between bg-foreground/5 p-5 rounded-3xl font-bold active:bg-foreground/10"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-primary" />
            Tutorial: Back Tap Shortcut
          </div>
          <ChevronRight className="w-5 h-5 text-foreground/20" />
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-between bg-foreground/5 p-5 rounded-3xl font-bold active:bg-foreground/10 disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-green-500" />
            {exporting ? 'Generating Excel...' : 'Export to Excel'}
          </div>
          <ChevronRight className="w-5 h-5 text-foreground/20" />
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-between bg-red-500/10 p-5 rounded-3xl font-bold text-red-500 active:bg-red-500/20"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            Sign Out
          </div>
        </button>
      </div>

      {/* Tutorial Modal */}
      {activeTutorial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-background w-full max-w-sm rounded-[40px] p-8 space-y-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setActiveTutorial(null)}
              className="absolute right-6 top-6 p-2 bg-foreground/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold font-display pt-2">
              {tutorials[activeTutorial].title}
            </h3>
            <div className="space-y-4">
              {tutorials[activeTutorial].steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-foreground/80 leading-snug">{step.text}</p>
                    {step.icon && (
                      <div className="w-fit p-3 bg-foreground/5 rounded-2xl text-primary">
                        {step.icon}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveTutorial(null)}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold mt-4"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
