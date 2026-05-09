import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    localStorage.setItem('kaching_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('kaching_quick_amounts', JSON.stringify(quickAmounts));
  }, [quickAmounts]);

  useEffect(() => {
    localStorage.setItem('kaching_colorScheme', colorScheme);
    document.documentElement.setAttribute('data-theme', colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    localStorage.setItem('kaching_budgetEnabled', budgetEnabled);
  }, [budgetEnabled]);

  useEffect(() => {
    localStorage.setItem('kaching_dailyBudget', dailyBudget.toString());
  }, [dailyBudget]);

  const addCategory = (name) => {
    if (name && !categories.includes(name)) setCategories([...categories, name]);
  };

  const removeCategory = (name) => {
    if (categories.length > 1) setCategories(categories.filter(c => c !== name));
  };

  const updateQuickAmount = (index, amount) => {
    const newAmounts = [...quickAmounts];
    newAmounts[index] = Number(amount);
    setQuickAmounts(newAmounts);
  };

  const value = {
    categories, addCategory, removeCategory, setCategories,
    quickAmounts, updateQuickAmount,
    colorScheme, setColorScheme,
    budgetEnabled, setBudgetEnabled,
    dailyBudget, setDailyBudget
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
