import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import LogExpense from './screens/LogExpense';
import Dashboard from './screens/Dashboard';
import Settings from './screens/Settings';
import Login from './screens/Login';
import { PlusCircle, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('log');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'log' && <LogExpense />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-foreground/5 safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-foreground/30'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`flex flex-col items-center -mt-8 transition-transform active:scale-90`}
          >
            <div className={`p-4 rounded-full shadow-lg ${activeTab === 'log' ? 'bg-primary text-white shadow-primary/40' : 'bg-foreground/10 text-foreground/40'}`}>
              <PlusCircle className="w-8 h-8" />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-foreground/30'}`}
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Setup</span>
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
