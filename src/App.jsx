import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import LogExpense from './screens/LogExpense';
import Dashboard from './screens/Dashboard';
import Settings from './screens/Settings';
import Login from './screens/Login';
import { PlusCircle, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('log');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <Login />;
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-foreground/5 safe-area-pb z-40">
        <div className="flex justify-around items-center h-20 max-w-md mx-auto px-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'dashboard' ? 'text-primary' : 'text-foreground/20 hover:text-foreground/40'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary/10' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Insight</span>
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`flex flex-col items-center -mt-10 group`}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-5 rounded-[24px] shadow-2xl transition-all ${activeTab === 'log' ? 'bg-primary text-white shadow-primary/40' : 'bg-white dark:bg-zinc-800 text-foreground/40 shadow-xl border border-foreground/5'}`}
            >
              <PlusCircle className="w-8 h-8" />
            </motion.div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-foreground/20 hover:text-foreground/40'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-primary/10' : ''}`}>
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Setup</span>
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
