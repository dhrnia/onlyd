/**
 * Budget - Rupee Savings & Spending Tracker
 * Pure Black & White Monochrome Aesthetic
 * All amounts handled in Indian Rupees (₹ - INR)
 */

// Storage Keys
const STORAGE_KEY_GOALS = 'budget_savings_goals';
const STORAGE_KEY_ACTIVE_GOAL = 'budget_active_goal_id';
const STORAGE_KEY_EXPENSES = 'budget_expenses';

// Pre-defined categories
const EXPENSE_CATEGORIES = [
  { id: 'Food & Dining', name: 'Food & Dining', icon: 'utensils' },
  { id: 'Groceries', name: 'Groceries', icon: 'shopping-cart' },
  { id: 'Shopping', name: 'Shopping', icon: 'shopping-bag' },
  { id: 'Bills & Utilities', name: 'Bills & Utilities', icon: 'receipt' },
  { id: 'Rent & Housing', name: 'Rent & Housing', icon: 'home' },
  { id: 'Transportation', name: 'Transportation', icon: 'car' },
  { id: 'Entertainment', name: 'Entertainment', icon: 'film' },
  { id: 'Healthcare', name: 'Healthcare', icon: 'activity' },
  { id: 'Education', name: 'Education', icon: 'book-open' },
  { id: 'Investments', name: 'Investments', icon: 'trending-up' },
  { id: 'Other', name: 'Other', icon: 'more-horizontal' }
];

// Initial Demo Goals
const DEFAULT_GOALS = [
  {
    id: 'goal-1',
    name: 'Emergency Fund',
    targetAmount: 100000,
    currentAmount: 42500,
    targetDate: '2026-12-31',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    history: [
      { id: 'hist-1', type: 'add', amount: 25000, note: 'Initial allocation from savings', date: new Date(Date.now() - 25 * 86400000).toISOString() },
      { id: 'hist-2', type: 'add', amount: 15000, note: 'Monthly savings contribution', date: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: 'hist-3', type: 'add', amount: 5000, note: 'Freelance project bonus', date: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 'hist-4', type: 'remove', amount: 2500, note: 'Urgent home repair', date: new Date(Date.now() - 1 * 86400000).toISOString() }
    ]
  },
  {
    id: 'goal-2',
    name: 'New Workstation',
    targetAmount: 85000,
    currentAmount: 65000,
    targetDate: '2026-11-30',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    history: [
      { id: 'hist-201', type: 'add', amount: 45000, note: 'Quarterly bonus', date: new Date(Date.now() - 40 * 86400000).toISOString() },
      { id: 'hist-202', type: 'add', amount: 20000, note: 'Monthly allocation', date: new Date(Date.now() - 12 * 86400000).toISOString() }
    ]
  }
];

const DEFAULT_EXPENSES = [
  { id: 'exp-1', amount: 450, category: 'Food & Dining', note: 'Dinner with friends', paymentMethod: 'UPI', date: new Date().toISOString() },
  { id: 'exp-2', amount: 2200, category: 'Groceries', note: 'Monthly supermarket shopping', paymentMethod: 'UPI', date: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'exp-3', amount: 800, category: 'Transportation', note: 'Metro card recharge & fuel', paymentMethod: 'Credit Card', date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'exp-4', amount: 1499, category: 'Bills & Utilities', note: 'Broadband Internet bill', paymentMethod: 'Net Banking', date: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'exp-5', amount: 650, category: 'Entertainment', note: 'Movie tickets', paymentMethod: 'UPI', date: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'exp-6', amount: 1200, category: 'Shopping', note: 'New cotton shirts', paymentMethod: 'Cash', date: new Date(Date.now() - 7 * 86400000).toISOString() }
];

// App State
let goals = [];
let activeGoalId = null;
let currentActiveView = 'savings'; // 'savings' | 'spendings'
let isSavingsExpanded = true;
let expenses = [];

// Currency Formatter for Indian Rupees
function formatINR(amount, includeSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
  return includeSymbol ? `₹${formatted}` : formatted;
}

