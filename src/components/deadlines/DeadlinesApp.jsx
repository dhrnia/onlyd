import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Calendar,
  Plus,
  Search,
  Trash2,
  Edit2,
  ArrowLeft,
  X,
  Cake,
  GraduationCap,
  Briefcase,
  Receipt,
  Sparkles,
  Tag,
  Clock,
  Repeat
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function getCategoryIcon(cat) {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('birth')) return Cake;
  if (lower.includes('exam') || lower.includes('test') || lower.includes('quiz')) return GraduationCap;
  if (lower.includes('work') || lower.includes('job') || lower.includes('project')) return Briefcase;
  if (lower.includes('bill') || lower.includes('pay') || lower.includes('rent')) return Receipt;
  if (lower.includes('anniversary') || lower.includes('celebration')) return Sparkles;
  return CalendarClock;
}

function getTodayDetails() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedLong = now.toLocaleDateString('en-US', options);

  return { year, month, day, dateStr, formattedLong };
}

function parseDate(dateStr) {
  if (!dateStr) return { year: 2026, month: 1, day: 1 };
  const parts = dateStr.split('-').map(Number);
  return {
    year: parts[0] || 2026,
    month: parts[1] || 1,
    day: parts[2] || 1
  };
}

function getNextOccurrence(dateStr, recurring) {
  const today = getTodayDetails();
  const parsed = parseDate(dateStr);

  if (recurring === 'yearly') {
    let targetYear = today.year;
    if (parsed.month < today.month || (parsed.month === today.month && parsed.day < today.day)) {
      targetYear = today.year + 1;
    }
    return new Date(Date.UTC(targetYear, parsed.month - 1, parsed.day));
  }

  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

function calculateDaysLeft(dateStr, recurring) {
  const today = getTodayDetails();
  const todayUtcMs = Date.UTC(today.year, today.month - 1, today.day);
  const nextDate = getNextOccurrence(dateStr, recurring);
  const diffMs = nextDate.getTime() - todayUtcMs;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatTargetDate(dateStr, recurring) {
  if (!dateStr) return '';
  const parsed = parseDate(dateStr);
  const dateObj = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  
  if (recurring === 'yearly') {
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function DeadlinesApp() {
  const { data, addDeadline, updateDeadline, deleteDeadline, navigateTo } = useApp();
  const deadlines = data.deadlines || [];

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'all', 'past'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    category: '',
    recurring: 'none', // 'none' (One Time) or 'yearly'
    notes: ''
  });

  const today = useMemo(() => getTodayDetails(), []);

  // Dynamically extract all existing categories typed by user
  const existingCategories = useMemo(() => {
    const set = new Set();
    deadlines.forEach(d => {
      const cat = (d.category || '').trim();
      if (cat) {
        set.add(cat);
      }
    });
    return Array.from(set);
  }, [deadlines]);

  // Enrich each deadline with daysLeft & nextOccurrence
  const enrichedDeadlines = useMemo(() => {
    return deadlines.map(item => {
      const recurring = item.recurring === 'yearly' ? 'yearly' : 'none';
      const daysLeft = calculateDaysLeft(item.date, recurring);
      const nextDate = getNextOccurrence(item.date, recurring);
      const isToday = daysLeft === 0;
      return {
        ...item,
        recurring,
        daysLeft,
        nextDate,
        isToday
      };
    });
  }, [deadlines]);

  // Find today's events (if any)
  const todaysEvents = useMemo(() => {
    return enrichedDeadlines.filter(d => d.isToday);
  }, [enrichedDeadlines]);

  // Top 3 Upcoming Events (daysLeft >= 0, nearest first)
  const top3Upcoming = useMemo(() => {
    return enrichedDeadlines
      .filter(d => d.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [enrichedDeadlines]);

  // Filtered & sorted list for bottom view
  const filteredDeadlines = useMemo(() => {
    let list = [...enrichedDeadlines];

    // Filter by tab
    if (filterTab === 'upcoming') {
      list = list.filter(d => d.daysLeft >= 0);
      list.sort((a, b) => a.daysLeft - b.daysLeft);
    } else if (filterTab === 'past') {
      list = list.filter(d => d.daysLeft < 0 && d.recurring === 'none');
      list.sort((a, b) => b.daysLeft - a.daysLeft); // most recent past first
    } else {
      // all
      list.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(d => (d.category || '').trim().toLowerCase() === selectedCategory.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [enrichedDeadlines, filterTab, selectedCategory, searchQuery]);

  const openAddModal = (presetCategory = '') => {
    setEditingItem(null);
    setFormData({
      title: '',
      date: today.dateStr,
      category: presetCategory,
      recurring: 'none',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      date: item.date,
      category: item.category || '',
      recurring: item.recurring === 'yearly' ? 'yearly' : 'none',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    const payload = {
      ...formData,
      category: formData.category.trim() || 'General',
      recurring: formData.recurring === 'yearly' ? 'yearly' : 'none'
    };

    if (editingItem) {
      updateDeadline(editingItem.id, payload);
    } else {
      addDeadline(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this deadline?')) {
      deleteDeadline(id);
    }
  };

  const previewDaysLeft = useMemo(() => {
    if (!formData.date) return null;
    return calculateDaysLeft(formData.date, formData.recurring);
  }, [formData.date, formData.recurring]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('home')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-black shadow-xs hover:bg-black hover:text-white transition"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl flex items-center gap-2">
              <CalendarClock size={28} />
              Deadlines
            </h1>
            <p className="text-xs sm:text-sm text-black/60">
              Countdowns for Birthdays, Exams & Important Dates
            </p>
          </div>
        </div>

        <button
          onClick={() => openAddModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-black/80 transition active:scale-95"
        >
          <Plus size={16} />
          <span>Add Deadline</span>
        </button>
      </div>

      {/* Hero Spotlight: Today's Date Banner */}
      <div className="mb-6 rounded-2xl border border-black/10 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-xs">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-black/40">
              Today's Date
            </div>
            <div className="text-lg sm:text-xl font-bold text-black tracking-tight">
              {today.formattedLong}
            </div>
          </div>
        </div>

        {todaysEvents.length > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white shadow-xs">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider">
              Today
            </span>
            <span>{todaysEvents[0].title}</span>
            {todaysEvents[0].category && (
              <span className="text-white/60">({todaysEvents[0].category})</span>
            )}
            {todaysEvents.length > 1 && (
              <span className="text-white/60">+{todaysEvents.length - 1} more</span>
            )}
          </div>
        ) : (
          <div className="text-xs font-semibold text-black/50 bg-black/5 px-3 py-1.5 rounded-xl border border-black/5">
            No deadlines scheduled for today
          </div>
        )}
      </div>

      {/* 3 Upcoming Events Spotlight Board */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-black" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
              3 Upcoming Events
            </h2>
          </div>
          <span className="text-xs text-black/40">
            Next dates to remember
          </span>
        </div>

        {top3Upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/20 bg-white/50 p-8 text-center">
            <Clock size={32} className="mx-auto text-black/20 mb-2" />
            <h3 className="text-sm font-bold text-black">No upcoming events</h3>
            <p className="mt-1 text-xs text-black/50">
              Add birthdays, exams or deadlines to track your next 3 upcoming dates.
            </p>
            <button
              onClick={() => openAddModal()}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-black/80 transition"
            >
              <Plus size={14} /> Add First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[0, 1, 2].map((slotIndex) => {
              const item = top3Upcoming[slotIndex];
              const slotLabel = `#${slotIndex + 1} Upcoming`;

              if (!item) {
                return (
                  <button
                    key={`empty-${slotIndex}`}
                    onClick={() => openAddModal()}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-white/40 p-5 text-center hover:border-black/40 hover:bg-white/80 transition group min-h-[160px]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-black/40 group-hover:bg-black group-hover:text-white transition">
                      <Plus size={16} />
                    </div>
                    <span className="mt-2 text-xs font-bold text-black/40 group-hover:text-black">
                      {slotLabel}
                    </span>
                    <span className="text-[11px] text-black/30 mt-0.5">
                      Tap to add event
                    </span>
                  </button>
                );
              }

              const Icon = getCategoryIcon(item.category);
              const isFirst = slotIndex === 0;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-2xl p-5 shadow-xs transition relative overflow-hidden ${
                    isFirst
                      ? 'bg-black text-white border border-black shadow-sm'
                      : 'bg-white text-black border border-black/10 hover:border-black/30'
                  }`}
                >
                  {/* Top Slot Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isFirst ? 'bg-white/20 text-white' : 'bg-black/5 text-black/60'
                      }`}
                    >
                      {slotIndex === 0 ? 'Next Event' : slotLabel}
                    </span>
                    {item.category && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isFirst ? 'bg-white/10 text-white/80' : 'bg-black/5 text-black/70'
                        }`}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Main Countdown & Title */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-3xl sm:text-4xl font-black tracking-tight ${
                          isFirst ? 'text-white' : 'text-black'
                        }`}
                      >
                        {item.daysLeft}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isFirst ? 'text-white/70' : 'text-black/50'
                        }`}
                      >
                        {item.daysLeft === 0
                          ? 'today'
                          : item.daysLeft === 1
                          ? 'day left'
                          : 'days left'}
                      </span>
                    </div>

                    <h3
                      className={`mt-2 text-base font-bold tracking-tight truncate ${
                        isFirst ? 'text-white' : 'text-black'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    <p
                      className={`mt-0.5 text-xs flex items-center gap-1.5 ${
                        isFirst ? 'text-white/60' : 'text-black/50'
                      }`}
                    >
                      <span>{formatTargetDate(item.date, item.recurring)}</span>
                      {item.recurring === 'yearly' && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Repeat size={10} />
                            Yearly
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Action row */}
                  <div
                    className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${
                      isFirst ? 'border-white/10 text-white/50' : 'border-black/5 text-black/40'
                    }`}
                  >
                    <span className="text-[10px]">
                      {item.recurring === 'yearly' ? 'Yearly' : 'One Time'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className={`p-1 rounded-md transition ${
                          isFirst
                            ? 'hover:bg-white/10 text-white/70 hover:text-white'
                            : 'hover:bg-black/5 text-black/60 hover:text-black'
                        }`}
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className={`p-1 rounded-md transition ${
                          isFirst
                            ? 'hover:bg-white/10 text-white/50 hover:text-white'
                            : 'hover:bg-black/5 text-black/40 hover:text-black'
                        }`}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls: Search, Tabs & Dynamic Category Pills */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search by event title, category, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* View Tab Selector */}
          <div className="flex rounded-xl border border-black/10 bg-white p-1 shadow-2xs shrink-0">
            <button
              onClick={() => setFilterTab('upcoming')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterTab === 'upcoming'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Upcoming ({enrichedDeadlines.filter(d => d.daysLeft >= 0).length})
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterTab === 'all'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              All ({enrichedDeadlines.length})
            </button>
            <button
              onClick={() => setFilterTab('past')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterTab === 'past'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Past ({enrichedDeadlines.filter(d => d.daysLeft < 0 && d.recurring === 'none').length})
            </button>
          </div>
        </div>

        {/* Dynamic Category Pills (if user has typed categories) */}
        {existingCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 transition ${
                selectedCategory === 'all'
                  ? 'bg-black text-white shadow-xs'
                  : 'border border-black/10 bg-white text-black/70 hover:border-black/30'
              }`}
            >
              <span>All Categories</span>
            </button>
            {existingCategories.map(cat => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 transition ${
                    isSelected
                      ? 'bg-black text-white shadow-xs'
                      : 'border border-black/10 bg-white text-black/70 hover:border-black/30'
                  }`}
                >
                  <Tag size={12} />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* All Deadlines List */}
      {filteredDeadlines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-white/50 p-12 text-center">
          <CalendarClock size={36} className="mx-auto text-black/20 mb-3" />
          <h3 className="text-base font-bold text-black">No deadlines found</h3>
          <p className="mt-1 text-xs text-black/50">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Add your birthdays, upcoming exams, or important dates.'}
          </p>
          <button
            onClick={() => openAddModal()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-black/80 transition"
          >
            <Plus size={14} /> Add Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredDeadlines.map((item) => {
            const Icon = getCategoryIcon(item.category);
            const isPast = item.daysLeft < 0;
            const isToday = item.daysLeft === 0;

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs hover:border-black/30 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-black group-hover:bg-black group-hover:text-white transition">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-black tracking-tight truncate">
                          {item.title}
                        </h3>
                        {item.category && (
                          <span className="rounded-md border border-black/10 bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/70">
                            {item.category}
                          </span>
                        )}
                        {item.recurring === 'yearly' && (
                          <span className="flex items-center gap-1 rounded-md border border-black/10 bg-black/5 px-2 py-0.5 text-[10px] font-medium text-black/60">
                            <Repeat size={10} />
                            Yearly
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-black/60">
                        <span className="font-medium">
                          {formatTargetDate(item.date, item.recurring)}
                        </span>
                        {item.recurring === 'yearly' && (
                          <span className="text-black/40">
                            (Next: {item.nextDate.getUTCFullYear()})
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="mt-2 text-xs text-black/50 line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Countdown Badge */}
                  <div className="shrink-0 text-right">
                    {isToday ? (
                      <div className="rounded-xl bg-black px-3 py-1.5 text-center text-white shadow-xs">
                        <div className="text-xs font-black uppercase tracking-wider">Today!</div>
                        <div className="text-[9px] text-white/70">0 days left</div>
                      </div>
                    ) : isPast ? (
                      <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-1.5 text-center text-black/60">
                        <div className="text-xs font-bold">{Math.abs(item.daysLeft)}d ago</div>
                        <div className="text-[9px] uppercase tracking-wider">Passed</div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-1.5 text-center text-black">
                        <div className="text-sm font-black tracking-tight">
                          {item.daysLeft} {item.daysLeft === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-black/50">left</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs text-black/40">
                  <span className="text-[11px]">
                    {item.recurring === 'yearly' ? 'Yearly reminder' : 'One-time deadline'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 text-black/60 hover:text-black transition"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 text-black/40 hover:text-black transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <CalendarClock size={20} />
                {editingItem ? 'Edit Deadline' : 'New Deadline'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-black/40 hover:text-black hover:bg-black/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/70 mb-1.5">
                  Event / Deadline Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mom's Birthday, GRE Exam, Passport Renewal"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/70 mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2 text-sm text-black focus:border-black focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Category (Type field, not fixed) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/70 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="Type category (e.g. Birthday, Exam, Work, Bill, Personal...)"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Recurrence: Just One Time, Yearly */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/70 mb-1.5">
                  Recurrence
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, recurring: 'none' }))}
                    className={`rounded-xl py-2.5 px-3 text-xs font-bold text-center transition ${
                      formData.recurring !== 'yearly'
                        ? 'bg-black text-white shadow-xs'
                        : 'border border-black/10 bg-white text-black/70 hover:border-black/30'
                    }`}
                  >
                    One Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, recurring: 'yearly' }))}
                    className={`rounded-xl py-2.5 px-3 text-xs font-bold text-center transition ${
                      formData.recurring === 'yearly'
                        ? 'bg-black text-white shadow-xs'
                        : 'border border-black/10 bg-white text-black/70 hover:border-black/30'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/70 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Gift ideas, exam center details, notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2 text-sm text-black placeholder:text-black/30 focus:border-black focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Countdown Preview */}
              {previewDaysLeft !== null && (
                <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-center">
                  <span className="text-xs font-bold text-black">
                    {previewDaysLeft === 0
                      ? 'Scheduled for Today!'
                      : previewDaysLeft > 0
                      ? `Countdown: ${previewDaysLeft} ${previewDaysLeft === 1 ? 'day' : 'days'} left`
                      : `Event date passed (${Math.abs(previewDaysLeft)} days ago)`}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-black/80 transition active:scale-95"
                >
                  {editingItem ? 'Save Changes' : 'Add Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
