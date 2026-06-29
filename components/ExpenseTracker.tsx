import React, { useState, useMemo, useEffect } from 'react';
import { AppData, ExpenseEntry } from '../types';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Calendar, Search, DollarSign, Tag, Settings2, X, Edit2, Check, ChevronDown, ChevronRight, Coins, Droplet, Fuel, Coffee, Shirt, Utensils, Sparkles, Activity, Flame, Loader2, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

interface ExpenseTrackerProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onUpdateExpense?: (expense: ExpenseEntry, isDelete?: boolean) => void;
}

const DEFAULT_CATEGORIES = ['Rice', 'Noodle', 'Water', 'Gasoline', 'Coffee', 'Tea', 'Clothes', 'Milk Shake', 'Food', 'Others'];

const isValidDate = (d: any): boolean => {
  if (!d) return false;
  const parsed = new Date(d);
  return !isNaN(parsed.getTime());
};

const safeFormatDate = (d: any, formatStr: string, fallback: string = 'N/A'): string => {
  if (!d) return fallback;
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return fallback;
    return format(parsed, formatStr);
  } catch (err) {
    return fallback;
  }
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ data, onUpdate, onUpdateExpense }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Range'>('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'KHR'>(data.settings?.currency || 'USD');
  const [showCategorySummary, setShowCategorySummary] = useState(true);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<'inputs' | 'chart'>('inputs');

  const EXCHANGE_RATE = data.settings?.exchangeRate || 4000;
  const categories = useMemo(() => {
    const raw = Array.isArray(data.expenseCategories) ? data.expenseCategories : DEFAULT_CATEGORIES;
    return raw.filter((c): c is string => typeof c === 'string' && !!c.trim());
  }, [data.expenseCategories]);
  const expenses = data.expenses || [];

  const [isManagingRecurring, setIsManagingRecurring] = useState(false);
  const [newRecurring, setNewRecurring] = useState({
    description: '',
    category: categories[0] || 'Others',
    amount: '',
    currency: 'USD' as 'USD' | 'KHR',
    dayOfMonth: 1
  });

  const [quickUSD, setQuickUSD] = useState('');
  const [quickKHR, setQuickKHR] = useState('');

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: categories[0] || 'Others',
    type: 'Expense' as 'Income' | 'Expense',
    currency: currencyMode
  });

  const handleQuickUSDChange = (val: string) => {
    setQuickUSD(val);
    if (val === '') {
      setQuickKHR('');
    } else {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setQuickKHR(Math.round(parsed * EXCHANGE_RATE).toString());
      }
    }
  };

  const handleQuickKHRChange = (val: string) => {
    setQuickKHR(val);
    if (val === '') {
      setQuickUSD('');
    } else {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setQuickUSD((Math.round((parsed / EXCHANGE_RATE) * 100) / 100).toString());
      }
    }
  };

  const handleAddRecurring = () => {
    if (!newRecurring.description || !newRecurring.amount) return;
    const amountNum = parseFloat(newRecurring.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newItem = {
      id: uuidv4(),
      description: newRecurring.description,
      category: newRecurring.category,
      amount: amountNum,
      currency: newRecurring.currency,
      dayOfMonth: Math.min(Math.max(1, newRecurring.dayOfMonth), 31),
      active: true
    };

    const currentRecurring = data.recurringExpenses || [];
    onUpdate({
      ...data,
      recurringExpenses: [...currentRecurring, newItem]
    });
    setNewRecurring({
      description: '',
      category: categories[0] || 'Others',
      amount: '',
      currency: 'USD',
      dayOfMonth: 1
    });
  };

  const handleDeleteRecurring = (id: string) => {
    onUpdate({
      ...data,
      recurringExpenses: (data.recurringExpenses || []).filter(item => item.id !== id)
    });
  };

  const getCategoryItemStyles = (category: string, isIncome: boolean) => {
    if (isIncome) {
      return {
        bg: 'bg-emerald-500/5 hover:bg-emerald-500/8 border-l-4 border-emerald-500 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15',
        text: 'text-emerald-950 dark:text-emerald-50',
        badge: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
      };
    }
    const cat = (category || '').toLowerCase().trim();
    if (cat.includes('rice')) {
      return {
        bg: 'bg-amber-500/5 hover:bg-amber-500/8 border-l-4 border-amber-500 dark:bg-amber-500/10 dark:hover:bg-amber-500/15',
        text: 'text-amber-950 dark:text-amber-50',
        badge: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
      };
    }
    if (cat.includes('noodle')) {
      return {
        bg: 'bg-orange-500/5 hover:bg-orange-500/8 border-l-4 border-orange-500 dark:bg-orange-505/10 dark:hover:bg-orange-505/15',
        text: 'text-orange-955 dark:text-orange-50',
        badge: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
      };
    }
    if (cat.includes('water')) {
      return {
        bg: 'bg-sky-500/5 hover:bg-sky-500/8 border-l-4 border-sky-500 dark:bg-sky-500/10 dark:hover:bg-sky-500/15',
        text: 'text-sky-955 dark:text-sky-50',
        badge: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
      };
    }
    if (cat.includes('gas') || cat.includes('fuel') || cat.includes('gasoline')) {
      return {
        bg: 'bg-blue-500/5 hover:bg-blue-500/8 border-l-4 border-blue-500 dark:bg-blue-500/10 dark:hover:bg-blue-500/15',
        text: 'text-blue-955 dark:text-blue-50',
        badge: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
      };
    }
    if (cat.includes('coffee')) {
      return {
        bg: 'bg-rose-900/5 hover:bg-rose-900/8 border-l-4 border-rose-800 dark:bg-rose-900/10 dark:hover:bg-rose-900/15',
        text: 'text-rose-955 dark:text-rose-50',
        badge: 'bg-rose-900/10 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300'
      };
    }
    if (cat.includes('tea')) {
      return {
        bg: 'bg-lime-500/5 hover:bg-lime-500/8 border-l-4 border-lime-500 dark:bg-lime-500/10 dark:hover:bg-lime-500/15',
        text: 'text-lime-955 dark:text-lime-50',
        badge: 'bg-lime-500/10 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300'
      };
    }
    if (cat.includes('clothes') || cat.includes('shirt')) {
      return {
        bg: 'bg-indigo-500/5 hover:bg-indigo-500/8 border-l-4 border-indigo-500 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15',
        text: 'text-indigo-955 dark:text-indigo-50',
        badge: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
      };
    }
    if (cat.includes('milk')) {
      return {
        bg: 'bg-purple-500/5 hover:bg-purple-500/8 border-l-4 border-purple-500 dark:bg-purple-500/10 dark:hover:bg-purple-500/15',
        text: 'text-purple-955 dark:text-purple-50',
        badge: 'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
      };
    }
    if (cat.includes('food')) {
      return {
        bg: 'bg-pink-500/5 hover:bg-pink-500/8 border-l-4 border-pink-500 dark:bg-pink-500/10 dark:hover:bg-pink-500/15',
        text: 'text-pink-955 dark:text-pink-50',
        badge: 'bg-pink-500/10 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'
      };
    }
    return {
      bg: 'bg-slate-500/5 hover:bg-slate-500/8 border-l-4 border-slate-500 dark:bg-slate-500/10 dark:hover:bg-slate-500/15',
      text: 'text-slate-950 dark:text-slate-50',
      badge: 'bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-350'
    };
  };

  useEffect(() => {
    const recurringList = data.recurringExpenses || [];
    if (recurringList.length === 0) return;
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthStr = format(today, 'yyyy-MM');
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const pendingToLog = recurringList.filter(item => {
      const loggedThisMonth = item.lastLoggedDate && typeof item.lastLoggedDate === 'string' && item.lastLoggedDate.startsWith(currentMonthStr);
      return currentDay >= item.dayOfMonth && !loggedThisMonth && item.active !== false;
    });
    
    if (pendingToLog.length === 0) return;
    
    const newEntries: ExpenseEntry[] = [];
    const updatedRecurring = recurringList.map(item => {
      const loggedThisMonth = item.lastLoggedDate && typeof item.lastLoggedDate === 'string' && item.lastLoggedDate.startsWith(currentMonthStr);
      if (currentDay >= item.dayOfMonth && !loggedThisMonth && item.active !== false) {
        const newEntry: ExpenseEntry = {
          id: uuidv4(),
          date: todayStr,
          description: `${item.description} (Auto-Recurring)`,
          category: item.category,
          amount: item.amount,
          type: 'Expense',
          currency: item.currency,
          notes: 'Automatically generated monthly cost'
        };
        newEntries.push(newEntry);
        
        if (onUpdateExpense) {
          onUpdateExpense(newEntry);
        }
        
        return {
          ...item,
          lastLoggedDate: todayStr
        };
      }
      return item;
    });
    
    onUpdate({
      ...data,
      expenses: [...newEntries, ...expenses],
      recurringExpenses: updatedRecurring
    });
  }, [data.recurringExpenses]);

  useEffect(() => {
    if (data.settings?.currency) {
      setCurrencyMode(data.settings.currency);
    }
  }, [data.settings?.currency]);

  useEffect(() => {
    setNewExpense(prev => ({
      ...prev,
      currency: currencyMode
    }));
  }, [currencyMode]);

  const quickAmounts = [
    { label: '3000R', amount: 3000, currency: 'KHR' },
    { label: '4000R', amount: 4000, currency: 'KHR' },
    { label: '5000R', amount: 5000, currency: 'KHR' },
    { label: '10,000R', amount: 10000, currency: 'KHR' },
    { label: '$1', amount: 1, currency: 'USD' },
    { label: '$2', amount: 2, currency: 'USD' },
  ];

  // Get common amounts for specific category from history
  const getCategorySuggestions = (category: string) => {
    if (!category || typeof category !== 'string') return [];
    const categoryLower = category.toLowerCase();
    const historical = expenses
      .filter(e => e && e.category && typeof e.category === 'string' && e.category.toLowerCase() === categoryLower)
      .map(e => ({ amount: e.amount, currency: e.currency }));
    
    // Count frequency
    const counts: Record<string, number> = {};
    historical.forEach(h => {
      const key = `${h.amount}-${h.currency}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => {
        const [amount, currency] = key.split('-');
        return { amount: parseFloat(amount), currency: currency as 'USD' | 'KHR' };
      });
  };

  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);

  // Enhanced auto-suggestion lookup table of historical category assignments
  const historicalDescriptionToCategoryMap = useMemo(() => {
    const lookup: Record<string, Record<string, number>> = {};
    expenses.forEach(e => {
      if (e && e.type === 'Expense' && e.description && e.category) {
        const descKey = e.description.trim().toLowerCase();
        if (!lookup[descKey]) {
          lookup[descKey] = {};
        }
        lookup[descKey][e.category] = (lookup[descKey][e.category] || 0) + 1;
      }
    });

    // Resolve the most frequent category for each description match
    const finalMap: Record<string, string> = {};
    for (const [descKey, catCounts] of Object.entries(lookup)) {
      let maxCount = 0;
      let topCategory = '';
      for (const [cat, count] of Object.entries(catCounts)) {
        if (count > maxCount) {
          maxCount = count;
          topCategory = cat;
        }
      }
      if (topCategory) {
        finalMap[descKey] = topCategory;
      }
    }
    return finalMap;
  }, [expenses]);

  const getSuggestedCategory = (desc: string): string | null => {
    if (!desc || desc.trim().length === 0) return null;
    const cleanDesc = desc.trim().toLowerCase();

    // 1. Exact match from our historical category assignment lookup table
    if (historicalDescriptionToCategoryMap[cleanDesc] && categories.includes(historicalDescriptionToCategoryMap[cleanDesc])) {
      return historicalDescriptionToCategoryMap[cleanDesc];
    }

    // 2. Word-by-word historical fallback match: split by spaces and check if any individual word matches a description in history
    const wordsInDesc = cleanDesc.split(/\s+/);
    for (const word of wordsInDesc) {
      if (word.length >= 2 && historicalDescriptionToCategoryMap[word] && categories.includes(historicalDescriptionToCategoryMap[word])) {
        return historicalDescriptionToCategoryMap[word];
      }
    }

    // 3. Try to find a partial or substring match in our historical lookup table
    const partialDescMatch = Object.keys(historicalDescriptionToCategoryMap).find(key => 
      key.includes(cleanDesc) || cleanDesc.includes(key)
    );
    if (partialDescMatch && categories.includes(historicalDescriptionToCategoryMap[partialDescMatch])) {
      return historicalDescriptionToCategoryMap[partialDescMatch];
    }

    // 4. Predefined smart keyword fallback mapping
    const ruleMappings: Record<string, string[]> = {
      'Rice': ['rice', 'cooked rice', 'bai', 'pork rice', 'chicken rice'],
      'Noodle': ['noodle', 'ramen', 'soup', 'mee', 'kuy teav', 'pad thai'],
      'Water': ['water', 'vital', 'dasani', 'evian', 'aquafina', 'ice'],
      'Gasoline': ['gasoline', 'gas', 'fuel', 'diesel', 'petrol', 'refuel', 'moto', 'car', 'taxi'],
      'Coffee': ['coffee', 'cappuccino', 'latte', 'espresso', 'starbucks', 'cafe', 'macha', 'americano', 'brown coffee'],
      'Tea': ['tea', 'green tea', 'lemon tea', 'matcha'],
      'Clothes': ['clothes', 'shirt', 'pants', 'shoes', 'jacket', 't-shirt', 'jean', 'dress', 'shop', 'skirt'],
      'Milk Shake': ['milk', 'shake', 'boba', 'bubble tea', 'yogurt'],
      'Food': ['food', 'snack', 'bread', 'cake', 'pizza', 'burger', 'kfc', 'lunch', 'dinner', 'restaurant', 'meal', 'fruit', 'apple', 'banana', 'coconut']
    };

    for (const [cat, words] of Object.entries(ruleMappings)) {
      const targetCat = categories.find(c => c && typeof c === 'string' && c.toLowerCase() === cat.toLowerCase());
      if (targetCat) {
        if (words.some(word => cleanDesc.includes(word))) {
          return targetCat;
        }
      }
    }

    return null;
  };

  const categorySuggestions = useMemo(() => {
    if (!newExpense.category) return [];
    return getCategorySuggestions(newExpense.category);
  }, [newExpense.category, expenses]);

  const getCategoryIcon = (catName: string): React.ReactNode => {
    if (!catName || typeof catName !== 'string') return <Tag size={15} className="text-slate-400" />;
    const clean = catName.toLowerCase().trim();
    if (clean.includes('rice')) return <Utensils size={15} className="text-amber-500" />;
    if (clean.includes('noodle')) return <Flame size={15} className="text-orange-500" />;
    if (clean.includes('water')) return <Droplet size={15} className="text-sky-500" />;
    if (clean.includes('gasoline') || clean.includes('fuel')) return <Fuel size={15} className="text-red-500" />;
    if (clean.includes('coffee') || clean.includes('latte')) return <Coffee size={15} className="text-amber-850" />;
    if (clean.includes('tea')) return <Coffee size={15} className="text-emerald-500" />;
    if (clean.includes('clothes') || clean.includes('shirt')) return <Shirt size={15} className="text-indigo-500" />;
    if (clean.includes('milk')) return <Activity size={15} className="text-rose-400" />;
    if (clean.includes('food')) return <Utensils size={15} className="text-green-500" />;
    return <Tag size={15} className="text-slate-400" />;
  };

  // Dynamic suggestions of amounts & full entries based on previous 7 days (including today)
  const previousDaysSuggestions = useMemo(() => {
    const now = new Date();
    const startOfToday = startOfDay(now);

    // Look at records from last 7 days to capture everything
    const sevenDaysAgo = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const endOfToday = endOfDay(now);

    let recent = expenses.filter(e => {
      if (!e || !e.date || !isValidDate(e.date)) return false;
      const eDate = new Date(e.date);
      return eDate >= sevenDaysAgo && eDate <= endOfToday;
    });

    // Fallback: if no records in the past 7 days, take up to 30 recent historical records (excluding today)
    if (recent.length === 0) {
      recent = expenses.filter(e => {
        if (!e || !e.date || !isValidDate(e.date)) return false;
        try {
          return startOfDay(new Date(e.date)).getTime() < startOfToday.getTime();
        } catch (err) {
          return false;
        }
      }).slice(0, 30);
    }

    // Secondary Fallback: if even that is empty (e.g. clean DB), take whatever is there
    if (recent.length === 0) {
      recent = expenses.slice(0, 30);
    }

    // 1. Get unique amounts + currencies
    const amountMap = new Map<string, { amount: number; currency: 'USD' | 'KHR'; count: number }>();
    recent.forEach(e => {
      if (e && typeof e.amount === 'number' && e.amount > 0) {
        const key = `${e.amount}-${e.currency || 'USD'}`;
        const existing = amountMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          amountMap.set(key, { amount: e.amount, currency: (e.currency || 'USD') as 'USD' | 'KHR', count: 1 });
        }
      }
    });

    const amounts = Array.from(amountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(entry => ({ amount: entry.amount, currency: entry.currency }));

    // 2. Get unique full entry suggestions for Smart Add (e.g., "Rice 3000R" or "Coffee 1$")
    const entriesMap = new Map<string, { label: string; text: string; count: number }>();
    recent.forEach(e => {
      if (e && e.type === 'Expense' && e.description && typeof e.description === 'string' && e.description.trim()) {
        const amtSuffix = e.currency === 'KHR' ? `${e.amount}R` : `${e.amount}$`;
        const label = `${e.description} (${e.category}) - ${amtSuffix}`;
        const text = `${e.description} ${amtSuffix}`;
        const key = label.toLowerCase().trim();
        const existing = entriesMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          entriesMap.set(key, { label, text, count: 1 });
        }
      }
    });

    const entries = Array.from(entriesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30) // Suggest all from last 7 days
      .map(e => ({ label: e.label, text: e.text }));

    return { amounts, entries };
  }, [expenses]);

  // Unique full-featured expense templates representing everything spent over the past 5 days
  const lastFiveDaysExpenses = useMemo(() => {
    const now = new Date();
    const fiveDaysAgo = startOfDay(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000));
    const endOfToday = endOfDay(now);

    let recentVal = expenses.filter(e => {
      if (!e || !e.date || !isValidDate(e.date)) return false;
      if (e.type !== 'Expense') return false; // suggest expense records
      const eDate = new Date(e.date);
      return eDate >= fiveDaysAgo && eDate <= endOfToday;
    });

    // Fallback: if no records in the past 5 days, take the last 15 historical items
    if (recentVal.length === 0) {
      recentVal = expenses.filter(e => e && e.type === 'Expense').slice(0, 15);
    }

    const seenKeys = new Set<string>();
    const uniqueTemplateList: ExpenseEntry[] = [];

    // Sort newest transactions to show first
    const sorted = [...recentVal].sort((a, b) => {
      const dbA = a.date ? new Date(a.date).getTime() : 0;
      const dbB = b.date ? new Date(b.date).getTime() : 0;
      return dbB - dbA;
    });

    sorted.forEach(e => {
      if (e && e.description && typeof e.description === 'string' && e.description.trim()) {
        const key = `${e.description.toLowerCase().trim()}-${e.amount}-${e.currency || 'USD'}-${e.category}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueTemplateList.push(e);
        }
      }
    });

    return uniqueTemplateList;
  }, [expenses]);

  const [smartInput, setSmartInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<{index: number, value: string} | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  const filteredByView = useMemo(() => {
    const start = (() => {
      switch (viewMode) {
        case 'Daily': return startOfDay(selectedDate);
        case 'Weekly': return startOfWeek(selectedDate);
        case 'Monthly': return startOfMonth(selectedDate);
        case 'Yearly': return startOfYear(selectedDate);
        case 'Range': return startOfDay(new Date(startDate));
        default: return startOfMonth(selectedDate);
      }
    })();

    const end = (() => {
      switch (viewMode) {
        case 'Daily': return endOfDay(selectedDate);
        case 'Weekly': return endOfWeek(selectedDate);
        case 'Monthly': return endOfMonth(selectedDate);
        case 'Yearly': return endOfYear(selectedDate);
        case 'Range': return endOfDay(new Date(endDate));
        default: return endOfMonth(selectedDate);
      }
    })();

    return expenses.filter(e => {
      if (!e || !e.date || !isValidDate(e.date)) return false;
      const d = new Date(e.date);
      // Ensure we compare local dates correctly
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    });
  }, [expenses, viewMode, selectedDate]);

  const pieChartData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    filteredByView.forEach(e => {
      if (e && e.type === 'Expense') {
        let amt = e.amount;
        if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
        if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
        const cat = e.category || 'Others';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
      }
    });

    return Object.entries(expensesByCategory).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    })).sort((a, b) => b.value - a.value);
  }, [filteredByView, currencyMode]);

  // Budget Forecast calculating projected monthly total based on the last 14 days of history
  const budgetForecast = useMemo(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentExpenses = expenses.filter(e => {
      if (!e || !e.date || !isValidDate(e.date)) return false;
      if (e.type !== 'Expense') return false;
      const eDate = new Date(e.date);
      return eDate >= fourteenDaysAgo && eDate <= now;
    });

    let totalSpentLast14Days = 0;
    recentExpenses.forEach(e => {
      let amt = e.amount;
      if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
      if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
      totalSpentLast14Days += amt;
    });

    const avgDailySpending = totalSpentLast14Days / 14;
    const projectedMonthlyTotal = avgDailySpending * 30;

    return {
      avgDailySpendingCount: Math.round(avgDailySpending * 100) / 100,
      projectedMonthlyTotalCount: Math.round(projectedMonthlyTotal * 100) / 100,
      totalSpent14DaysCount: Math.round(totalSpentLast14Days * 100) / 100,
      hasData: recentExpenses.length > 0
    };
  }, [expenses, currencyMode, EXCHANGE_RATE]);

  const last30DaysTrend = useMemo(() => {
    const trendMap: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        trendMap[safeFormatDate(d, 'yyyy-MM-dd')] = 0;
    }
    
    expenses.forEach(e => {
        if (!e || e.type !== 'Expense' || !e.date || !isValidDate(e.date)) return;
        const d = new Date(e.date);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < 30) {
            let amt = e.amount;
            if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
            if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
            const key = safeFormatDate(d, 'yyyy-MM-dd');
            if (trendMap[key] !== undefined) {
                trendMap[key] += amt;
            }
        }
    });

    return Object.entries(trendMap).map(([dateStr, total]) => ({
        date: dateStr,
        displayDate: safeFormatDate(new Date(dateStr), 'MMM dd'),
        total: Math.round(total * 100) / 100
    }));
  }, [expenses, currencyMode, EXCHANGE_RATE]);

  const handleDownloadPDF = () => {
    const activeViewLabel = 
      viewMode === 'Daily' ? safeFormatDate(selectedDate, 'MMMM dd, yyyy') :
      viewMode === 'Weekly' ? `Week of ${safeFormatDate(startOfWeek(selectedDate), 'MMMM dd, yyyy')}` :
      viewMode === 'Monthly' ? safeFormatDate(selectedDate, 'MMMM yyyy') :
      viewMode === 'Range' ? `${safeFormatDate(startDate, 'MMM dd, yyyy')} - ${safeFormatDate(endDate, 'MMM dd, yyyy')}` :
      safeFormatDate(selectedDate, 'yyyy');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download or print the report");
      return;
    }

    // Build categories rows + percentages for visual printed bar chart
    const entries = Object.entries(categorySummary).filter(([_, amt]) => amt > 0);
    const maxVal = Math.max(...entries.map(([_, v]) => v), 1);
    
    const categoriesHtml = entries.map(([cat, amt]) => {
      const pct = Math.round((amt / maxVal) * 100);
      return `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px; font-weight: 800; color: #334155; width: 35%;">
            ${cat}
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; width: 45%;">
            <div style="background-color: #f1f5f9; border-radius: 9999px; height: 8px; width: 100%; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 9999px; height: 100%; width: ${pct}%;"></div>
            </div>
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 900; font-size: 13px; color: #0f172a; width: 20%; font-family: 'JetBrains Mono', monospace;">
            ${formatCurrency(amt)}
          </td>
        </tr>
      `;
    }).join('');

    // Build transactions table rows
    const transactionsHtml = filteredExpenses.map(e => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 600; color: #334155;">
          ${safeFormatDate(e.date, 'MMM dd, h:mm a')}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 500; color: #475569;">
          ${e.description}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #4b5563; letter-spacing: 0.05em;">
          <span style="background-color: #f3f4f6; padding: 3px 8px; border-radius: 6px;">${e.category}</span>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 800; font-size: 13px; font-family: 'JetBrains Mono', monospace; color: ${e.type === 'Income' ? '#16a34a' : '#e11d48'}">
          ${e.type === 'Income' ? '+' : '-'}${formatCurrency(e.amount, e.currency)}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Expense Report - ${activeViewLabel}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;850&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #1e293b;
              background-color: #ffffff;
              margin: 0;
              padding: 40px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print-bar {
              background: #fffbeb;
              border: 1px solid #fde68a;
              color: #b45309;
              padding: 14px 20px;
              border-radius: 16px;
              font-weight: 700;
              font-size: 13px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .btn-print {
              cursor: pointer;
              outline: none;
              border: none;
              background-color: #d97706;
              color: white;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
              padding: 10px 20px;
              border-radius: 10px;
              transition: all 0.2s;
            }
            .btn-print:hover {
              background-color: #b45309;
            }
            header {
              border-bottom: 4px solid #f59e0b;
              padding-bottom: 24px;
              margin-bottom: 35px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header-left h1 {
              font-size: 30px;
              font-weight: 800;
              text-transform: uppercase;
              font-style: italic;
              letter-spacing: -0.04em;
              margin: 0;
              color: #0f172a;
            }
            .header-left p {
              margin: 6px 0 0 0;
              font-size: 14px;
              color: #64748b;
              font-weight: 600;
            }
            .header-meta {
              text-align: right;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #94a3b8;
              line-height: 1.6;
            }
            .dashboard-cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 40px;
            }
            .metric-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 20px 24px;
              border-radius: 20px;
            }
            .metric-card-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin-bottom: 8px;
            }
            .metric-card-value {
              font-size: 24px;
              font-weight: 800;
              font-family: 'JetBrains Mono', monospace;
              letter-spacing: -0.02em;
            }
            .report-grid {
              display: grid;
              grid-template-columns: 1.7fr 1fr;
              gap: 40px;
            }
            .report-section-title {
              font-size: 13px;
              font-weight: 855;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #0f172a;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              text-align: left;
              background-color: #f8fafc;
              padding: 10px;
              border-bottom: 2px solid #e2e8f0;
            }
            @media print {
              .no-print-bar {
                display: none;
              }
              body {
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <span>📄 Printable Financial report generated successfully. Ready to download as PDF or send to Microsoft services.</span>
            <button class="btn-print" onclick="window.print()">Print / Export PDF</button>
          </div>
          
          <header>
            <div class="header-left">
              <h1>Daily Expenses Report</h1>
              <p>${viewMode} Statement &mdash; ${activeViewLabel}</p>
            </div>
            <div class="header-meta">
              Generated: ${new Date().toLocaleDateString()}<br/>
              Active Base standard: ${currencyMode}<br/>
              Cambodian Exchange Rate: 1 USD = ${EXCHANGE_RATE.toLocaleString()} KHR
            </div>
          </header>

          <div class="dashboard-cards">
            <div class="metric-card">
              <div class="metric-card-title">Total Income</div>
              <div class="metric-card-value" style="color: #16a34a;">+${formatCurrency(totalIncome)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-title">Total Expense</div>
              <div class="metric-card-value" style="color: #e11d48;">-${formatCurrency(totalExpense)}</div>
            </div>
            <div class="metric-card" style="background-color: #fffbeb; border-color: #fef3c7;">
              <div class="metric-card-title" style="color: #b45309;">Net Cashflow Balance</div>
              <div class="metric-card-value" style="color: ${balance >= 0 ? '#b45309' : '#e11d48'};">${formatCurrency(balance)}</div>
            </div>
          </div>

          <div class="report-grid">
            <div>
              <div class="report-section-title">Itemized History</div>
              ${filteredExpenses.length === 0 ? '<p style="font-size: 13px; font-style: italic; color: #94a3b8;">No registered transactions in this period.</p>' : `
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th style="text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${transactionsHtml}
                  </tbody>
                </table>
              `}
            </div>

            <div>
              <div class="report-section-title">Category Consumption</div>
              ${categoriesHtml ? `
                <table style="margin-bottom: 0;">
                  <thead>
                    <tr>
                      <th style="padding: 10px;">Category</th>
                      <th style="padding: 10px;">Relative Scale</th>
                      <th style="padding: 10px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${categoriesHtml}
                  </tbody>
                </table>
              ` : '<p style="font-size: 13px; font-style: italic; color: #94a3b8;">No Category consumption recorded.</p>'}

              <div class="report-section-title" style="margin-top: 35px;">Baseline Analysis</div>
              <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 16px; padding: 18px; color: #6b21a8;">
                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #701a75; margin-bottom: 8px;">14-Day Spending Prediction</div>
                <div style="font-size: 11px; font-weight: 600; line-height: 1.5; color: #581c87;">
                  Based on historical inputs from the previous 14 days, the average daily consumption rate is <strong>${budgetForecast.hasData ? formatCurrency(budgetForecast.avgDailySpendingCount) : 'uncalculated'}</strong>. This puts the projected 30-day budget total at <strong>${budgetForecast.hasData ? formatCurrency(budgetForecast.projectedMonthlyTotalCount) : 'uncalculated'}</strong>.
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top: 60px; border-top: 1px solid #f1f5f9; padding-top: 20px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">
            <span>Cambodia Daily Expense Management Portal</span>
            <span>&copy; ${new Date().getFullYear()}</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function(){ window.print(); }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (amount: number, currency?: 'USD' | 'KHR', forceSymbol?: boolean) => {
    const targetCurrency = currencyMode;
    let finalAmount = amount;

    if (currency === 'KHR' && targetCurrency === 'USD') finalAmount = amount / EXCHANGE_RATE;
    if (currency === 'USD' && targetCurrency === 'KHR') finalAmount = amount * EXCHANGE_RATE;
    
    if (targetCurrency === 'KHR') {
      return `${finalAmount.toLocaleString()} R`;
    }
    return `$${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalIncome = filteredByView.filter(e => e.type === 'Income').reduce((sum, e) => {
    let amt = e.amount;
    if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
    if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
    return sum + amt;
  }, 0);

  const totalExpense = filteredByView.filter(e => e.type === 'Expense').reduce((sum, e) => {
    let amt = e.amount;
    if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
    if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
    return sum + amt;
  }, 0);

  const balance = totalIncome - totalExpense;

  const top5Categories = useMemo(() => {
    return pieChartData.slice(0, 5);
  }, [pieChartData]);

  const budgetGoal = data.settings?.monthlyBudgetGoal || 0;
  const budgetProgress = budgetGoal > 0 ? (totalExpense / budgetGoal) * 100 : 0;
  const isBudgetExceeded = totalExpense > budgetGoal && budgetGoal > 0;

  const handleUpdateBudgetGoal = (val: string) => {
    const amount = parseFloat(val);
    if (isNaN(amount)) return;
    onUpdate({
      ...data,
      settings: { ...data.settings, monthlyBudgetGoal: amount }
    });
  };

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;

    const expense: ExpenseEntry = {
      id: editingExpenseId ? editingExpenseId : uuidv4(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.type === 'Income' ? 'Income' : newExpense.category,
      type: newExpense.type,
      currency: newExpense.currency,
      date: editingExpenseId 
        ? (expenses.find(e => e && e.id === editingExpenseId)?.date || selectedDate.toISOString())
        : selectedDate.toISOString()
    };

    if (onUpdateExpense) {
      onUpdateExpense(expense);
    } else {
      onUpdate({
        ...data,
        expenses: editingExpenseId
          ? expenses.map(e => e && e.id === editingExpenseId ? expense : e)
          : [expense, ...expenses]
      });
    }

    setNewExpense({
      description: '',
      amount: '',
      category: categories[0] || 'Others',
      type: 'Expense',
      currency: currencyMode
    });
    setSuggestedCategory(null);
    setEditingExpenseId(null);
    setIsAdding(false);
  };

  const parseEntry = (input: string) => {
    let currency: 'USD' | 'KHR' = currencyMode;
    let valStr = input;

    // Smart detection
    if (input.startsWith('$')) {
      currency = 'USD';
      valStr = input.substring(1);
    } else if (input.toUpperCase().endsWith('$')) {
      currency = 'USD';
      valStr = input.substring(0, input.length - 1);
    } else if (input.toUpperCase().endsWith('USD')) {
      currency = 'USD';
      valStr = input.substring(0, input.length - 3);
    } else if (input.toUpperCase().endsWith('RIELS') || input.toUpperCase().endsWith('RIEL')) {
      currency = 'KHR';
      valStr = input.toUpperCase().endsWith('RIELS') ? input.substring(0, input.length - 5) : input.substring(0, input.length - 4);
    } else if (input.toUpperCase().endsWith('R') || input.toUpperCase().endsWith('KHR')) {
      currency = 'KHR';
      valStr = input.toUpperCase().endsWith('KHR') ? input.substring(0, input.length - 3) : input.substring(0, input.length - 1);
    }

    const amount = parseFloat(valStr.replace(/,/g, '').replace(/\s/g, ''));
    return { amount, currency };
  };

  const handleInlineAdd = (category: string) => {
    const input = inlineInputs[category]?.trim();
    if (!input) return;

    const { amount, currency } = parseEntry(input);
    if (isNaN(amount) || amount <= 0) return;

    const expense: ExpenseEntry = {
      id: uuidv4(),
      description: category,
      amount: amount,
      category: category,
      type: 'Expense',
      currency: currency,
      date: selectedDate.toISOString()
    };

    if (onUpdateExpense) {
      onUpdateExpense(expense);
    } else {
      onUpdate({
        ...data,
        expenses: [expense, ...expenses]
      });
    }

    setInlineInputs({ ...inlineInputs, [category]: '' });
  };

  const getCombinedTotal = (items: ExpenseEntry[]) => {
    let usdTotal = 0;
    let khrTotal = 0;

    items.forEach(e => {
      if (e && e.type === 'Expense') {
        if (e.currency === 'KHR') khrTotal += e.amount;
        else usdTotal += e.amount;
      }
    });

    const totalInCurrentMode = currencyMode === 'USD' 
      ? usdTotal + (khrTotal / EXCHANGE_RATE)
      : khrTotal + (usdTotal * EXCHANGE_RATE);

    return { usd: usdTotal, khr: khrTotal, total: totalInCurrentMode };
  };

  const totals = getCombinedTotal(filteredByView);

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this expense record? This action cannot be undone.')) return;
    
    const expenseToDelete = expenses.find(e => e && e.id === id);
    if (onUpdateExpense && expenseToDelete) {
      onUpdateExpense(expenseToDelete, true);
    } else {
      onUpdate({
        ...data,
        expenses: expenses.filter(e => e && e.id !== id)
      });
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCats = [...categories, newCategoryName.trim()];
    onUpdate({
      ...data,
      expenseCategories: newCats
    });
    setNewCategoryName('');
  };

  const handleRenameCategory = () => {
    if (!editingCategory || !editingCategory.value.trim()) return;
    const newCats = [...categories];
    newCats[editingCategory.index] = editingCategory.value.trim();
    onUpdate({
      ...data,
      expenseCategories: newCats
    });
    setEditingCategory(null);
  };

  const handleDeleteCategory = (idx: number) => {
    const newCats = categories.filter((_, i) => i !== idx);
    onUpdate({
      ...data,
      expenseCategories: newCats
    });
  };

  const handleSmartAdd = () => {
    const input = smartInput.trim();
    if (!input) return;

    const entries = input.split(/[,;]+/).map(e => e.trim()).filter(e => e);
    const newExpenses: ExpenseEntry[] = [];

    for (const entryStr of entries) {
      let foundCategory = categories.find(c => c && typeof c === 'string' && c.toLowerCase() === 'others') || categories[0] || 'Others';
      let amountStr = '';

      const parts = entryStr.split(' ');
      if (parts.length >= 2) {
        const firstPart = parts[0].toLowerCase();
        const match = categories.find(c => c && typeof c === 'string' && c.toLowerCase() === firstPart);
        if (match) {
          foundCategory = match;
          amountStr = parts.slice(1).join('').trim();
        } else {
          const lastPart = parts[parts.length - 1].toLowerCase();
          const possibleAmount = parseEntry(lastPart);
          if (!isNaN(possibleAmount.amount)) {
            amountStr = lastPart;
            foundCategory = parts.slice(0, parts.length - 1).join(' ').trim();
            const matchExisting = categories.find(c => c && typeof c === 'string' && foundCategory && typeof foundCategory === 'string' && c.toLowerCase() === foundCategory.toLowerCase());
            if (matchExisting) foundCategory = matchExisting;
          }
        }
      }

      if (!amountStr) {
          amountStr = entryStr;
      }

      const { amount, currency } = parseEntry(amountStr);
      if (isNaN(amount) || amount <= 0) continue;

      const expense: ExpenseEntry = {
        id: uuidv4(),
        description: foundCategory,
        amount: amount,
        category: foundCategory,
        type: 'Expense',
        currency: currency,
        date: selectedDate.toISOString()
      };
      
      newExpenses.push(expense);
    }
    
    if (newExpenses.length === 0) return;

    if (onUpdateExpense) {
      newExpenses.forEach(exp => onUpdateExpense(exp));
    } else {
      onUpdate({
        ...data,
        expenses: [...newExpenses.reverse(), ...expenses]
      });
    }

    setSmartInput('');
  };

  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    categories.forEach(cat => summary[cat] = 0);
    
    filteredByView.filter(e => e && e.type === 'Expense' && e.category && typeof e.category === 'string').forEach(e => {
      let amt = e.amount;
      if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
      if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
      
      const match = categories.find(c => c && typeof c === 'string' && c.toLowerCase() === e.category.toLowerCase());
      if (match) {
        summary[match] = (summary[match] || 0) + amt;
      } else {
        const others = categories.find(c => c && typeof c === 'string' && c.toLowerCase() === 'others') || categories[0];
        if (others) summary[others] = (summary[others] || 0) + amt;
      }
    });
    
    return summary;
  }, [filteredByView, categories, currencyMode]);

  const todayExpensesCalculations = useMemo(() => {
    // Total spent on selected date
    const todayExpenses = expenses.filter(exp => 
      exp &&
      exp.type === 'Expense' &&
      isValidDate(exp.date) &&
      safeFormatDate(exp.date, 'yyyy-MM-dd') === safeFormatDate(selectedDate, 'yyyy-MM-dd')
    );

    const totalSpent = todayExpenses.reduce((sum, exp) => {
      if (exp.currency === 'KHR') {
        return sum + (currencyMode === 'USD' ? exp.amount / EXCHANGE_RATE : exp.amount);
      } else {
        return sum + (currencyMode === 'USD' ? exp.amount : exp.amount * EXCHANGE_RATE);
      }
    }, 0);

    const categoryShares = categories.map(cat => {
      const todayCatSum = todayExpenses.filter(exp => exp && exp.category && typeof exp.category === 'string' && cat && typeof cat === 'string' && exp.category.toLowerCase() === cat.toLowerCase()).reduce((sum, exp) => {
        if (exp.currency === 'KHR') {
          return sum + (currencyMode === 'USD' ? exp.amount / EXCHANGE_RATE : exp.amount);
        } else {
          return sum + (currencyMode === 'USD' ? exp.amount : exp.amount * EXCHANGE_RATE);
        }
      }, 0);

      const pctShare = totalSpent > 0 ? (todayCatSum / totalSpent) * 100 : 0;
      return {
        category: cat,
        amount: todayCatSum,
        percentage: Math.round(pctShare),
        hexColor: getCategoryHexColor(cat),
        icon: getCategoryIcon(cat),
        styles: getCategoryColorClass(cat)
      };
    }).filter(item => item.amount > 0).sort((a,b) => b.amount - a.amount);

    return { totalSpent, categoryShares };
  }, [expenses, selectedDate, currencyMode, EXCHANGE_RATE, categories]);

  const toggleCurrency = () => {
    const next = currencyMode === 'USD' ? 'KHR' : 'USD';
    setCurrencyMode(next);
    onUpdate({
      ...data,
      settings: { ...data.settings, currency: next }
    });
  };

  const filteredExpenses = useMemo(() => {
    let filtered = filteredByView.filter(e => 
      e && 
      ((e.description && typeof e.description === 'string' && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (e.category && typeof e.category === 'string' && e.category.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    if (viewMode === 'Daily') return filtered;

    const aggregated: Record<string, ExpenseEntry & { count?: number }> = {};
    filtered.forEach(e => {
        if (!e) return;
        const cat = e.category || 'Others';
        const type = e.type || 'Expense';
        const curr = e.currency || 'USD';
        const key = `${cat}-${type}-${curr}-aggregated`;
        if (!aggregated[key]) {
            aggregated[key] = { ...e, category: cat, type: type as any, currency: curr as any, description: `${cat} (Total)`, id: key };
            (aggregated[key] as any).count = 1;
        } else {
            aggregated[key].amount += e.amount;
            (aggregated[key] as any).count = ((aggregated[key] as any).count || 1) + 1;
        }
    });

    return Object.values(aggregated).sort((a, b) => {
        let amtA = a.amount; if(a.currency !== currencyMode) amtA = a.currency === 'USD' ? amtA * EXCHANGE_RATE : amtA / EXCHANGE_RATE;
        let amtB = b.amount; if(b.currency !== currencyMode) amtB = b.currency === 'USD' ? amtB * EXCHANGE_RATE : amtB / EXCHANGE_RATE;
        return amtB - amtA;
    });
  }, [filteredByView, searchTerm, viewMode, currencyMode]);

  function getCategoryColorClass(catName: string) {
    if (!catName || typeof catName !== 'string') return { text: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-150 dark:border-slate-800/60', focus: 'focus-within:ring-slate-500/20' };
    const clean = catName.toLowerCase().trim();
    if (clean.includes('rice')) return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', focus: 'focus-within:ring-amber-500/20' };
    if (clean.includes('noodle')) return { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-100 dark:border-orange-500/20', focus: 'focus-within:ring-orange-500/20' };
    if (clean.includes('water')) return { text: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-100 dark:border-sky-500/20', focus: 'focus-within:ring-sky-500/20' };
    if (clean.includes('gas_is_fuel') || clean.includes('gasoline') || clean.includes('fuel')) return { text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20', focus: 'focus-within:ring-rose-500/20' };
    if (clean.includes('coffee') || clean.includes('latte')) return { text: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/10 dark:border-amber-700/20', focus: 'focus-within:ring-amber-700/20' };
    if (clean.includes('tea')) return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', focus: 'focus-within:ring-emerald-500/20' };
    if (clean.includes('clothes') || clean.includes('shirt')) return { text: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20', focus: 'focus-within:ring-indigo-500/20' };
    if (clean.includes('milk')) return { text: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-100 dark:border-pink-500/20', focus: 'focus-within:ring-pink-500/20' };
    if (clean.includes('food')) return { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-100 dark:border-green-500/20', focus: 'focus-within:ring-green-500/20' };
    return { text: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-150 dark:border-slate-800/60', focus: 'focus-within:ring-slate-500/20' };
  };

  function getCategoryHexColor(catName: string) {
    if (!catName || typeof catName !== 'string') return '#64748b';
    const clean = catName.toLowerCase().trim();
    if (clean.includes('rice')) return '#f59e0b';
    if (clean.includes('noodle')) return '#f97316';
    if (clean.includes('water')) return '#0ea5e9';
    if (clean.includes('gas_is_fuel') || clean.includes('gasoline') || clean.includes('fuel')) return '#f43f5e';
    if (clean.includes('coffee') || clean.includes('latte')) return '#b45309';
    if (clean.includes('tea')) return '#10b981';
    if (clean.includes('clothes') || clean.includes('shirt')) return '#6366f1';
    if (clean.includes('milk')) return '#ec4899';
    if (clean.includes('food')) return '#22c55e';
    return '#64748b';
  };

  const getCategoryTotalForSelectedDate = (category: string) => {
    return expenses
      .filter(exp => 
        exp &&
        exp.category === category &&
        exp.type === 'Expense' &&
        isValidDate(exp.date) &&
        safeFormatDate(exp.date, 'yyyy-MM-dd') === safeFormatDate(selectedDate, 'yyyy-MM-dd')
      )
      .reduce((sum, exp) => {
        if (exp.currency === 'KHR') {
          return sum + (currencyMode === 'USD' ? exp.amount / EXCHANGE_RATE : exp.amount);
        } else {
          return sum + (currencyMode === 'USD' ? exp.amount : exp.amount * EXCHANGE_RATE);
        }
      }, 0);
  };

  return (
    <div className="expense-tracker-container flex-1 flex flex-col h-full bg-white/[0.005] backdrop-blur-3xl p-3 md:p-6 overflow-y-auto md:overflow-hidden font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3 drop-shadow-sm">
            <Wallet className="text-amber-600" /> Daily Expenses
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex bg-white/5 backdrop-blur-3xl rounded-2xl p-1.5 border border-white/10 shadow-sm">
              {(['Daily', 'Weekly', 'Monthly', 'Yearly', 'Range'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-900/40 hover:text-slate-900'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {viewMode === 'Range' ? (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-3xl rounded-2xl p-2 border border-white/20 shadow-lg px-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500 ml-2 mb-0.5">Start</span>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-slate-900 outline-none"
                  />
                </div>
                <div className="w-[1px] h-6 bg-slate-300 mx-1" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500 ml-2 mb-0.5">End</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-slate-900 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-3xl rounded-2xl p-2 border border-white/20 shadow-lg px-6">
                 <button onClick={() => setSelectedDate(d => {
                   const newD = new Date(d);
                   if (viewMode === 'Daily') newD.setDate(d.getDate() - 1);
                   else if (viewMode === 'Weekly') newD.setDate(d.getDate() - 7);
                   else if (viewMode === 'Monthly') newD.setMonth(d.getMonth() - 1);
                   else newD.setFullYear(d.getFullYear() - 1);
                   return newD;
                 })} className="p-2 bg-white/40 hover:bg-white rounded-lg transition-all"><ChevronDown className="rotate-90" size={16} /></button>
                 
                 <div className="flex flex-col items-center">
                   <span className="text-[11px] font-black italic text-slate-900 tracking-widest whitespace-nowrap">
                     {viewMode === 'Daily' && safeFormatDate(selectedDate, 'MMM dd, yyyy')}
                     {viewMode === 'Weekly' && `Week of ${safeFormatDate(startOfWeek(selectedDate), 'MMM dd')}`}
                     {viewMode === 'Monthly' && safeFormatDate(selectedDate, 'MMMM yyyy')}
                     {viewMode === 'Yearly' && safeFormatDate(selectedDate, 'yyyy')}
                   </span>
                   <span className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">Active Date</span>
                 </div>
  
                 <button onClick={() => setSelectedDate(d => {
                   const newD = new Date(d);
                   if (viewMode === 'Daily') newD.setDate(d.getDate() + 1);
                   else if (viewMode === 'Weekly') newD.setDate(d.getDate() + 7);
                   else if (viewMode === 'Monthly') newD.setMonth(d.getMonth() + 1);
                   else newD.setFullYear(d.getFullYear() + 1);
                   return newD;
                 })} className="p-2 bg-white/40 hover:bg-white rounded-lg transition-all"><ChevronDown className="-rotate-90" size={16} /></button>
              </div>
            )}

            <button 
              onClick={toggleCurrency}
              className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-3xl rounded-xl border border-white/10 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-900 overflow-hidden group"
            >
              <Coins size={14} className="text-amber-600 group-hover:rotate-12 transition-transform" />
              {currencyMode}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-6 py-4 bg-rose-500/5 dark:bg-amber-500/5 hover:bg-rose-500/10 dark:hover:bg-amber-500/10 text-rose-600 dark:text-amber-500 border border-rose-500/10 dark:border-amber-500/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download PDF statement"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <button 
            onClick={() => setIsManagingCategories(true)}
            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-900/60 hover:text-slate-900 transition-all border border-white/10"
            title="Manage Categories"
          >
            <Settings2 size={20} />
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-amber-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
          >
            <Plus size={18} className="inline mr-2" /> Add Record
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }} 
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800/80 rounded-[28px] p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[110px]"
        >
             <div>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Net Balance</p>
               <h2 className={`text-3xl font-black italic tracking-tighter ${balance >= 0 ? 'text-amber-500' : 'text-rose-600'}`}>
                  {formatCurrency(balance)}
               </h2>
             </div>
             <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Wallet size={18} />
             </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }} 
          className="bg-emerald-500/5 dark:bg-emerald-500/5 backdrop-blur-3xl border border-emerald-500/10 rounded-[28px] p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[110px]"
        >
             <div>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/60 mb-1">{viewMode} Income</p>
               <h2 className="text-2xl font-black italic tracking-tighter text-emerald-600">
                  +{formatCurrency(totalIncome)}
               </h2>
             </div>
             <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp size={18} />
             </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }} 
          className="bg-rose-500/5 dark:bg-rose-500/5 backdrop-blur-3xl border border-rose-500/10 rounded-[28px] p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[110px]"
        >
             <div>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600/60 mb-1">{viewMode} Expense</p>
               <h2 className="text-2xl font-black italic tracking-tighter text-rose-600">
                  -{formatCurrency(totalExpense)}
               </h2>
               {totals.usd > 0 && totals.khr > 0 && (
                 <p className="text-[8px] font-bold text-rose-600/70 mt-1 uppercase tracking-tight">
                   ${totals.usd.toLocaleString()} + {totals.khr.toLocaleString()} R
                 </p>
               )}
             </div>
             <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
                <TrendingDown size={18} />
             </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }} 
          className="bg-amber-500/5 dark:bg-amber-500/5 backdrop-blur-3xl border border-amber-500/10 rounded-[28px] p-5 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[110px]"
        >
             <div className="flex justify-between items-center mb-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600/80">USD ⇄ KHR Converter</p>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500">Rate: 1 = {EXCHANGE_RATE.toLocaleString()}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-2 mt-1 z-10">
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-[10px] font-black text-slate-400">$</span>
                  <input
                    type="number"
                    value={quickUSD}
                    onChange={(e) => handleQuickUSDChange(e.target.value)}
                    placeholder="USD"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-5 pr-2 py-1 text-[11px] font-black text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-[10px] font-black text-slate-400">៛</span>
                  <input
                    type="number"
                    value={quickKHR}
                    onChange={(e) => handleQuickKHRChange(e.target.value)}
                    placeholder="KHR"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-5 pr-2 py-1 text-[11px] font-black text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 transition-all"
                  />
                </div>
             </div>
             
             <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 italic mt-1 pl-1">
                Values sync instantly using configured exchange settings
             </p>
        </motion.div>
      </div>

      {/* Monthly Budget Tracker Row & Share of Spent Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800/80 rounded-[32px] p-6 shadow-md relative overflow-hidden h-full flex flex-col justify-between"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase italic tracking-tighter">Budget Progress</h3>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{viewMode} Limit Monitoring</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black italic ${isBudgetExceeded ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(totalExpense)}
                    </span>
                    <span className="text-xs font-black text-slate-400 mx-1">/</span>
                    <span className="text-xs font-bold text-slate-500">
                      {budgetGoal > 0 ? formatCurrency(budgetGoal) : 'Goal Not Set'}
                    </span>
                  </div>
                </div>

                <div className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(budgetProgress, 100)}%` }}
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                      budgetProgress > 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 
                      budgetProgress > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                      'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    }`}
                    style={{ boxShadow: `0 0 10px ${budgetProgress > 90 ? '#ef4444' : budgetProgress > 70 ? '#f59e0b' : '#10b981'}44` }}
                  />
                </div>
                
                <div className="flex justify-between mt-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    {Math.round(budgetProgress)}% Consumed
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isBudgetExceeded ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                    {isBudgetExceeded ? '⚠️ OVER BUDGET' : `${formatCurrency(Math.max(0, budgetGoal - totalExpense))} remaining`}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-48 bg-slate-50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1 text-center">Set Budget Goal</label>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="Enter Goal"
                    defaultValue={budgetGoal > 0 ? budgetGoal : ''}
                    onBlur={(e) => handleUpdateBudgetGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudgetGoal((e.target as HTMLInputElement).value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-black text-center outline-none focus:border-amber-500 transition-all shadow-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-slate-300">
                    {currencyMode}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div>
          {/* Share of Spent Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800/80 rounded-[32px] p-6 shadow-md relative overflow-hidden h-full flex flex-col justify-between"
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-amber-500/10 to-orange-500/15 rounded-xl text-amber-500">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase italic tracking-tighter">Share of Spent</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Today's Category distribution</p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-xl uppercase tracking-wider">
                  Live Key
                </span>
              </div>

              {todayExpensesCalculations.categoryShares.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center h-[100px]">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-2">
                    <Activity size={16} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">No expenses registered for today</p>
                  <p className="text-[8px] text-slate-400 mt-1">Populate category totals below</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[140px] overflow-y-auto pr-1 select-none custom-scrollbar-amber">
                  {todayExpensesCalculations.categoryShares.map(item => (
                    <div key={item.category} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] ${item.styles.bg}`}>
                            {item.icon}
                          </span>
                          <span className="text-[11px] font-black text-slate-800 dark:text-slate-250 uppercase tracking-tight truncate max-w-[80px]">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-[10px] font-extrabold text-amber-550">
                            {item.percentage}%
                          </span>
                          <span className="text-[11px] font-black text-slate-950 dark:text-white">
                            {formatCurrency(item.amount, currencyMode)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full overflow-hidden relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.hexColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="expense-columns-wrapper flex-1 flex flex-col gap-6 overflow-visible overflow-y-auto custom-scrollbar-amber pr-2 pb-20">
        {/* Structured Category List */}
        <div className="expense-column w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-slate-200/50 dark:border-slate-800/80 rounded-[36px] shadow-sm flex flex-col overflow-hidden text-left shrink-0">
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <div className="flex bg-zinc-200/60 p-0.5 rounded-xl border border-zinc-300/20">
                        <button
                          onClick={() => setLeftPanelTab('inputs')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${leftPanelTab === 'inputs' ? 'bg-white text-amber-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                        >
                          📋 Entry
                        </button>
                        <button
                          onClick={() => setLeftPanelTab('chart')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${leftPanelTab === 'chart' ? 'bg-white text-amber-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                        >
                          📊 Insights
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-extrabold text-amber-650 uppercase px-2 py-0.5 bg-amber-500/10 rounded-lg">Instant Sync</span>
                        <button onClick={() => setShowCategorySummary(!showCategorySummary)} className="text-slate-400 hover:text-amber-600 transition-colors">
                            <ChevronDown className={`transition-transform duration-300 ${showCategorySummary ? "" : "-rotate-90"}`} size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider italic">
                    Press Enter to auto-save
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsManagingRecurring(true)} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-500/10 px-3 py-1 rounded-lg transition-colors">
                      🔄 Recurring
                    </button>
                    <button onClick={() => setIsManagingCategories(true)} className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-500/10 px-3 py-1 rounded-lg transition-colors">
                      Edit Items
                    </button>
                  </div>
                </div>
            </div>
            
            <AnimatePresence mode="wait">
                {showCategorySummary && leftPanelTab === 'inputs' && (
                    <motion.div 
                        key="inputs-panel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {categories.map(cat => {
                                const colors = getCategoryColorClass(cat);
                                const todaySpend = getCategoryTotalForSelectedDate(cat);
                                const hasInput = !!inlineInputs[cat];

                                // Total today spent to calculate share percentage
                                const todaySpentAll = expenses
                                  .filter(exp => 
                                    exp &&
                                    exp.type === 'Expense' &&
                                    isValidDate(exp.date) &&
                                    safeFormatDate(exp.date, 'yyyy-MM-dd') === safeFormatDate(selectedDate, 'yyyy-MM-dd')
                                  )
                                  .reduce((sum, exp) => {
                                    if (exp.currency === 'KHR') {
                                      return sum + (currencyMode === 'USD' ? exp.amount / EXCHANGE_RATE : exp.amount);
                                    } else {
                                      return sum + (currencyMode === 'USD' ? exp.amount : exp.amount * EXCHANGE_RATE);
                                    }
                                  }, 0);
                                const pctShare = todaySpentAll > 0 ? (todaySpend / todaySpentAll) * 100 : 0;
                                const hexColor = getCategoryHexColor(cat);

                                return (
                                    <div 
                                      key={cat} 
                                      className={`flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-[24px] group hover:scale-[1.01] hover:shadow-md transition-all duration-300 relative overflow-hidden focus-within:ring-2 ${colors.focus} ${colors.border}`}
                                    >
                                        {/* Subtle micro background glow mapped to the category color */}
                                        <div className={`absolute -right-6 -top-6 w-16 h-16 rounded-full blur-[24px] opacity-15 pointer-events-none ${colors.bg}`} />
                                        
                                        {/* Left Side: Icon & Category Information */}
                                        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border dark:border-slate-800 ${colors.bg}`}>
                                                {getCategoryIcon(cat)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-black text-slate-850 dark:text-slate-100 uppercase tracking-tight truncate max-w-[95px]" title={cat}>
                                                    {cat}
                                                </span>
                                                <span className="text-[7.5px] font-black text-slate-400 tracking-wider uppercase leading-none mt-0.5">
                                                    Category
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Right Side: Accumulated Today Spend & Interactive Numeric Input with Generous Space */}
                                        <div className="flex items-center gap-3.5 shrink-0">
                                            {todaySpend > 0 && (
                                                <div className="flex flex-col items-end shrink-0 select-none animate-in fade-in zoom-in duration-300 mr-1">
                                                    <span className="text-[12px] font-black text-slate-900 dark:text-slate-150">
                                                        {formatCurrency(todaySpend, currencyMode)}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                                        TODAY
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <div className={`flex items-center gap-1.5 border-l border-slate-150/60 dark:border-slate-800/40 pl-3 ${todaySpend > 0 ? '' : 'border-l-0 pl-0'}`}>
                                                <div className="relative">
                                                    <input 
                                                      type="text"
                                                      placeholder={`$0.00`}
                                                      value={inlineInputs[cat] || ''}
                                                      onChange={(e) => setInlineInputs({...inlineInputs, [cat]: e.target.value})}
                                                      onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd(cat)}
                                                      className="w-24 sm:w-32 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-right text-xs font-black outline-none placeholder:text-slate-350 dark:placeholder:text-slate-650 transition-all focus:border-amber-500 focus:bg-white text-slate-900 dark:text-slate-150 shadow-inner"
                                                    />
                                                </div>
                                                {hasInput && (
                                                    <button 
                                                      onClick={() => handleInlineAdd(cat)}
                                                      className="p-2 bg-amber-500 text-white rounded-lg hover:scale-115 shadow-sm hover:bg-amber-600 active:scale-95 transition-all shrink-0 animate-in slide-in-from-right duration-200"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {showCategorySummary && leftPanelTab === 'chart' && (
                    <motion.div 
                        key="chart-panel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto custom-scrollbar-amber p-5 flex flex-col justify-between"
                    >
                        {pieChartData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                                <Activity size={24} className="text-slate-300 mb-2 animate-bounce" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No expense data to analyze in this period.</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="h-[210px] w-full relative z-10 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {pieChartData.map((entry, index) => {
                                                    const COLORS = [
                                                      '#f59e0b', '#3b82f6', '#10b981', '#ef4444', 
                                                      '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', 
                                                      '#f97316', '#64748b'
                                                    ];
                                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                                })}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value: any) => [formatCurrency(value as number), 'Total Spent']}
                                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="mt-8 pt-5 border-t border-slate-150/60 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                                            <TrendingUp size={14} className="text-amber-500" />
                                            <span>Bar Analysis: Top 5 Categories</span>
                                        </div>
                                        <button 
                                          onClick={() => setLeftPanelTab('chart')} 
                                          className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase"
                                        >
                                          Live Stats
                                        </button>
                                    </div>
                                    
                                    <div className="h-[180px] min-h-[180px] w-full bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/40 shadow-inner overflow-hidden">
                                        <ResponsiveContainer width="100%" height={178}>
                                            <BarChart data={top5Categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis 
                                                  dataKey="name" 
                                                  axisLine={false} 
                                                  tickLine={false} 
                                                  tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }}
                                                  interval={0}
                                                />
                                                <YAxis 
                                                  axisLine={false} 
                                                  tickLine={false} 
                                                  tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }}
                                                />
                                                <Tooltip 
                                                  cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                                                  formatter={(value: any) => [formatCurrency(value as number), 'Spent']}
                                                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '9px', fontWeight: 'bold' }}
                                                />
                                                <Bar 
                                                  dataKey="value" 
                                                  radius={[6, 6, 0, 0]} 
                                                  barSize={32}
                                                >
                                                  {top5Categories.map((entry, index) => {
                                                      const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#6366f1'];
                                                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                                  })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="space-y-3">
                                        {top5Categories.map((item, index) => {
                                            const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#6366f1'];
                                            const maxVal = top5Categories[0]?.value || 1;
                                            const pct = (item.value / maxVal) * 100;
                                            return (
                                                <div key={item.name} className="space-y-1">
                                                    <div className="flex justify-between items-center text-[10px] font-black">
                                                        <span className="text-slate-500 dark:text-slate-400 uppercase tracking-tight">{item.name}</span>
                                                        <span className="text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar-amber pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {pieChartData.map((item, index) => {
                                        const COLORS = [
                                          '#f59e0b', '#3b82f6', '#10b981', '#ef4444', 
                                          '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', 
                                          '#f97316', '#64748b'
                                        ];
                                        return (
                                            <div key={item.name} className="flex items-center justify-between text-xs font-semibold p-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                    <span className="text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[9px] tracking-tight">{item.name}</span>
                                                </div>
                                                <span className="text-slate-900 dark:text-slate-100 font-black">{formatCurrency(item.value)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Last 30 Days Trend Section */}
                        <div className="mt-8 pt-5 border-t border-slate-150/60 dark:border-slate-800 space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                                <TrendingUp size={14} className="text-amber-500" />
                                <span>30-Day Spending Volatility</span>
                            </div>
                            
                            <div className="h-[180px] min-h-[180px] w-full bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/40 shadow-inner overflow-hidden">
                                <ResponsiveContainer width="100%" height={178}>
                                    <LineChart data={last30DaysTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis 
                                            dataKey="displayDate" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }}
                                        />
                                        <Tooltip 
                                            formatter={(value: any) => [formatCurrency(value as number), 'Spent']}
                                            labelFormatter={(label) => `Date: ${label}`}
                                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '9px', fontWeight: 'bold' }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="total" 
                                            stroke="#f59e0b" 
                                            strokeWidth={3} 
                                            dot={{ r: 2, fill: '#f59e0b', strokeWidth: 0 }} 
                                            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} 
                                            animationDuration={1500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Budget Forecast Section */}
                        <div className="mt-8 pt-5 border-t border-slate-150/60 dark:border-slate-800 space-y-3 shrink-0">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 tracking-wider">
                               <Sparkles size={14} className="text-amber-500 animate-pulse" />
                               <span>Budget Forecast (14-Day Baseline)</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg. Daily Spending</span>
                                    <span className="text-xs font-black text-slate-850 dark:text-slate-200">
                                        {budgetForecast.hasData ? formatCurrency(budgetForecast.avgDailySpendingCount) : 'No recent entries'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/60 dark:border-slate-800/60">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Projected Monthly</span>
                                    <span className="text-sm font-black italic text-rose-600">
                                        {budgetForecast.hasData ? formatCurrency(budgetForecast.projectedMonthlyTotalCount) : 'No recent entries'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[8.5px] font-bold text-slate-400 dark:text-slate-550 leading-relaxed italic pl-1">
                                Monthly projection is estimated assuming a standard 30-day billing cycle based on transactions recorded over the previous 14 days.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-0.5">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Total Consumption</span>
                    <span className="text-sm font-black italic text-rose-600">-{formatCurrency(totalExpense)}</span>
                </div>
                {totals.usd > 0 && totals.khr > 0 && (
                  <div className="flex justify-end">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                      ${totals.usd.toLocaleString()} + {totals.khr.toLocaleString()} R
                    </span>
                  </div>
                )}
            </div>
        </div>

        {/* Search & Quick Input Ribbon */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
            {/* Search Box */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-slate-200/50 dark:border-slate-800/80 rounded-[30px] shadow-sm flex items-center p-2 relative h-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search records..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-14 pr-6 text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-400 outline-none uppercase tracking-widest text-xs"
                />
            </div>
            
            {/* Quick Input Box */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-slate-200/50 dark:border-slate-800/80 rounded-[30px] shadow-sm p-4 flex flex-col justify-center gap-3">
              <div className="flex items-center gap-3">
                <input 
                    type="text"
                    placeholder="Quick input... (e.g. Espresso 3.50; Bus 2$)"
                    value={smartInput}
                    onChange={(e) => setSmartInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()}
                    className="flex-1 w-full bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/60 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 placeholder:italic shadow-inner"
                />
                <button 
                    onClick={handleSmartAdd}
                    disabled={!smartInput.trim()}
                    className="px-6 py-3 shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-[16px] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                    Add
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                 <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider mr-1">
                   {previousDaysSuggestions.entries.length > 0 ? '✨ Recent (Last 7 days):' : 'Examples:'}
                 </span>
                 {(() => {
                   const displayEntries = [...previousDaysSuggestions.entries];
                   const defaultSamples = [
                     { label: '⛽ Gas 10000R', text: 'Gas 10000R' },
                     { label: '☕ Coffee 3.5$', text: 'Coffee 3.5$' },
                     { label: '🍕 Food 12$', text: 'Food 12$' },
                     { label: '💰 Salary 1500$ Income', text: 'Salary 1500$ Income' }
                   ];
                   let i = 0;
                   while (displayEntries.length < 4 && i < defaultSamples.length) {
                     if (!displayEntries.find(e => e.label.includes(defaultSamples[i].text.split(' ')[0]) || e.text.includes(defaultSamples[i].text.split(' ')[0]))) {
                       displayEntries.push(defaultSamples[i]);
                     }
                     i++;
                   }
                   return displayEntries.map(chip => (
                     <button
                       key={chip.label}
                       onClick={() => setSmartInput(prev => {
                         const t = prev.trim();
                         if (!t) return chip.text + '; ';
                         if (t.endsWith(';') || t.endsWith(',')) return t + ' ' + chip.text + '; ';
                         return t + '; ' + chip.text + '; ';
                       })}
                       className="px-2.5 py-1 bg-white/70 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700/60 rounded-xl text-[9px] font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors shadow-sm animate-in fade-in"
                     >
                       {chip.label}
                     </button>
                   ));
                 })()}
                 {previousDaysSuggestions.entries.length > 0 && (
                   <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded italic mt-0.5 lg:mt-0 xl:mt-0">
                     Smart Recommendations
                   </span>
                 )}
              </div>
            </div>
        </div>

        {/* Detailed Transactions */}
        <div className="expense-column w-full bg-white/[0.005] backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-sm flex flex-col shrink-0">
            <div className="flex-1 w-full p-4 md:p-6 lg:p-8">
                <div className="space-y-3">
                    {filteredExpenses.map((expense) => {
                        const itemStyles = getCategoryItemStyles(expense.category, expense.type === 'Income');
                        return (
                          <motion.div 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={expense.id} 
                            className={`group flex items-center justify-between p-3 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40 transition-all gap-2 sm:gap-6 shadow-sm ${itemStyles.bg}`}
                          >
                              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                  {viewMode === 'Daily' && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button 
                                        onClick={() => {
                                          setNewExpense({
                                            description: expense.description,
                                            amount: expense.amount.toString(),
                                            category: expense.category,
                                            type: expense.type,
                                            currency: expense.currency || currencyMode
                                          });
                                          setEditingExpenseId(expense.id);
                                          setIsAdding(true);
                                        }}
                                        className="p-1.5 sm:p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-605 dark:text-amber-400 rounded-xl transition-all"
                                        title="Edit Record"
                                      >
                                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteExpense(expense.id)}
                                        className="p-1.5 sm:p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all"
                                        title="Delete Record"
                                      >
                                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </button>
                                    </div>
                                  )}

                                  <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 border border-slate-250/30 dark:border-slate-750 shadow-sm ${expense.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                     {expense.type === 'Income' ? <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /> : <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />}
                                  </div>
                                  <div className="min-w-0">
                                      <h3 className={`text-sm sm:text-[17px] font-black italic tracking-tight truncate ${itemStyles.text}`}>{expense.description}</h3>
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-0.5 sm:mt-1">
                                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded-md ${itemStyles.badge}`}>
                                              {viewMode === 'Daily' ? `${safeFormatDate(expense.date, 'MMM dd')} • ${expense.category}` : `${expense.category} • ${(expense as any).count || 1} records`}
                                          </span>
                                          {expense.currency !== currencyMode && (
                                            <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-750 dark:text-amber-300 rounded border border-amber-500/10 uppercase italic">
                                               Saved in {expense.currency}
                                            </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                                  <div className={`text-base sm:text-2xl font-black italic tracking-tighter ${expense.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {expense.type === 'Income' ? '+' : '-'}{formatCurrency(expense.amount, expense.currency as 'USD' | 'KHR')}
                                  </div>
                              </div>
                          </motion.div>
                        );
                    })}

                    {filteredExpenses.length === 0 && (
                        <div className="py-20 text-center text-slate-900/10">
                            <Wallet size={64} className="mx-auto mb-4 opacity-10" />
                            <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Vault is empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
          {isAdding && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-slate-200 relative"
                  >
                      <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">
                        {editingExpenseId ? 'Edit Record' : 'New Record'}
                      </h3>
                                         <div className="space-y-6">
                          <div className="flex gap-3 p-1.5 bg-black/5 rounded-[24px]">
                              <button 
                                onClick={() => setNewExpense({...newExpense, type: 'Expense'})}
                                className={`flex-1 py-4 font-black text-[13px] uppercase tracking-widest rounded-2xl transition-all ${newExpense.type === 'Expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-900/30 hover:text-slate-900'}`}
                              >
                                  Expense
                              </button>
                              <button 
                                onClick={() => setNewExpense({...newExpense, type: 'Income'})}
                                className={`flex-1 py-4 font-black text-[13px] uppercase tracking-widest rounded-2xl transition-all ${newExpense.type === 'Income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-900/30 hover:text-slate-900'}`}
                              >
                                  Income
                              </button>
                          </div>

                          {/* 1-Click Auto-fill Recommendations for Last 5 Days */}
                          {newExpense.type === 'Expense' && lastFiveDaysExpenses.length > 0 && (
                            <div className="space-y-2 p-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-[28px]">
                              <span className="text-[10px] font-black text-amber-750 uppercase tracking-widest flex items-center gap-1 ml-1.5">
                                🚀 Click to Autofill (Last 5 Days):
                              </span>
                              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 select-none custom-scrollbar-amber">
                                {lastFiveDaysExpenses.map((exp, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setNewExpense({
                                        description: exp.description,
                                        amount: exp.amount.toString(),
                                        category: exp.category,
                                        type: exp.type || 'Expense',
                                        currency: (exp.currency || 'USD') as 'USD' | 'KHR'
                                      });
                                      setSuggestedCategory(exp.category);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-50 border border-slate-200/80 hover:border-amber-300 rounded-[14px] text-xs font-black text-slate-750 hover:text-amber-950 transition-all shadow-sm active:scale-95 text-left"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                    <span className="truncate max-w-[120px]">{exp.description}</span>
                                    <span className="text-[9px] text-slate-400 font-bold flex-shrink-0">({exp.category})</span>
                                    <span className="text-[9px] text-amber-600 bg-amber-500/5 px-1.5 py-0.5 rounded-full font-black flex-shrink-0 ml-auto">
                                      {exp.currency === 'KHR' ? `${exp.amount.toLocaleString()}R` : `$${exp.amount}`}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 ml-4">Description</label>
                             <input 
                                value={newExpense.description}
                                onChange={(e) => {
                                   const val = e.target.value;
                                   const suggestion = getSuggestedCategory(val);
                                   setSuggestedCategory(suggestion);
                                   setNewExpense(prev => ({
                                     ...prev,
                                     description: val,
                                     category: (suggestion && prev.type === 'Expense') ? suggestion : prev.category
                                   }));
                                 }}
                                placeholder="What is this for?"
                                className="w-full bg-slate-50 border border-slate-200 rounded-[28px] py-6 px-8 text-[15px] text-slate-900 font-bold outline-none focus:border-amber-500 focus:bg-white transition-all font-sans"
                             />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 ml-4">Amount</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[28px] py-6 pl-10 pr-16 text-[20px] text-slate-900 font-black outline-none focus:border-amber-500 focus:bg-white transition-all font-sans"
                                    />
                                    <button 
                                      onClick={() => setNewExpense({...newExpense, currency: newExpense.currency === 'USD' ? 'KHR' : 'USD'})}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-black uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                    >
                                      {newExpense.currency}
                                    </button>
                                </div>

                                {/* Quick Amounts */}
                                <div className="flex flex-wrap gap-2 mt-4 px-2">
                                  {quickAmounts.map((q) => (
                                    <button
                                      key={q.label}
                                      onClick={() => setNewExpense({ ...newExpense, amount: q.amount.toString(), currency: q.currency as any })}
                                      className="px-4 py-2.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border border-transparent hover:border-amber-200"
                                    >
                                      {q.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Dynamic suggestions from previous 3 days */}
                                {previousDaysSuggestions.amounts.length > 0 && (
                                  <div className="mt-4 px-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-900/40 mb-2 ml-1">✨ Recent Custom (Last 7 days):</p>
                                    <div className="flex flex-wrap gap-2">
                                      {previousDaysSuggestions.amounts.map((s, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => setNewExpense({ ...newExpense, amount: s.amount.toString(), currency: s.currency })}
                                          className="px-4 py-2.5 bg-amber-500/5 hover:bg-amber-500/15 text-amber-700 font-extrabold rounded-xl text-[10px] uppercase tracking-tight transition-all border border-amber-500/10 flex items-center justify-center gap-1.5"
                                        >
                                           {s.currency === 'KHR' ? `${s.amount.toLocaleString()} R` : `$${s.amount}`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {categorySuggestions.length > 0 && (
                                  <div className="mt-4 px-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-900/40 mb-2 ml-1">Recently for {newExpense.category}:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {categorySuggestions.map((s, i) => (
                                        <button
                                          key={i}
                                          onClick={() => setNewExpense({ ...newExpense, amount: s.amount.toString(), currency: s.currency })}
                                          className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border border-amber-200/50"
                                        >
                                          {s.currency === 'KHR' ? `${s.amount.toLocaleString()} R` : `$${s.amount}`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between ml-4 mr-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-900/40">Category</label>
                                  {suggestedCategory && (
                                    <span className="text-[9px] font-black text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-full select-none animate-pulse">
                                      ✨ Auto-categorized
                                    </span>
                                  )}
                                </div>
                                <select 
                                    value={newExpense.category}
                                    disabled={newExpense.type === 'Income'}
                                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[28px] py-6 px-8 text-[15px] text-slate-900 font-black outline-none focus:border-amber-500 focus:bg-white transition-all appearance-none font-sans cursor-pointer"
                                >
                                    {newExpense.type === 'Income' ? (
                                      <option value="Income">Income</option>
                                    ) : (
                                      categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                    )}
                                </select>
                              </div>
                          </div>
                      </div>

                      <div className="p-4 bg-slate-150/60 border border-slate-200/50 rounded-[20px] text-[11px] font-medium text-slate-650 leading-relaxed mb-6">
                        💡 <span className="font-extrabold text-slate-800">Correction Tip:</span> Tap the currency code button next to the input to quickly toggle between **USD ($)** and **KHR (Riel)**. You can correct any amount or description at any time by tapping the pencil icon (✏️) on the listed item.
                      </div>

                      <div className="flex gap-4">
                          <button 
                            onClick={() => {
                              setIsAdding(false);
                              setEditingExpenseId(null);
                              setSuggestedCategory(null);
                              setNewExpense({
                                description: '',
                                amount: '',
                                category: categories[0] || 'Others',
                                type: 'Expense',
                                currency: currencyMode
                              });
                            }} 
                            className="flex-1 py-4 text-slate-900/30 font-black text-[10px] uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleAddExpense}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            Save
                          </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}

          {isManagingCategories && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-slate-200 relative"
                  >
                      <button onClick={() => setIsManagingCategories(false)} className="absolute top-8 right-8 text-slate-900/20 hover:text-slate-900">
                        <X size={20} />
                      </button>
                      
                      <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Categories</h3>
                      
                      <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar-amber">
                        {categories.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group border border-slate-200 shadow-sm">
                            {editingCategory?.index === idx ? (
                              <div className="flex-1 flex gap-2">
                                <input 
                                  value={editingCategory.value}
                                  onChange={(e) => setEditingCategory({...editingCategory, value: e.target.value})}
                                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest outline-none"
                                />
                                <button onClick={handleRenameCategory} className="p-2 bg-emerald-500 text-white rounded-xl"><Check size={14} /></button>
                                <button onClick={() => setEditingCategory(null)} className="p-2 bg-slate-200 text-slate-500 rounded-xl"><X size={14} /></button>
                              </div>
                            ) : (
                              <>
                                <span className="font-black uppercase text-[10px] tracking-widest text-slate-900">{cat}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => setEditingCategory({index: idx, value: cat})} className="p-2 text-slate-300 hover:text-slate-900"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDeleteCategory(idx)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <input 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New category..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black uppercase text-[10px] tracking-widest outline-none focus:border-amber-500 transition-all text-slate-900"
                        />
                        <button 
                          onClick={handleAddCategory}
                          className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg"
                        >
                          Add
                        </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}

          {isManagingRecurring && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-slate-200 relative"
                  >
                      <button onClick={() => setIsManagingRecurring(false)} className="absolute top-8 right-8 text-slate-900/20 hover:text-slate-900">
                        <X size={20} />
                      </button>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Automated Expenses</span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase italic tracking-tighter">Recurring Bills</h3>
                      <p className="text-xs text-slate-500 mb-6 font-semibold -mt-4">Define monthly fixed costs (Rent, Wifi). They automatically post to your ledger when the day of month arrives.</p>
                      
                      <div className="space-y-3 mb-8 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar-amber">
                        {(data.recurringExpenses || []).length === 0 ? (
                          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            No active recurring bills
                          </div>
                        ) : (
                          (data.recurringExpenses || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-950 truncate max-w-[180px]">{item.description}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded">{item.category}</span>
                                  <span className="text-[9px] font-black text-slate-400">Day {item.dayOfMonth} monthly</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-sm text-rose-500">
                                  {formatCurrency(item.amount, item.currency)}
                                </span>
                                <button 
                                  onClick={() => handleDeleteRecurring(item.id)} 
                                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Remove Bill"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            value={newRecurring.description}
                            onChange={(e) => setNewRecurring({...newRecurring, description: e.target.value})}
                            placeholder="Rent, Wifi, Netflix..."
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-amber-500 transition-all text-slate-900"
                          />
                          <select
                            value={newRecurring.category}
                            onChange={(e) => setNewRecurring({...newRecurring, category: e.target.value})}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-amber-500 text-slate-900"
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <input 
                            value={newRecurring.amount}
                            onChange={(e) => setNewRecurring({...newRecurring, amount: e.target.value})}
                            placeholder="Amount"
                            type="number"
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-amber-500 transition-all text-slate-900"
                          />
                          
                          <select
                            value={newRecurring.currency}
                            onChange={(e) => setNewRecurring({...newRecurring, currency: e.target.value as 'USD' | 'KHR'})}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-amber-500 text-slate-900"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="KHR">KHR (៛)</option>
                          </select>

                          <input 
                            value={newRecurring.dayOfMonth}
                            onChange={(e) => setNewRecurring({...newRecurring, dayOfMonth: parseInt(e.target.value) || 1})}
                            placeholder="Day (1-31)"
                            type="number"
                            min={1}
                            max={31}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-amber-500 transition-all text-slate-900"
                            title="Day of Month (1-31)"
                          />
                        </div>

                        <button 
                          onClick={handleAddRecurring}
                          className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                        >
                          Schedule Fixed Cost
                        </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Floating Speed Add Action Button */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/30 border border-white/20 transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/10"
          title="Add New Record"
          id="floating-speed-add-btn"
        >
          <Plus size={28} />
        </motion.button>
      </div>

      <style>{`
        .custom-scrollbar-amber::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.3);
        }
      `}</style>
    </div>
  );
};