// Date Formatter
function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Load data from LocalStorage (with legacy key fallback)
function loadData() {
  const storedGoals = localStorage.getItem(STORAGE_KEY_GOALS) || localStorage.getItem('lakshya_savings_goals');
  const storedActiveGoal = localStorage.getItem(STORAGE_KEY_ACTIVE_GOAL) || localStorage.getItem('lakshya_active_goal_id');
  const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES) || localStorage.getItem('lakshya_expenses');

  if (storedGoals) {
    try {
      goals = JSON.parse(storedGoals);
    } catch (e) {
      goals = DEFAULT_GOALS;
    }
  } else {
    goals = DEFAULT_GOALS;
    saveGoals();
  }

  if (storedActiveGoal && goals.find(g => g.id === storedActiveGoal)) {
    activeGoalId = storedActiveGoal;
  } else if (goals.length > 0) {
    activeGoalId = goals[0].id;
    saveActiveGoalId();
  }

  if (storedExpenses) {
    try {
      expenses = JSON.parse(storedExpenses);
    } catch (e) {
      expenses = DEFAULT_EXPENSES;
    }
  } else {
    expenses = DEFAULT_EXPENSES;
    saveExpenses();
  }
}

// Save helpers
function saveGoals() {
  localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
}

function saveActiveGoalId() {
  localStorage.setItem(STORAGE_KEY_ACTIVE_GOAL, activeGoalId);
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
}

// Get active goal
function getActiveGoal() {
  return goals.find(g => g.id === activeGoalId) || goals[0] || null;
}

// Switch between Main Views
function switchMainView(view, goalId = null) {
  currentActiveView = view;
  const viewSavings = document.getElementById('view-savings');
  const viewSpendings = document.getElementById('view-spendings');
  const navSpendingsBtn = document.getElementById('sidebar-nav-spendings');
  const navSavingsHeader = document.getElementById('sidebar-savings-header');

  if (goalId && goals.some(g => g.id === goalId)) {
    activeGoalId = goalId;
    saveActiveGoalId();
  }

  if (view === 'savings') {
    if (viewSavings) viewSavings.classList.remove('hidden');
    if (viewSpendings) viewSpendings.classList.add('hidden');

    if (navSpendingsBtn) {
      navSpendingsBtn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-zinc-400 hover:text-white hover:bg-zinc-900';
    }
    if (navSavingsHeader) {
      navSavingsHeader.classList.add('text-white');
      navSavingsHeader.classList.remove('text-zinc-400');
    }
    renderActiveGoal();
  } else if (view === 'spendings') {
    if (viewSavings) viewSavings.classList.add('hidden');
    if (viewSpendings) viewSpendings.classList.remove('hidden');

    if (navSpendingsBtn) {
      navSpendingsBtn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all bg-white text-black shadow-lg shadow-white/10';
    }
    if (navSavingsHeader) {
      navSavingsHeader.classList.remove('text-white');
      navSavingsHeader.classList.add('text-zinc-400');
    }
    renderExpenseStats();
    renderExpensesList();
  }

  renderSidebarSubModules();
  renderHeaderSummary();
  closeMobileSidebar();
}

