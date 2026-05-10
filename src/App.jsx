import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import LogExpense from './screens/LogExpense';
import Dashboard from './screens/Dashboard';
import Settings from './screens/Settings';
import Login from './screens/Login';
import { PlusCircle, LayoutDashboard, Settings as SettingsIcon, ShieldCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { user, loading } = useAuth();
  const { biometricEnabled } = useSettings();
  const [activeTab, setActiveTab] = useState('log');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (user && biometricEnabled) {
      setIsLocked(true);
    }
  }, [user, biometricEnabled]);

  const handleUnlock = async () => {
    if (!window.PublicKeyCredential) {
      setIsLocked(false);
      return;
    }
    // Simple local-only "unlock" simulation as full WebAuthn needs server challenge
    // In a real app, we'd use a saved credential. For this PWA, we'll simulate the Biometric check.
    try {
      setIsLocked(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" />
      </div>
    );
  }

  if (!user) return <Login />;

  if (isLocked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-10 text-center space-y-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-display tracking-tight">Security Lock</h2>
          <p className="text-foreground/40 text-sm font-medium">Verify your identity to access <br/> your financial portfolio.</p>
        </div>
        <button
          onClick={handleUnlock}
          className="w-full max-w-xs py-5 bg-primary text-primary-foreground rounded-[24px] font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-transform"
        >
          <ShieldCheck className="w-6 h-6" />
          <span>Tap to Unlock</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 overflow-y-auto no-scrollbar"
          >
            {activeTab === 'log' && <LogExpense />}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-foreground/5 safe-area-pb z-40">
        <div className="flex justify-around items-center h-20 max-w-md mx-auto px-6">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'dashboard' ? 'text-primary' : 'text-foreground/20'}`}>
            <div className={`p-2 rounded-xl ${activeTab === 'dashboard' ? 'bg-primary/10' : ''}`}><LayoutDashboard className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Stats</span>
          </button>

          <button onClick={() => setActiveTab('log')} className={`flex flex-col items-center -mt-10 group`}>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`p-5 rounded-[24px] shadow-2xl transition-all ${activeTab === 'log' ? 'bg-primary text-primary-foreground' : 'bg-foreground/5 text-foreground/40 shadow-xl border border-foreground/5'}`}>
              <PlusCircle className="w-8 h-8" />
            </motion.div>
          </button>

          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-foreground/20'}`}>
            <div className={`p-2 rounded-xl ${activeTab === 'settings' ? 'bg-primary/10' : ''}`}><SettingsIcon className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Setup</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

const AppWrapper = () => (
  <SettingsProvider>
    <App />
  </SettingsProvider>
);

export default AppWrapper;
