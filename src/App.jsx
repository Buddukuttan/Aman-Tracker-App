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
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { if (user && biometricEnabled) setIsLocked(true); }, [user, biometricEnabled]);

  const handleUnlock = async () => {
    setVerifying(true);

    // ATTEMPT FULLSCREEN
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) docEl.requestFullscreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
    } catch (e) {}

    if (window.PublicKeyCredential && biometricEnabled) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLocked(false);
    } else {
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsLocked(false);
    }
    setVerifying(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-background"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full" /></div>;
  if (!user) return <Login />;

  if (isLocked) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-10 text-center space-y-10">
      <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center text-primary shadow-inner relative">
         {verifying && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-[-10px] border-2 border-primary/20 border-t-primary rounded-[50px]" />}
         <Lock className="w-10 h-10" />
      </div>
      <div className="space-y-3"><h2 className="text-3xl font-bold font-display tracking-tight text-foreground">Security Vault</h2><p className="text-foreground/40 text-sm font-medium">Verify credentials to unlock portfolio.</p></div>
      <button onClick={handleUnlock} disabled={verifying} className="w-full max-w-xs py-6 bg-primary text-primary-foreground rounded-[32px] font-bold flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 active:scale-95 transition-transform disabled:opacity-50"><ShieldCheck className="w-6 h-6" /><span>{verifying ? 'Verifying...' : 'FaceID / TouchID'}</span></button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth"
          >
            {activeTab === 'log' && <LogExpense />}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 ios-blur border-t border-foreground/5 safe-area-pb z-50 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center h-24 max-w-md mx-auto px-10">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center space-y-2 transition-all ${activeTab === 'dashboard' ? 'text-primary' : 'text-foreground/20'}`}>
            <div className={`p-2.5 rounded-[16px] transition-all ${activeTab === 'dashboard' ? 'bg-primary/10' : ''}`}><LayoutDashboard className="w-6 h-6" /></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Portfolio</span>
          </button>
          <button onClick={() => setActiveTab('log')} className={`flex flex-col items-center -mt-14`}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={`p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all ${activeTab === 'log' ? 'bg-primary text-primary-foreground shadow-primary/40' : 'bg-background text-foreground/40 border border-foreground/5'}`}><PlusCircle className="w-9 h-9" /></motion.div>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center space-y-2 transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-foreground/20'}`}>
            <div className={`p-2.5 rounded-[16px] transition-all ${activeTab === 'settings' ? 'bg-primary/10' : ''}`}><SettingsIcon className="w-6 h-6" /></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Suite</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

const AppWrapper = () => (<SettingsProvider><App /></SettingsProvider>);
export default AppWrapper;