// Render Sidebar Sub-Modules under "Savings Target"
function renderSidebarSubModules() {
  const container = document.getElementById('sidebar-targets-list');
  const countBadge = document.getElementById('sidebar-targets-count');
  const chevron = document.getElementById('sidebar-savings-chevron');

  if (countBadge) {
    countBadge.innerText = goals.length.toString();
  }

  if (chevron) {
    chevron.style.transform = isSavingsExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
  }

  if (!container) return;

  if (!isSavingsExpanded) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  let html = '';

  // Render each target as a sub-module item
  goals.forEach(goal => {
    const isSelected = (currentActiveView === 'savings' && goal.id === activeGoalId);
    const progress = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100));

    html += `
      <button onclick="selectGoalFromSidebar('${goal.id}')" class="sub-module-item w-full flex items-center justify-between pl-8 pr-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
        isSelected
          ? 'bg-white text-black font-bold shadow-md'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
      }">
        <span class="truncate pr-2">${goal.name}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-md ${
          isSelected ? 'bg-zinc-200 text-black font-bold' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
        }">${progress}%</span>
      </button>
    `;
  });

  // Action button: + New Target within sub-modules
  html += `
    <button onclick="openCreateGoalModal()" class="w-full flex items-center gap-2 pl-8 pr-3 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all text-left group">
      <i data-lucide="plus" class="w-3.5 h-3.5 group-hover:text-white transition-colors"></i>
      <span>Add New Target</span>
    </button>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

window.selectGoalFromSidebar = function(goalId) {
  switchMainView('savings', goalId);
};

window.openCreateGoalModal = function() {
  document.getElementById('modal-goal-title').innerText = 'Create New Savings Target';
  document.getElementById('goal-form-id').value = '';
  document.getElementById('goal-form-name').value = '';
  document.getElementById('goal-form-target').value = '';
  document.getElementById('goal-form-initial').value = '0';
  document.getElementById('goal-form-initial-group').classList.remove('hidden');
  document.getElementById('goal-form-date').value = '';
  openModal('modal-goal-form');
};

// Toggle Savings Target sub-module accordion
window.toggleSavingsAccordion = function() {
  isSavingsExpanded = !isSavingsExpanded;
  renderSidebarSubModules();
};

// Render Header / Sidebar Summary
function renderHeaderSummary() {
  const totalSaved = goals.reduce((acc, g) => acc + (Number(g.currentAmount) || 0), 0);
  const totalSpent = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const net = totalSaved - totalSpent;

  // Header pills
  const totalSavedEl = document.getElementById('header-total-saved');
  const totalSpentEl = document.getElementById('header-total-spent');
  const netBalanceEl = document.getElementById('header-net-balance');

  if (totalSavedEl) totalSavedEl.innerText = formatINR(totalSaved);
  if (totalSpentEl) totalSpentEl.innerText = formatINR(totalSpent);
  if (netBalanceEl) {
    netBalanceEl.innerText = `${net >= 0 ? '+' : ''}${formatINR(net)}`;
  }

  // Sidebar widget numbers
  const sideSavedEl = document.getElementById('sidebar-total-saved');
  const sideSpentEl = document.getElementById('sidebar-total-spent');
  const sideNetEl = document.getElementById('sidebar-net-balance');

  if (sideSavedEl) sideSavedEl.innerText = formatINR(totalSaved);
  if (sideSpentEl) sideSpentEl.innerText = formatINR(totalSpent);
  if (sideNetEl) sideNetEl.innerText = `${net >= 0 ? '+' : ''}${formatINR(net)}`;
}

// Render Active Goal Card & History
function renderActiveGoal() {
  const goal = getActiveGoal();
  const emptyState = document.getElementById('goal-empty-state');
  const mainGoalCard = document.getElementById('active-goal-card');

  if (!goal) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (mainGoalCard) mainGoalCard.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (mainGoalCard) mainGoalCard.classList.remove('hidden');

  const progressPercent = Math.min(100, Math.max(0, Math.round((goal.currentAmount / goal.targetAmount) * 100)));
  const exactPercent = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const isCompleted = goal.currentAmount >= goal.targetAmount;

  // Texts
  document.getElementById('goal-name-text').innerText = goal.name;
  document.getElementById('goal-target-text').innerText = formatINR(goal.targetAmount);
  document.getElementById('goal-saved-text').innerText = formatINR(goal.currentAmount);
  document.getElementById('goal-remaining-text').innerText = isCompleted ? 'Target Achieved' : `${formatINR(remainingAmount)} left`;
  document.getElementById('goal-progress-percent').innerText = `${exactPercent}%`;

  // Progress Bar - Stark Monochrome
  const progressBar = document.getElementById('goal-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${Math.min(100, progressPercent)}%`;
    if (isCompleted) {
      progressBar.className = 'progress-fill h-full bg-white rounded-full glow-white';
    } else {
      progressBar.className = 'progress-fill h-full bg-gradient-to-r from-zinc-500 via-zinc-200 to-white rounded-full';
    }
  }

  // Completion Badge
  const badge = document.getElementById('goal-status-badge');
  if (badge) {
    if (isCompleted) {
      badge.innerHTML = `<span class="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-white text-black border border-white celebrate-glow"><i data-lucide="check" class="w-3.5 h-3.5"></i> Target Reached</span>`;
    } else {
      badge.innerHTML = `<span class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800"><i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-zinc-400"></i> In Progress</span>`;
    }
  }

  // Target Date Countdown
  const dateInfoEl = document.getElementById('goal-date-info');
  if (dateInfoEl) {
    if (goal.targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetD = new Date(goal.targetDate);
      const diffTime = targetD - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dateBadge = '';
      if (diffDays > 0) {
        dateBadge = `<span class="text-xs text-zinc-400">Target Date: <strong class="text-white">${formatDate(goal.targetDate)}</strong> (${diffDays} days left)</span>`;
      } else if (diffDays === 0) {
        dateBadge = `<span class="text-xs text-white font-semibold border-b border-white pb-0.5">Target deadline is today</span>`;
      } else {
        dateBadge = `<span class="text-xs text-zinc-500">Target date was ${formatDate(goal.targetDate)}</span>`;
      }
      dateInfoEl.innerHTML = dateBadge;
    } else {
      dateInfoEl.innerHTML = `<span class="text-xs text-zinc-500">No deadline set</span>`;
    }
  }

  // Savings History
  renderSavingsHistory(goal);

  // Refresh icons
  if (window.lucide) lucide.createIcons();
}

