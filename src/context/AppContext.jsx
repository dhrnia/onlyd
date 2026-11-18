import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

const STORAGE_KEY = 'onlyd_hub_data_cache';

const INITIAL_DATA = {
  shelf: {
    items: [],
    genres: ["Self-Improvement", "Sci-Fi", "Productivity", "Thriller", "Design", "Philosophy", "Fiction"],
    collections: [{ id: "col-1", name: "Favorites" }, { id: "col-2", name: "2026 Queue" }]
  },
  budget: {
    goals: [],
    expenses: []
  },
  contacts: [],
  vault: {
    passwords: [],
    links: []
  },
  wishlist: {
    items: [],
    categories: ["Tech", "Workstation", "Books", "Lifestyle", "Fashion", "Other"]
  },
  jobs: [],
  period: {
    settings: {
      cycleDuration: 28,
      periodDuration: 5
    },
    logs: []
  },
  meta: {
    version: "1.0",
    lastUpdated: null
  }
};

export function AppProvider({ children }) {
  // Navigation
  const [currentApp, setCurrentApp] = useState(() => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    return ['home', 'shelf', 'budget', 'contacts', 'vault', 'wishlist', 'jobs', 'period'].includes(hash) ? hash : 'home';
  });

  // Main Data State (cached in localStorage)
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse localStorage cache', e);
    }
    return INITIAL_DATA;
  });

  // Sync State
  const [syncState, setSyncState] = useState('synced'); // 'synced' | 'syncing' | 'offline' | 'error'
  const [lastSynced, setLastSynced] = useState(null);
  const [serverInfo, setServerInfo] = useState({
    port: 5000,
    localIps: [],
    primaryLocalUrl: window.location.origin
  });
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, duration = 3000) => {
    setToast(message);
    setTimeout(() => {
      setToast(prev => (prev === message ? null : prev));
    }, duration);
  }, []);

  // Listen to hash changes for smooth back/forward routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['home', 'shelf', 'budget', 'contacts', 'vault', 'wishlist', 'jobs', 'period'].includes(hash)) {
        setCurrentApp(hash);
      } else {
        setCurrentApp('home');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (appId) => {
    window.location.hash = appId === 'home' ? '' : `/${appId}`;
    setCurrentApp(appId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep localStorage updated on every local change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage cache', e);
    }
  }, [data]);

  // Fetch server status & LAN info
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const info = await res.json();
        setServerInfo({
          port: info.port,
          localIps: info.localIps || [],
          primaryLocalUrl: info.primaryLocalUrl || window.location.origin
        });
      }
    } catch {
      // Server might be unreachable or offline
    }
  }, []);

  // Sync Engine (Bidirectional merge)
  const triggerSync = useCallback(async (customData = null) => {
    setSyncState('syncing');
    try {
      const payload = customData || data;
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Sync endpoint returned ' + res.status);

      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        setLastSynced(new Date());
        setSyncState('synced');
      } else {
        setSyncState('error');
      }
    } catch (err) {
      console.warn('Sync connection error:', err);
      setSyncState('offline');
    }
  }, [data]);

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;
    async function init() {
      await fetchStatus();
      try {
        setSyncState('syncing');
        const res = await fetch('/api/data');
        if (res.ok) {
          const serverDb = await res.json();
          if (isMounted && serverDb && serverDb.shelf) {
            setData(serverDb);
            setLastSynced(new Date());
            setSyncState('synced');
          }
        } else {
          if (isMounted) setSyncState('offline');
        }
      } catch {
        if (isMounted) setSyncState('offline');
      }
    }
    init();
    return () => { isMounted = false; };
  }, [fetchStatus]);

  // Background auto-sync interval (every 8 seconds) and on window focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync();
      } else {
        setSyncState('offline');
      }
    }, 8000);

    const onFocus = () => {
      if (navigator.onLine) triggerSync();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    window.addEventListener('offline', () => setSyncState('offline'));

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      window.removeEventListener('offline', () => setSyncState('offline'));
    };
  }, [triggerSync]);

  // Helper for optimistic update followed by push sync
  const updateAndSync = useCallback((updater) => {
    setData((prev) => {
      const updated = updater(prev);
      // Trigger background sync with updated state
      setTimeout(() => triggerSync(updated), 50);
      return updated;
    });
  }, [triggerSync]);

  // ==========================================
  // APP SPECIFIC CRUD ACTIONS
  // ==========================================

  // 1. SHELF
  const addShelfItem = (item) => {
    const newItem = {
      ...item,
      id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      shelf: {
        ...prev.shelf,
        items: [newItem, ...(prev.shelf.items || [])],
        genres: newItem.genre && !prev.shelf.genres.includes(newItem.genre)
          ? [...prev.shelf.genres, newItem.genre]
          : prev.shelf.genres
      }
    }));
    showToast('Saved to Shelf');
  };

  const updateShelfItem = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      shelf: {
        ...prev.shelf,
        items: (prev.shelf.items || []).map(item =>
          item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
        ),
        genres: updates.genre && !prev.shelf.genres.includes(updates.genre)
          ? [...prev.shelf.genres, updates.genre]
          : prev.shelf.genres
      }
    }));
    showToast('Shelf item updated');
  };

  const deleteShelfItem = (id) => {
    updateAndSync(prev => ({
      ...prev,
      shelf: {
        ...prev.shelf,
        items: (prev.shelf.items || []).filter(item => item.id !== id)
      }
    }));
    showToast('Item deleted from Shelf');
  };

  const toggleShelfFavorite = (id) => {
    updateAndSync(prev => ({
      ...prev,
      shelf: {
        ...prev.shelf,
        items: (prev.shelf.items || []).map(item =>
          item.id === id ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString() } : item
        )
      }
    }));
  };

  const addShelfGenre = (genre) => {
    if (!genre || !genre.trim()) return;
    const clean = genre.trim();
    updateAndSync(prev => {
      if (prev.shelf.genres.includes(clean)) return prev;
      return {
        ...prev,
        shelf: { ...prev.shelf, genres: [...prev.shelf.genres, clean] }
      };
    });
  };

  const addShelfCollection = (name) => {
    if (!name || !name.trim()) return;
    const newCol = { id: `col-${Date.now()}`, name: name.trim() };
    updateAndSync(prev => ({
      ...prev,
      shelf: { ...prev.shelf, collections: [...(prev.shelf.collections || []), newCol] }
    }));
    showToast('Collection created');
  };

  // 2. BUDGET
  const addBudgetGoal = (goal) => {
    const newGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      targetAmount: Number(goal.targetAmount) || 0,
      currentAmount: Number(goal.currentAmount) || 0,
      createdAt: new Date().toISOString(),
      history: []
    };
    updateAndSync(prev => ({
      ...prev,
      budget: { ...prev.budget, goals: [...(prev.budget.goals || []), newGoal] }
    }));
    showToast('Savings Target created');
  };

  const updateBudgetGoal = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        goals: (prev.budget.goals || []).map(g => g.id === id ? { ...g, ...updates } : g)
      }
    }));
    showToast('Savings Target updated');
  };

  const deleteBudgetGoal = (id) => {
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        goals: (prev.budget.goals || []).filter(g => g.id !== id)
      }
    }));
    showToast('Target deleted');
  };

  const depositToGoal = (goalId, amount, note = '') => {
    const num = Number(amount) || 0;
    if (num <= 0) return;
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        goals: (prev.budget.goals || []).map(g => {
          if (g.id !== goalId) return g;
          const newAmount = (g.currentAmount || 0) + num;
          const entry = {
            id: `hist-${Date.now()}`,
            type: 'add',
            amount: num,
            note: note || 'Contribution',
            date: new Date().toISOString()
          };
          return {
            ...g,
            currentAmount: newAmount,
            history: [entry, ...(g.history || [])]
          };
        })
      }
    }));
    showToast(`Added ₹${num.toLocaleString('en-IN')}`);
  };

  const withdrawFromGoal = (goalId, amount, note = '') => {
    const num = Number(amount) || 0;
    if (num <= 0) return;
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        goals: (prev.budget.goals || []).map(g => {
          if (g.id !== goalId) return g;
          const newAmount = Math.max(0, (g.currentAmount || 0) - num);
          const entry = {
            id: `hist-${Date.now()}`,
            type: 'remove',
            amount: num,
            note: note || 'Withdrawal',
            date: new Date().toISOString()
          };
          return {
            ...g,
            currentAmount: newAmount,
            history: [entry, ...(g.history || [])]
          };
        })
      }
    }));
    showToast(`Withdrew ₹${num.toLocaleString('en-IN')}`);
  };

  const deleteGoalHistory = (goalId, histId) => {
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        goals: (prev.budget.goals || []).map(g => {
          if (g.id !== goalId) return g;
          const item = (g.history || []).find(h => h.id === histId);
          if (!item) return g;
          const adj = item.type === 'add' ? -(item.amount || 0) : (item.amount || 0);
          return {
            ...g,
            currentAmount: Math.max(0, (g.currentAmount || 0) + adj),
            history: (g.history || []).filter(h => h.id !== histId)
          };
        })
      }
    }));
    showToast('Transaction removed');
  };

  const addExpense = (expense) => {
    const newExp = {
      ...expense,
      id: `exp-${Date.now()}`,
      amount: Number(expense.amount) || 0,
      date: expense.date || new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        expenses: [newExp, ...(prev.budget.expenses || [])]
      }
    }));
    showToast(`Recorded expense of ₹${newExp.amount.toLocaleString('en-IN')}`);
  };

  const deleteExpense = (id) => {
    updateAndSync(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        expenses: (prev.budget.expenses || []).filter(e => e.id !== id)
      }
    }));
    showToast('Expense removed');
  };

  // 3. CONTACTS
  const addContact = (contact) => {
    const newContact = {
      ...contact,
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      contacts: [newContact, ...(prev.contacts || [])]
    }));
    showToast('Contact saved');
  };

  const updateContact = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      contacts: (prev.contacts || []).map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    }));
    showToast('Contact updated');
  };

  const deleteContact = (id) => {
    updateAndSync(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter(c => c.id !== id)
    }));
    showToast('Contact deleted');
  };

  // 4. VAULT (No PIN / Passwords protection)
  const addPassword = (pwd) => {
    const newPwd = {
      ...pwd,
      id: `v-pwd-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      vault: {
        ...prev.vault,
        passwords: [newPwd, ...(prev.vault.passwords || [])]
      }
    }));
    showToast('Password credentials saved');
  };

  const updatePassword = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      vault: {
        ...prev.vault,
        passwords: (prev.vault.passwords || []).map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      }
    }));
    showToast('Password entry updated');
  };

  const deletePassword = (id) => {
    updateAndSync(prev => ({
      ...prev,
      vault: {
        ...prev.vault,
        passwords: (prev.vault.passwords || []).filter(p => p.id !== id)
      }
    }));
    showToast('Password deleted');
  };

  const addLink = (link) => {
    const newLink = {
      ...link,
      id: `v-link-${Date.now()}`,
      savedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      vault: {
        ...prev.vault,
        links: [newLink, ...(prev.vault.links || [])]
      }
    }));
    showToast('Link saved');
  };

  const updateLink = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      vault: {
        ...prev.vault,
        links: (prev.vault.links || []).map(l =>
          l.id === id ? { ...l, ...updates } : l
        )
      }
    }));
    showToast('Link updated');
  };

  const deleteLink = (id) => {
    updateAndSync(prev => ({
      ...prev,
      vault: {
        ...prev.vault,
        links: (prev.vault.links || []).filter(l => l.id !== id)
      }
    }));
    showToast('Link deleted');
  };

  // 5. WISHLIST (No PIN protection)
  const addWishlistItem = (item) => {
    const newItem = {
      ...item,
      id: `w-item-${Date.now()}`,
      price: Number(item.price) || 0,
      purchased: Boolean(item.purchased),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      wishlist: {
        ...prev.wishlist,
        items: [newItem, ...(prev.wishlist.items || [])],
        categories: newItem.category && !prev.wishlist.categories.includes(newItem.category)
          ? [...prev.wishlist.categories, newItem.category]
          : prev.wishlist.categories
      }
    }));
    showToast('Wishlist item added');
  };

  const updateWishlistItem = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      wishlist: {
        ...prev.wishlist,
        items: (prev.wishlist.items || []).map(item =>
          item.id === id ? {
            ...item,
            ...updates,
            price: Number(updates.price !== undefined ? updates.price : item.price) || 0,
            updatedAt: new Date().toISOString()
          } : item
        ),
        categories: updates.category && !prev.wishlist.categories.includes(updates.category)
          ? [...prev.wishlist.categories, updates.category]
          : prev.wishlist.categories
      }
    }));
    showToast('Wishlist updated');
  };

  const deleteWishlistItem = (id) => {
    updateAndSync(prev => ({
      ...prev,
      wishlist: {
        ...prev.wishlist,
        items: (prev.wishlist.items || []).filter(item => item.id !== id)
      }
    }));
    showToast('Item deleted from Wishlist');
  };

  const toggleWishlistPurchased = (id) => {
    updateAndSync(prev => ({
      ...prev,
      wishlist: {
        ...prev.wishlist,
        items: (prev.wishlist.items || []).map(item =>
          item.id === id ? { ...item, purchased: !item.purchased, updatedAt: new Date().toISOString() } : item
        )
      }
    }));
  };

  const addWishlistCategory = (cat) => {
    if (!cat || !cat.trim()) return;
    const clean = cat.trim();
    updateAndSync(prev => {
      if (prev.wishlist.categories.includes(clean)) return prev;
      return {
        ...prev,
        wishlist: { ...prev.wishlist, categories: [...prev.wishlist.categories, clean] }
      };
    });
  };

  // 6. JOB APPLICATION TRACKER
  const addJobApplication = (job) => {
    const newJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      appliedDate: job.appliedDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      jobs: [newJob, ...(prev.jobs || [])]
    }));
    showToast('Job application recorded');
  };

  const updateJobApplication = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      jobs: (prev.jobs || []).map(j =>
        j.id === id ? { ...j, ...updates, updatedAt: new Date().toISOString() } : j
      )
    }));
    showToast('Application updated');
  };

  const deleteJobApplication = (id) => {
    updateAndSync(prev => ({
      ...prev,
      jobs: (prev.jobs || []).filter(j => j.id !== id)
    }));
    showToast('Application removed');
  };

  // Period Tracker Methods
  const updatePeriodSettings = (newSettings) => {
    updateAndSync(prev => ({
      ...prev,
      period: {
        ...(prev.period || {}),
        settings: {
          ...(prev.period?.settings || { cycleDuration: 28, periodDuration: 5 }),
          ...newSettings
        }
      }
    }));
    showToast('Cycle settings updated');
  };

  const addPeriodLog = (log) => {
    const newLog = {
      ...log,
      id: log.id || `period-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updateAndSync(prev => ({
      ...prev,
      period: {
        ...(prev.period || {}),
        logs: [newLog, ...(prev.period?.logs || [])].sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      }
    }));
    showToast('Period recorded');
  };

  const updatePeriodLog = (id, updates) => {
    updateAndSync(prev => ({
      ...prev,
      period: {
        ...(prev.period || {}),
        logs: (prev.period?.logs || [])
          .map(l => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l))
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      }
    }));
    showToast('Period log updated');
  };

  const deletePeriodLog = (id) => {
    updateAndSync(prev => ({
      ...prev,
      period: {
        ...(prev.period || {}),
        logs: (prev.period?.logs || []).filter(l => l.id !== id)
      }
    }));
    showToast('Period log deleted');
  };

  // Full Import JSON
  const importDatabase = async (jsonObj) => {
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonObj)
      });
      if (!res.ok) throw new Error('Import failed on server');
      const result = await res.json();
      setData(result.data);
      showToast('Database imported successfully!');
    } catch {
      // Fallback local update
      setData(jsonObj);
      showToast('Data imported locally');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentApp,
        navigateTo,
        data,
        syncState,
        lastSynced,
        serverInfo,
        triggerSync,
        isDeviceModalOpen,
        setIsDeviceModalOpen,
        toast,
        showToast,

        // Shelf
        addShelfItem,
        updateShelfItem,
        deleteShelfItem,
        toggleShelfFavorite,
        addShelfGenre,
        addShelfCollection,

        // Budget
        addBudgetGoal,
        updateBudgetGoal,
        deleteBudgetGoal,
        depositToGoal,
        withdrawFromGoal,
        deleteGoalHistory,
        addExpense,
        deleteExpense,

        // Contacts
        addContact,
        updateContact,
        deleteContact,

        // Vault
        addPassword,
        updatePassword,
        deletePassword,
        addLink,
        updateLink,
        deleteLink,

        // Wishlist
        addWishlistItem,
        updateWishlistItem,
        deleteWishlistItem,
        toggleWishlistPurchased,
        addWishlistCategory,

        // Jobs
        addJobApplication,
        updateJobApplication,
        deleteJobApplication,

        // Period Tracker
        updatePeriodSettings,
        addPeriodLog,
        updatePeriodLog,
        deletePeriodLog,

        // Import
        importDatabase
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
