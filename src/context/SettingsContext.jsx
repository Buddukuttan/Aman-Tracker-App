import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Other'];
const DEFAULT_QUICK_AMOUNTS = [100, 200, 500, 1000];

export const SettingsProvider = ({ children }) => {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('kaching_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [quickAmounts, setQuickAmounts] = useState(() => {
    const saved = localStorage.getItem('kaching_quick_amounts');
    return saved ? JSON.parse(saved) : DEFAULT_QUICK_AMOUNTS;
  });

  const [colorScheme, setColorScheme] = useState(() => {
    return localStorage.getItem('kaching_colorScheme') || 'qatar';
  });

  const [budgetEnabled, setBudgetEnabled] = useState(() => {
    return localStorage.getItem('kaching_budgetEnabled') === 'true';
  });

  const [dailyBudget, setDailyBudget] = useState(() => {
    const saved = localStorage.getItem('kaching_dailyBudget');
    return saved ? Number(saved) : 500;
  });

  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    return localStorage.getItem('kaching_biometricEnabled') === 'true';
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('kaching_currency') || '₹';
  });

  const [currencyCode, setCurrencyCode] = useState(() => {
    return localStorage.getItem('kaching_currencyCode') || 'INR';
  });

  const [exchangeRates, setExchangeRates] = useState({});

  const [travelMode, setTravelMode] = useState(() => {
    return localStorage.getItem('kaching_travelMode') === 'true';
  });

  const [currentTrip, setCurrentTrip] = useState(() => {
    const saved = localStorage.getItem('kaching_currentTrip');
    return saved ? JSON.parse(saved) : null;
  });

  const { user } = useAuth();
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(() => {
    return localStorage.getItem('kaching_isLocallyEnrolled') === 'true';
  });

  const [trips, setTrips] = useState(() => {
    const saved = localStorage.getItem('kaching_trips');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const checkBiometrics = async () => {
      if (user) {
        try {
          console.log("Checking biometric enrollment for:", user.uid);
          const credentialDoc = await getDoc(doc(db, "biometric_credentials", user.uid));
          const exists = credentialDoc.exists();
          setIsBiometricEnrolled(exists);
          localStorage.setItem('kaching_isLocallyEnrolled', exists);
          console.log("Biometric enrollment status:", exists);
        } catch (e) {
          console.error("Failed to check biometrics:", e);
        }
      } else {
        setIsBiometricEnrolled(false);
        localStorage.removeItem('kaching_isLocallyEnrolled');
      }
    };
    checkBiometrics();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('kaching_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('kaching_quick_amounts', JSON.stringify(quickAmounts));
  }, [quickAmounts]);

  useEffect(() => {
    localStorage.setItem('kaching_colorScheme', colorScheme);
    document.documentElement.setAttribute('data-theme', colorScheme);

    // Exact mapping of theme background colors for meta tag and body background
    const themeColors = {
      qatar: '#1d0a0e',
      onyx: '#000000',
      emerald: '#0d1a14',
      nordic: '#1a202c',
      champagne: '#f8fafc'
    };

    const targetColor = themeColors[colorScheme] || themeColors.qatar;

    // Update meta tags for both standard and apple-specific behaviors
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', targetColor);

    // Dynamic Status Bar Style for iOS
    let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaAppleStatus) {
      // Use 'default' (dark icons) for light themes, 'black-translucent' (white icons) for dark themes
      metaAppleStatus.setAttribute('content', colorScheme === 'champagne' ? 'default' : 'black-translucent');
    }

    // Apply background color to everything that might be visible behind the app
    document.documentElement.style.backgroundColor = targetColor;
    document.body.style.backgroundColor = targetColor;

    const root = document.getElementById('root');
    if (root) root.style.backgroundColor = targetColor;
  }, [colorScheme]);

  useEffect(() => {
    localStorage.setItem('kaching_budgetEnabled', budgetEnabled);
  }, [budgetEnabled]);

  useEffect(() => {
    localStorage.setItem('kaching_dailyBudget', dailyBudget.toString());
  }, [dailyBudget]);

  useEffect(() => {
    localStorage.setItem('kaching_biometricEnabled', biometricEnabled);
  }, [biometricEnabled]);

  useEffect(() => {
    localStorage.setItem('kaching_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('kaching_currencyCode', currencyCode);
  }, [currencyCode]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${currencyCode}`);
        const data = await res.json();
        if (data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (e) {
        console.error("Failed to fetch exchange rates:", e);
      }
    };
    fetchRates();
  }, [currencyCode]);

  useEffect(() => {
    localStorage.setItem('kaching_travelMode', travelMode);
  }, [travelMode]);

  useEffect(() => {
    localStorage.setItem('kaching_currentTrip', JSON.stringify(currentTrip));
  }, [currentTrip]);

  useEffect(() => {
    localStorage.setItem('kaching_trips', JSON.stringify(trips));
  }, [trips]);

  // Force sync between travelMode and currentTrip
  useEffect(() => {
    if (currentTrip && !travelMode) setTravelMode(true);
    if (!currentTrip && travelMode) setTravelMode(false);
  }, [currentTrip, travelMode]);

  const startTrip = useCallback((name, budget) => {
    const newTrip = {
      id: Date.now().toString(),
      name,
      budget: budget ? Number(budget) : null,
      startDate: new Date().toISOString(),
    };
    setCurrentTrip(newTrip);
    setTravelMode(true);
  }, []);

  const endTrip = useCallback((totalSpent) => {
    setCurrentTrip(prev => {
      if (prev) {
        const completedTrip = {
          ...prev,
          endDate: new Date().toISOString(),
          totalSpent: Number(totalSpent) || 0
        };
        setTrips(all => {
          if (all.some(t => t.id === completedTrip.id)) return all;
          return [completedTrip, ...all];
        });
      }
      return null;
    });
    setTravelMode(false);
    localStorage.removeItem('kaching_currentTrip');
  }, []);

  const deleteTrip = useCallback((id) => {
    setTrips(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCategory = useCallback((name) => {
    if (name) {
      setCategories(prev => prev.includes(name) ? prev : [...prev, name]);
    }
  }, []);

  const removeCategory = useCallback((name) => {
    setCategories(prev => prev.length > 1 ? prev.filter(c => c !== name) : prev);
  }, []);

  const updateQuickAmount = useCallback((index, amount) => {
    setQuickAmounts(prev => {
      const next = [...prev];
      next[index] = Number(amount);
      return next;
    });
  }, []);

  const convertAmount = useCallback((amount, fromCode) => {
    if (!fromCode || fromCode === currencyCode) return amount;
    const rate = exchangeRates[fromCode];
    if (rate) {
      return amount / rate;
    }
    return amount;
  }, [currencyCode, exchangeRates]);

  const value = React.useMemo(() => ({
    categories, addCategory, removeCategory, setCategories,
    quickAmounts, updateQuickAmount,
    colorScheme, setColorScheme,
    budgetEnabled, setBudgetEnabled,
    dailyBudget, setDailyBudget,
    biometricEnabled, setBiometricEnabled,
    isBiometricEnrolled, setIsBiometricEnrolled,
    currency, setCurrency,
    currencyCode, setCurrencyCode,
    exchangeRates, convertAmount,
    travelMode, setTravelMode,
    currentTrip, startTrip, endTrip,
    trips, deleteTrip
  }), [
    categories, addCategory, removeCategory, setCategories,
    quickAmounts, updateQuickAmount,
    colorScheme, setColorScheme,
    budgetEnabled, setBudgetEnabled,
    dailyBudget, setDailyBudget,
    biometricEnabled, setBiometricEnabled,
    isBiometricEnrolled, setIsBiometricEnrolled,
    currency, setCurrency,
    currencyCode, setCurrencyCode,
    exchangeRates, convertAmount,
    travelMode, setTravelMode,
    currentTrip, startTrip, endTrip,
    trips, deleteTrip
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