// Render Savings Transaction History
function renderSavingsHistory(goal) {
  const historyList = document.getElementById('savings-history-list');
  const countEl = document.getElementById('savings-history-count');
  if (!historyList) return;

  const history = goal.history || [];
  if (countEl) countEl.innerText = `(${history.length})`;

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="text-center py-8 text-zinc-500">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="text-sm">No money added or removed yet.</p>
        <p class="text-xs text-zinc-600 mt-1">Use "Add Money" above to begin your savings journey.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  historyList.innerHTML = history.slice().reverse().map(item => {
    const isAdd = item.type === 'add';
    return `
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center ${
            isAdd ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
          }">
            <i data-lucide="${isAdd ? 'arrow-down-left' : 'arrow-up-right'}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="font-medium text-sm text-zinc-100">${item.note || (isAdd ? 'Added to savings' : 'Removed from savings')}</div>
            <div class="text-xs text-zinc-500">${formatDateTime(item.date)}</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-semibold text-sm ${isAdd ? 'text-white' : 'text-zinc-400'}">
            ${isAdd ? '+' : '-'}${formatINR(item.amount)}
          </span>
          <button onclick="deleteSavingsRecord('${goal.id}', '${item.id}')" title="Delete entry" class="text-zinc-500 hover:text-white transition-colors p-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Add Money to Goal
function addMoneyToGoal(goalId, amount, note = '') {
  const goal = goals.find(g => g.id === goalId);
  if (!goal || amount <= 0) return;

  const wasCompleted = goal.currentAmount >= goal.targetAmount;
  goal.currentAmount += amount;
  
  if (!goal.history) goal.history = [];
  goal.history.push({
    id: 'hist-' + Date.now(),
    type: 'add',
    amount: amount,
    note: note.trim() || 'Savings Deposit',
    date: new Date().toISOString()
  });

  saveGoals();
  renderSidebarSubModules();
  renderActiveGoal();
  renderHeaderSummary();

  // Trigger celebration if newly reached or completed!
  if (!wasCompleted && goal.currentAmount >= goal.targetAmount) {
    triggerCelebration();
  }
}

// Remove Money from Goal
function removeMoneyFromGoal(goalId, amount, note = '') {
  const goal = goals.find(g => g.id === goalId);
  if (!goal || amount <= 0) return;

  if (amount > goal.currentAmount) {
    alert(`Cannot remove ${formatINR(amount)}. You currently have ${formatINR(goal.currentAmount)} saved in this target.`);
    return;
  }

  goal.currentAmount -= amount;
  if (!goal.history) goal.history = [];
  goal.history.push({
    id: 'hist-' + Date.now(),
    type: 'remove',
    amount: amount,
    note: note.trim() || 'Savings Withdrawal',
    date: new Date().toISOString()
  });

  saveGoals();
  renderSidebarSubModules();
  renderActiveGoal();
  renderHeaderSummary();
}

// Delete savings history record
window.deleteSavingsRecord = function(goalId, recordId) {
  if (!confirm('Are you sure you want to remove this record? Note: This will adjust your current saved balance.')) return;
  const goal = goals.find(g => g.id === goalId);
  if (!goal || !goal.history) return;

  const index = goal.history.findIndex(h => h.id === recordId);
  if (index !== -1) {
    const item = goal.history[index];
    if (item.type === 'add') {
      goal.currentAmount = Math.max(0, goal.currentAmount - item.amount);
    } else {
      goal.currentAmount += item.amount;
    }
    goal.history.splice(index, 1);
    saveGoals();
    renderSidebarSubModules();
    renderActiveGoal();
    renderHeaderSummary();
  }
};

// Monochromatic Celebration Confetti
function triggerCelebration() {
  if (typeof confetti === 'function') {
    const monoColors = ['#ffffff', '#f4f4f5', '#d4d4d8', '#a1a1aa', '#71717a'];
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: monoColors
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: monoColors
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: monoColors
      });
    }, 250);
  }
}

// Quick Add Money Handler
window.quickAddSavings = function(amount) {
  const goal = getActiveGoal();
  if (!goal) return;
  addMoneyToGoal(goal.id, amount, `Quick Deposit +${formatINR(amount)}`);
};

// ==========================================
// MODULE 2: SPENDINGS / EXPENSE TRACKER
// ==========================================

function renderExpenseStats() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toDateString();

  let spentThisMonth = 0;
  let spentToday = 0;
  const categoryTotals = {};

  expenses.forEach(exp => {
    const d = new Date(exp.date);
    const amt = Number(exp.amount) || 0;

    // Monthly
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      spentThisMonth += amt;
    }

    // Today
    if (d.toDateString() === todayStr) {
      spentToday += amt;
    }

    // Category
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
  });

  // Top Category
  let topCategory = 'None';
  let maxCatAmount = 0;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > maxCatAmount) {
      maxCatAmount = amt;
      topCategory = cat;
    }
  }

  // Update DOM
  const spentMonthEl = document.getElementById('expense-stat-month');
  const spentTodayEl = document.getElementById('expense-stat-today');
  const topCatEl = document.getElementById('expense-stat-top-cat');
  const countEl = document.getElementById('expense-stat-count');

  if (spentMonthEl) spentMonthEl.innerText = formatINR(spentThisMonth);
  if (spentTodayEl) spentTodayEl.innerText = formatINR(spentToday);
  if (topCatEl) topCatEl.innerText = topCategory !== 'None' ? `${topCategory} (${formatINR(maxCatAmount)})` : 'None yet';
  if (countEl) countEl.innerText = expenses.length.toString();
}

// Render Expenses Table with Filtering
function renderExpensesList() {
  const listEl = document.getElementById('expenses-table-body');
  if (!listEl) return;

  const searchInput = document.getElementById('expense-search-input')?.value.toLowerCase().trim() || '';
  const categoryFilter = document.getElementById('expense-category-filter')?.value || 'ALL';
  const sortFilter = document.getElementById('expense-sort-filter')?.value || 'newest';

  // Filter
  let filtered = expenses.filter(exp => {
    const matchesCategory = (categoryFilter === 'ALL' || exp.category === categoryFilter);
    const matchesSearch = !searchInput ||
      (exp.note && exp.note.toLowerCase().includes(searchInput)) ||
      exp.category.toLowerCase().includes(searchInput) ||
      (exp.paymentMethod && exp.paymentMethod.toLowerCase().includes(searchInput)) ||
      exp.amount.toString().includes(searchInput);

    return matchesCategory && matchesSearch;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortFilter === 'newest') return new Date(b.date) - new Date(a.date);
    if (sortFilter === 'oldest') return new Date(a.date) - new Date(b.date);
    if (sortFilter === 'highest') return b.amount - a.amount;
    if (sortFilter === 'lowest') return a.amount - b.amount;
    return 0;
  });

  const emptyEl = document.getElementById('expenses-empty-state');
  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = filtered.map(exp => {
    const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || { icon: 'tag' };
    return `
      <tr class="border-b border-zinc-800/80 hover:bg-zinc-900/60 transition-colors">
        <td class="py-3.5 px-4 text-sm text-zinc-400 whitespace-nowrap">
          ${formatDate(exp.date)}
        </td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-zinc-900 border border-zinc-800 text-white">
              <i data-lucide="${catInfo.icon}" class="w-4 h-4"></i>
            </span>
            <span class="font-medium text-sm text-zinc-200">${exp.category}</span>
          </div>
        </td>
        <td class="py-3.5 px-4 text-sm text-zinc-300">
          ${exp.note || '<span class="text-zinc-600 italic">No description</span>'}
        </td>
        <td class="py-3.5 px-4">
          <span class="text-xs px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
            ${exp.paymentMethod || 'UPI'}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right font-semibold text-white whitespace-nowrap">
          -${formatINR(exp.amount)}
        </td>
        <td class="py-3.5 px-4 text-right">
          <button onclick="deleteExpense('${exp.id}')" title="Delete expense" class="text-zinc-500 hover:text-white transition-colors p-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Add Expense
function addExpense(amount, category, note, paymentMethod, date) {
  if (amount <= 0) return;

  const newExpense = {
    id: 'exp-' + Date.now(),
    amount: Number(amount),
    category: category || 'Other',
    note: (note || '').trim(),
    paymentMethod: paymentMethod || 'UPI',
    date: date ? new Date(date).toISOString() : new Date().toISOString()
  };

  expenses.unshift(newExpense);
  saveExpenses();
  renderExpenseStats();
  renderExpensesList();
  renderHeaderSummary();
}

// Delete Expense
window.deleteExpense = function(expenseId) {
  if (!confirm('Are you sure you want to delete this expense record?')) return;
  expenses = expenses.filter(e => e.id !== expenseId);
  saveExpenses();
  renderExpenseStats();
  renderExpensesList();
  renderHeaderSummary();
};

// ==========================================
// MODAL CONTROLS & EVENT LISTENERS
// ==========================================

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('flex');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}

// Mobile Sidebar Controls
function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('-translate-x-full');
  if (backdrop) backdrop.classList.remove('hidden');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (backdrop) backdrop.classList.add('hidden');
}

// Setup Form Handlers
function setupEventListeners() {
  // Mobile Sidebar Hamburger & Close
  document.getElementById('mobile-menu-btn')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebar-close-btn')?.addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileSidebar);

  // Sidebar Main Modules Navigation
  document.getElementById('sidebar-savings-header')?.addEventListener('click', () => {
    switchMainView('savings');
  });

  document.getElementById('sidebar-nav-spendings')?.addEventListener('click', () => {
    switchMainView('spendings');
  });

  // Add Money Modal triggers
  document.getElementById('btn-open-add-money')?.addEventListener('click', () => {
    const goal = getActiveGoal();
    if (!goal) return alert('Please create or select a savings goal first.');
    document.getElementById('add-money-goal-name').innerText = goal.name;
    document.getElementById('add-money-amount').value = '';
    document.getElementById('add-money-note').value = '';
    openModal('modal-add-money');
  });

  document.getElementById('form-add-money')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const goal = getActiveGoal();
    const amount = Number(document.getElementById('add-money-amount').value);
    const note = document.getElementById('add-money-note').value;
    if (amount > 0 && goal) {
      addMoneyToGoal(goal.id, amount, note);
      closeModal('modal-add-money');
    }
  });

  // Remove Money Modal triggers
  document.getElementById('btn-open-remove-money')?.addEventListener('click', () => {
    const goal = getActiveGoal();
    if (!goal) return;
    document.getElementById('remove-money-goal-name').innerText = goal.name;
    document.getElementById('remove-money-saved-avail').innerText = formatINR(goal.currentAmount);
    document.getElementById('remove-money-amount').value = '';
    document.getElementById('remove-money-note').value = '';
    openModal('modal-remove-money');
  });

  document.getElementById('form-remove-money')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const goal = getActiveGoal();
    const amount = Number(document.getElementById('remove-money-amount').value);
    const note = document.getElementById('remove-money-note').value;
    if (amount > 0 && goal) {
      removeMoneyFromGoal(goal.id, amount, note);
      closeModal('modal-remove-money');
    }
  });

  // Edit / Delete Goal Actions
  document.getElementById('btn-edit-active-goal')?.addEventListener('click', () => {
    const goal = getActiveGoal();
    if (!goal) return;
    document.getElementById('modal-goal-title').innerText = 'Edit Savings Target';
    document.getElementById('goal-form-id').value = goal.id;
    document.getElementById('goal-form-name').value = goal.name;
    document.getElementById('goal-form-target').value = goal.targetAmount;
    document.getElementById('goal-form-initial-group').classList.add('hidden');
    document.getElementById('goal-form-date').value = goal.targetDate || '';
    openModal('modal-goal-form');
  });

  document.getElementById('btn-delete-active-goal')?.addEventListener('click', () => {
    const goal = getActiveGoal();
    if (!goal) return;
    if (confirm(`Are you sure you want to delete target "${goal.name}"?`)) {
      goals = goals.filter(g => g.id !== goal.id);
      activeGoalId = goals.length > 0 ? goals[0].id : null;
      saveGoals();
      saveActiveGoalId();
      renderSidebarSubModules();
      renderActiveGoal();
      renderHeaderSummary();
    }
  });

  // Create Goal Form Submit
  document.getElementById('form-goal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('goal-form-id').value;
    const name = document.getElementById('goal-form-name').value.trim();
    const targetAmount = Number(document.getElementById('goal-form-target').value);
    const initialAmount = Number(document.getElementById('goal-form-initial').value) || 0;
    const targetDate = document.getElementById('goal-form-date').value;

    if (!name || targetAmount <= 0) return;

    if (editId) {
      // Edit existing
      const goal = goals.find(g => g.id === editId);
      if (goal) {
        goal.name = name;
        goal.targetAmount = targetAmount;
        goal.targetDate = targetDate;
      }
    } else {
      // Create new target - will automatically be added as sub-module in the sidebar!
      const newGoal = {
        id: 'goal-' + Date.now(),
        name: name,
        targetAmount: targetAmount,
        currentAmount: initialAmount,
        targetDate: targetDate,
        createdAt: new Date().toISOString(),
        history: initialAmount > 0 ? [{
          id: 'hist-' + Date.now(),
          type: 'add',
          amount: initialAmount,
          note: 'Initial deposit',
          date: new Date().toISOString()
        }] : []
      };
      goals.push(newGoal);
      activeGoalId = newGoal.id;
      saveActiveGoalId();
    }

    saveGoals();
    switchMainView('savings', activeGoalId);
    closeModal('modal-goal-form');
  });

  // Add Expense Modal
  document.getElementById('btn-open-add-expense')?.addEventListener('click', () => {
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-add-expense');
  });

  document.getElementById('form-add-expense')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const note = document.getElementById('expense-note').value;
    const payment = document.getElementById('expense-payment').value;
    const date = document.getElementById('expense-date').value;

    if (amount > 0) {
      addExpense(amount, category, note, payment, date);
      closeModal('modal-add-expense');
    }
  });

  // Filter Listeners
  document.getElementById('expense-search-input')?.addEventListener('input', renderExpensesList);
  document.getElementById('expense-category-filter')?.addEventListener('change', renderExpensesList);
  document.getElementById('expense-sort-filter')?.addEventListener('change', renderExpensesList);

  // Close modal buttons (data-close attributes)
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Backup / Data Export & Import
  document.getElementById('btn-export-data')?.addEventListener('click', () => {
    const backupData = {
      app: 'Budget',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      goals: goals,
      expenses: expenses
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported.goals) && Array.isArray(imported.expenses)) {
          goals = imported.goals;
          expenses = imported.expenses;
          if (goals.length > 0) activeGoalId = goals[0].id;
          saveGoals();
          saveActiveGoalId();
          saveExpenses();
          switchMainView('savings', activeGoalId);
          alert('Data imported successfully!');
          closeModal('modal-data-management');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse the backup JSON file.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-open-data-mgr')?.addEventListener('click', () => {
    openModal('modal-data-management');
  });



  // Populate expense category dropdowns
  populateCategorySelects();
}

function populateCategorySelects() {
  const formSelect = document.getElementById('expense-category');
  const filterSelect = document.getElementById('expense-category-filter');

  if (formSelect) {
    formSelect.innerHTML = EXPENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (filterSelect) {
    const filterOptions = `<option value="ALL">All Categories</option>` +
      EXPENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    filterSelect.innerHTML = filterOptions;
  }
}

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  switchMainView('savings', activeGoalId);

  if (window.lucide) {
    lucide.createIcons();
  }
});
