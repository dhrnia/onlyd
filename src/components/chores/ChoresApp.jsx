import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCw,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  AlertCircle,
  CalendarDays,
  Sparkles,
  ChevronRight,
  List
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function addDays(dateStr, days) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + Number(days)));
  return date.toISOString().slice(0, 10);
}

function diffDays(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return 0;
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

const FREQUENCY_PRESETS = [
  { label: 'Daily', days: 1 },
  { label: 'Every 3 Days', days: 3 },
  { label: 'Weekly', days: 7 },
  { label: 'Bi-Weekly', days: 14 },
  { label: 'Monthly', days: 30 }
];

export function ChoresApp() {
  const { data, addChore, updateChore, deleteChore, completeChore, navigateTo } = useApp();

  const chores = data.chores || [];

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const yesterdayStr = useMemo(() => addDays(todayStr, -1), [todayStr]);
  const tomorrowStr = useMemo(() => addDays(todayStr, 1), [todayStr]);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'all'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState(null);

  const [form, setForm] = useState({
    name: '',
    lastDoneDate: todayStr,
    frequencyDays: 7,
    category: 'General',
    notes: ''
  });

  // Calculate live next date for the form
  const computedNextDate = useMemo(() => {
    return addDays(form.lastDoneDate, form.frequencyDays || 7);
  }, [form.lastDoneDate, form.frequencyDays]);

  const openAddModal = () => {
    setEditingChore(null);
    setForm({
      name: '',
      lastDoneDate: todayStr,
      frequencyDays: 7,
      category: 'General',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (chore) => {
    setEditingChore(chore);
    setForm({
      name: chore.name || '',
      lastDoneDate: chore.lastDoneDate || todayStr,
      frequencyDays: chore.frequencyDays || 7,
      category: chore.category || 'General',
      notes: chore.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      lastDoneDate: form.lastDoneDate,
      frequencyDays: Number(form.frequencyDays) || 7,
      nextDueDate: computedNextDate,
      category: form.category || 'General',
      notes: form.notes || ''
    };

    if (editingChore) {
      updateChore(editingChore.id, payload);
    } else {
      addChore(payload);
    }
    setIsModalOpen(false);
  };

  // Filtered chores
  const filteredChores = useMemo(() => {
    const q = search.toLowerCase();
    return chores.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    );
  }, [chores, search]);

  // Grouped for Board View: Yesterday, Today, Tomorrow, Upcoming
  const boardData = useMemo(() => {
    const yesterday = [];
    const today = [];
    const tomorrow = [];
    const upcoming = [];

    filteredChores.forEach(c => {
      const nextDate = c.nextDueDate;
      if (nextDate <= yesterdayStr) {
        yesterday.push(c);
      } else if (nextDate === todayStr) {
        today.push(c);
      } else if (nextDate === tomorrowStr) {
        tomorrow.push(c);
      } else {
        upcoming.push(c);
      }
    });

    return { yesterday, today, tomorrow, upcoming };
  }, [filteredChores, yesterdayStr, todayStr, tomorrowStr]);

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
              Chores Tracker
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs"
          >
            <Plus size={14} />
            <span>Add Chore</span>
          </button>
        </div>
      </div>

      {/* Snapshot KPI Counters */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">Overdue / Yesterday</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {boardData.yesterday.length}
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">Due Today</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {boardData.today.length}
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">Due Tomorrow</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {boardData.tomorrow.length}
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">Total Active Chores</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {chores.length}
          </div>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-xs self-start">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'board'
                ? 'bg-black text-white shadow-xs'
                : 'text-black/60 hover:bg-black/5 hover:text-black'
            }`}
          >
            <CalendarDays size={13} />
            <span>Board (Yesterday / Today / Tomorrow)</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-black text-white shadow-xs'
                : 'text-black/60 hover:bg-black/5 hover:text-black'
            }`}
          >
            <List size={13} />
            <span>All Chores ({chores.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            placeholder="Search chores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-4 text-xs text-black placeholder:text-black/40 focus:border-black focus:outline-none shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 1. BOARD VIEW: YESTERDAY, TODAY, TOMORROW */}
      {activeTab === 'board' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Column 1: Yesterday / Overdue */}
          <div className="flex flex-col rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-black/40" />
                <h2 className="text-sm font-bold text-black">Yesterday / Overdue</h2>
              </div>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-black/70">
                {boardData.yesterday.length}
              </span>
            </div>

            <div className="mt-3 flex-1 space-y-3">
              {boardData.yesterday.length === 0 ? (
                <div className="py-12 text-center text-xs text-black/40 italic">
                  No chores overdue. All caught up!
                </div>
              ) : (
                boardData.yesterday.map(chore => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    todayStr={todayStr}
                    onComplete={() => completeChore(chore.id)}
                    onEdit={() => openEditModal(chore)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${chore.name}"?`)) {
                        deleteChore(chore.id);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Today */}
          <div className="flex flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-black animate-pulse" />
                <h2 className="text-sm font-bold text-black">Today</h2>
              </div>
              <span className="rounded-full bg-black px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                {boardData.today.length}
              </span>
            </div>

            <div className="mt-3 flex-1 space-y-3">
              {boardData.today.length === 0 ? (
                <div className="py-12 text-center text-xs text-black/40 italic">
                  No chores scheduled for today.
                </div>
              ) : (
                boardData.today.map(chore => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    todayStr={todayStr}
                    isToday
                    onComplete={() => completeChore(chore.id)}
                    onEdit={() => openEditModal(chore)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${chore.name}"?`)) {
                        deleteChore(chore.id);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Tomorrow */}
          <div className="flex flex-col rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-black bg-white" />
                <h2 className="text-sm font-bold text-black">Tomorrow</h2>
              </div>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-black/70">
                {boardData.tomorrow.length}
              </span>
            </div>

            <div className="mt-3 flex-1 space-y-3">
              {boardData.tomorrow.length === 0 ? (
                <div className="py-12 text-center text-xs text-black/40 italic">
                  No chores scheduled for tomorrow.
                </div>
              ) : (
                boardData.tomorrow.map(chore => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    todayStr={todayStr}
                    onComplete={() => completeChore(chore.id)}
                    onEdit={() => openEditModal(chore)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${chore.name}"?`)) {
                        deleteChore(chore.id);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ALL CHORES VIEW */}
      {activeTab === 'all' && (
        <div className="mt-6">
          {filteredChores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
              <CheckSquare size={32} className="mx-auto text-black/30" />
              <h3 className="mt-3 text-sm font-bold text-black">No chores found</h3>
              <p className="mt-1">
                {search ? 'Try adjusting your search query.' : 'Click "Add Chore" to schedule your recurring tasks.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredChores.map(chore => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  todayStr={todayStr}
                  isToday={chore.nextDueDate === todayStr}
                  onComplete={() => completeChore(chore.id)}
                  onEdit={() => openEditModal(chore)}
                  onDelete={() => {
                    if (window.confirm(`Delete "${chore.name}"?`)) {
                      deleteChore(chore.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Preview Section if Board View is active */}
      {activeTab === 'board' && boardData.upcoming.length > 0 && (
        <div className="mt-10 border-t border-black/10 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-black tracking-tight">
              Upcoming Later ({boardData.upcoming.length})
            </h2>
            <button
              onClick={() => setActiveTab('all')}
              className="text-xs font-semibold text-black/50 hover:text-black transition"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boardData.upcoming.map(chore => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                todayStr={todayStr}
                onComplete={() => completeChore(chore.id)}
                onEdit={() => openEditModal(chore)}
                onDelete={() => {
                  if (window.confirm(`Delete "${chore.name}"?`)) {
                    deleteChore(chore.id);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Chore Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingChore ? 'Edit Chore' : 'Add New Chore'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Chore Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water plants, Change bedsheets, Deep clean fridge"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  When I Did The Chore (Last Date) *
                </label>
                <input
                  type="date"
                  required
                  value={form.lastDoneDate}
                  onChange={(e) => setForm({ ...form, lastDoneDate: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Repeat Every (In How Many Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={form.frequencyDays}
                  onChange={(e) => setForm({ ...form, frequencyDays: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
                {/* Frequency Quick Presets */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FREQUENCY_PRESETS.map(preset => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setForm({ ...form, frequencyDays: preset.days })}
                      className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${
                        Number(form.frequencyDays) === preset.days
                          ? 'bg-black text-white border-black'
                          : 'border-black/10 bg-[#f7f7f5] text-black/70 hover:bg-black/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Computed Next Date Preview Box */}
              <div className="rounded-xl border border-black/10 bg-[#f7f7f5] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-black/50">Next Date Due</span>
                  <span className="font-extrabold text-black">
                    {formatDate(computedNextDate)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-black/40">
                  {diffDays(computedNextDate, todayStr) === 0
                    ? 'Due today'
                    : diffDays(computedNextDate, todayStr) === 1
                    ? 'Due tomorrow'
                    : diffDays(computedNextDate, todayStr) < 0
                    ? `${Math.abs(diffDays(computedNextDate, todayStr))} days overdue`
                    : `In ${diffDays(computedNextDate, todayStr)} days`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Supplies needed, room location, reminders..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {editingChore ? 'Save Changes' : 'Create Chore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Chore Card
function ChoreCard({ chore, todayStr, isToday = false, onComplete, onEdit, onDelete }) {
  const daysDiff = diffDays(chore.nextDueDate, todayStr);
  const isOverdue = daysDiff < 0;
  const isTomorrow = daysDiff === 1;

  return (
    <div className={`flex flex-col justify-between rounded-xl border p-3.5 transition shadow-xs ${
      isToday
        ? 'border-black bg-[#fafafa]'
        : isOverdue
        ? 'border-black/20 bg-white'
        : 'border-black/10 bg-white hover:border-black/25'
    }`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-black tracking-tight truncate">
              {chore.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-black/50">
              <span className="flex items-center gap-1">
                <RotateCw size={10} />
                <span>Every {chore.frequencyDays}d</span>
              </span>
              <span>·</span>
              <span>Last: {formatDate(chore.lastDoneDate)}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onEdit}
              className="rounded-lg p-1 text-black/40 hover:bg-black/5 hover:text-black transition"
              title="Edit"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-1 text-black/40 hover:bg-black/5 hover:text-black transition"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {chore.notes && (
          <p className="mt-2 text-[11px] text-black/60 italic line-clamp-2">
            "{chore.notes}"
          </p>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-black/5 pt-2.5">
        <div className="text-[10px]">
          <span className="text-black/40">Next Due: </span>
          <span className={`font-bold ${
            isOverdue
              ? 'text-black underline'
              : isToday
              ? 'text-black font-extrabold'
              : 'text-black/80'
          }`}>
            {formatDate(chore.nextDueDate)}
          </span>
        </div>

        <button
          onClick={onComplete}
          className="flex items-center gap-1 rounded-lg bg-black px-2.5 py-1 text-[11px] font-bold text-white hover:bg-neutral-800 transition active:scale-95 shadow-xs"
          title="Mark done today and calculate next date"
        >
          <CheckCircle2 size={12} />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
}
