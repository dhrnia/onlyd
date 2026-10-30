import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Plus,
  Minus,
  Trash2,
  Calendar,
  CheckCircle2,
  Search,
  ArrowLeft,
  X,
  CreditCard,
  Wallet,
  Clock,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Bills & Utilities',
  'Rent & Housing',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Education',
  'Investments',
  'Other'
];

const PAYMENT_METHODS = [
  'UPI',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Net Banking'
];

export function BudgetApp() {
  const {
    data,
    addBudgetGoal,
    deleteBudgetGoal,
    depositToGoal,
    withdrawFromGoal,
    deleteGoalHistory,
    addExpense,
    deleteExpense,
    navigateTo
  } = useApp();

  const [activeTab, setActiveTab] = useState('savings'); // 'savings' | 'spendings'
  const [selectedGoalId, setSelectedGoalId] = useState(null);

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Forms
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [txForm, setTxForm] = useState({ amount: '', note: '' });
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    paymentMethod: 'UPI',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  });

  // Expense search & filter
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');

  const goals = data.budget?.goals || [];
  const expenses = data.budget?.expenses || [];

  // Active goal selection
  const activeGoal = goals.find(g => g.id === selectedGoalId) || goals[0] || null;

  // Aggregate stats
  const totalSaved = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + (Number(g.targetAmount) || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netBalance = totalSaved - totalSpent;

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = expenseSearch.toLowerCase();
      const matchSearch =
        (e.note || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.paymentMethod || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
      return true;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  const formatINR = (val) => {
    return '₹' + (Number(val) || 0).toLocaleString('en-IN');
  };

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!goalForm.name || !goalForm.targetAmount) return;
    addBudgetGoal({
      name: goalForm.name,
      targetAmount: Number(goalForm.targetAmount),
      currentAmount: 0,
      targetDate: goalForm.targetDate
    });
    setGoalForm({ name: '', targetAmount: '', targetDate: '' });
    setIsGoalModalOpen(false);
  };

  const handleDeposit = (e) => {
    e.preventDefault();
    if (!activeGoal || !txForm.amount) return;
    depositToGoal(activeGoal.id, txForm.amount, txForm.note);
    setTxForm({ amount: '', note: '' });
    setIsDepositModalOpen(false);
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    if (!activeGoal || !txForm.amount) return;
    if (Number(txForm.amount) > (activeGoal.currentAmount || 0)) {
      alert('Withdrawal amount cannot exceed currently saved funds.');
      return;
    }
    withdrawFromGoal(activeGoal.id, txForm.amount, txForm.note);
    setTxForm({ amount: '', note: '' });
    setIsWithdrawModalOpen(false);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    addExpense({
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      paymentMethod: expenseForm.paymentMethod,
      date: expenseForm.date,
      note: expenseForm.note
    });
    setExpenseForm({
      amount: '',
      category: EXPENSE_CATEGORIES[0],
      paymentMethod: 'UPI',
      date: new Date().toISOString().slice(0, 10),
      note: ''
    });
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-black/10 pb-6">
        <div>
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 hover:text-black mb-2 transition"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Budget
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-xs">
          <button
            onClick={() => setActiveTab('savings')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'savings'
                ? 'bg-black text-white shadow-xs'
                : 'text-black/60 hover:bg-black/5 hover:text-black'
            }`}
          >
            🎯 Savings Target
          </button>
          <button
            onClick={() => setActiveTab('spendings')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'spendings'
                ? 'bg-black text-white shadow-xs'
                : 'text-black/60 hover:bg-black/5 hover:text-black'
            }`}
          >
            💸 Spendings Log
          </button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-black/50">Total Target Savings</div>
          <div className="mt-2 text-2xl font-extrabold text-black">{formatINR(totalSaved)}</div>
          <div className="mt-1 text-[11px] text-black/50">Across {goals.length} active goals</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-black/50">Total Logged Spendings</div>
          <div className="mt-2 text-2xl font-extrabold text-black">{formatINR(totalSpent)}</div>
          <div className="mt-1 text-[11px] text-black/50">{expenses.length} transactions recorded</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-black/50">Net Savings Balance</div>
          <div className="mt-2 text-2xl font-extrabold text-black">{formatINR(netBalance)}</div>
          <div className="mt-1 text-[11px] text-black/50">Total saved minus spendings</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SAVINGS TARGET */}
      {/* ======================================================== */}
      {activeTab === 'savings' && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Goals List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                Your Targets
              </h2>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                <Plus size={13} />
                <span>New Target</span>
              </button>
            </div>

            {goals.map(g => {
              const isSelected = activeGoal?.id === g.id;
              const pct = Math.min(100, Math.round(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100));
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`rounded-2xl border p-4 transition cursor-pointer ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-md'
                      : 'border-black/10 bg-white text-black hover:border-black/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm">{g.name}</h3>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-white/70' : 'text-black/60'}`}>
                        {formatINR(g.currentAmount)} of {formatINR(g.targetAmount)}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isSelected ? 'bg-white text-black' : 'bg-black/10 text-black'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                    <div
                      className={`h-full transition-all ${isSelected ? 'bg-white' : 'bg-black'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-xs text-black/50">
                No savings targets yet. Click "+ New Target" to begin!
              </div>
            )}
          </div>

          {/* Right Column: Active Goal Details, Quick Add, History */}
          <div className="lg:col-span-2">
            {activeGoal ? (
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
                {/* Active Goal Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-black/10 pb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                      Active Target Milestone
                    </span>
                    <h2 className="text-xl font-bold text-black">{activeGoal.name}</h2>
                    {activeGoal.targetDate && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-black/50">
                        <Calendar size={12} />
                        <span>Target Date: {activeGoal.targetDate}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete target "${activeGoal.name}"?`)) {
                        deleteBudgetGoal(activeGoal.id);
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-black/40 hover:text-black self-start"
                  >
                    <Trash2 size={13} />
                    <span>Delete Target</span>
                  </button>
                </div>

                {/* Progress Bar & Big Amounts */}
                {(() => {
                  const pct = Math.min(100, Math.round(((activeGoal.currentAmount || 0) / (activeGoal.targetAmount || 1)) * 100));
                  const remaining = Math.max(0, (activeGoal.targetAmount || 0) - (activeGoal.currentAmount || 0));
                  const isDone = pct >= 100;

                  return (
                    <div className="mt-6">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-xs text-black/50">Saved so far</div>
                          <div className="text-3xl font-extrabold text-black">
                            {formatINR(activeGoal.currentAmount)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-black/50">Remaining</div>
                          <div className="text-lg font-bold text-black/70">
                            {formatINR(remaining)}
                          </div>
                        </div>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="relative mt-4 h-4 w-full overflow-hidden rounded-full bg-black/10">
                        <div
                          className="h-full bg-black transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Milestone Ticks */}
                      <div className="mt-2 flex justify-between text-[10px] font-semibold text-black/40">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>

                      {isDone && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f5] p-3 text-xs font-semibold text-black">
                          <Sparkles size={16} />
                          <span>Congratulations! You reached 100% of your savings target! 🎉</span>
                        </div>
                      )}

                      {/* Deposit / Withdraw Action Buttons */}
                      <div className="mt-6 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setIsDepositModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition"
                        >
                          <Plus size={14} />
                          <span>Deposit Money (+)</span>
                        </button>
                        <button
                          onClick={() => setIsWithdrawModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-bold text-black hover:bg-black/5 transition"
                        >
                          <Minus size={14} />
                          <span>Withdraw Funds (-)</span>
                        </button>
                      </div>

                      {/* Quick Deposit Shortcuts */}
                      <div className="mt-5 border-t border-black/5 pt-4">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-2">
                          Quick Deposit Shortcuts
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[100, 200, 500, 1000, 2000, 5000].map(amt => (
                            <button
                              key={amt}
                              onClick={() => depositToGoal(activeGoal.id, amt, 'Quick Deposit')}
                              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-black hover:text-white transition"
                            >
                              +₹{amt.toLocaleString('en-IN')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* History Log */}
                      <div className="mt-6 border-t border-black/10 pt-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-black mb-3">
                          Chronological History
                        </h3>
                        {activeGoal.history && activeGoal.history.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {activeGoal.history.map(item => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] p-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-black">
                                    <span
                                      className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                        item.type === 'add' ? 'bg-black text-white' : 'border border-black text-black'
                                      }`}
                                    >
                                      {item.type === 'add' ? '+ Deposit' : '- Withdrawal'}
                                    </span>
                                    <span>{formatINR(item.amount)}</span>
                                  </div>
                                  <div className="text-[11px] text-black/50 mt-0.5">
                                    {item.note || 'No note'} • {new Date(item.date).toLocaleDateString('en-IN')}
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteGoalHistory(activeGoal.id, item.id)}
                                  className="text-black/30 hover:text-black"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-black/40 py-2">No deposits or withdrawals logged yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
                Please select or create a savings target.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SPENDINGS LOG */}
      {/* ======================================================== */}
      {activeTab === 'spendings' && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search & Category Filter */}
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type="text"
                  placeholder="Search spendings..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs text-black placeholder:text-black/40 focus:border-black focus:outline-none"
                />
              </div>

              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black focus:outline-none"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition"
            >
              <Plus size={14} />
              <span>Record Expense</span>
            </button>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xs">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-xs text-black/50">
                No spendings found. Log your first expense with the button above!
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {filteredExpenses.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-[#f7f7f5]/50 transition text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-black">
                        <IndianRupee size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-black">{item.note || item.category}</div>
                        <div className="text-[11px] text-black/50">
                          {item.category} • {item.paymentMethod} • {new Date(item.date).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-black text-sm">
                        {formatINR(item.amount)}
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this expense?')) {
                            deleteExpense(item.id);
                          }
                        }}
                        className="text-black/30 hover:text-black"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: New Target */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Create Savings Target</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Target Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vacation Fund, Bike, Emergency"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black mb-1">Target Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 50000"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Create Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Deposit */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Deposit to {activeGoal?.name}</h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleDeposit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Amount to Add (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Salary bonus, freelance"
                  value={txForm.note}
                  onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Withdraw */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Withdraw from {activeGoal?.name}</h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleWithdraw} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Amount to Withdraw (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={activeGoal?.currentAmount || 0}
                  placeholder={`Max ₹${activeGoal?.currentAmount || 0}`}
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency expense"
                  value={txForm.note}
                  onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Record Spendings (₹)</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 450"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch with team, Groceries"
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
