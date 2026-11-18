import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Sparkles,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  Calendar,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export function MealPlanApp() {
  const { data, updateMealPlan, clearMealPlan, navigateTo } = useApp();

  const mealsList = data.meals || [];

  // Map meals by day for quick lookup
  const mealsMap = useMemo(() => {
    const map = {};
    DAYS_OF_WEEK.forEach(day => {
      map[day] = { day, morning: '', meals: '', evening: '', notes: '' };
    });
    mealsList.forEach(m => {
      if (m && m.day) {
        map[m.day] = {
          day: m.day,
          morning: m.morning || '',
          meals: m.meals || '',
          evening: m.evening || '',
          notes: m.notes || ''
        };
      }
    });
    return map;
  }, [mealsList]);

  // Today's Date & Day Name
  const todayInfo = useMemo(() => {
    const now = new Date();
    const dayIndex = now.getDay(); // 0 is Sunday, 1 is Monday ...
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[dayIndex];
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return {
      dayName: currentDayName,
      formattedDate
    };
  }, []);

  const todayMeals = mealsMap[todayInfo.dayName] || {
    day: todayInfo.dayName,
    morning: '',
    meals: '',
    evening: '',
    notes: ''
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [form, setForm] = useState({
    morning: '',
    meals: '',
    evening: '',
    notes: ''
  });

  const openEditModal = (day) => {
    setSelectedDay(day);
    const dayData = mealsMap[day] || {};
    setForm({
      morning: dayData.morning || '',
      meals: dayData.meals || '',
      evening: dayData.evening || '',
      notes: dayData.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMealPlan(selectedDay, form);
    setIsModalOpen(false);
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
              Weekly Meal Plan
            </h1>
          </div>
        </div>

        <button
          onClick={() => openEditModal(todayInfo.dayName)}
          className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <Edit2 size={13} />
          <span>Edit Today's Meals</span>
        </button>
      </div>

      {/* SPOTLIGHT HERO: TODAY'S MEAL PLAN */}
      <div className="mt-6 rounded-3xl border-2 border-black bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                Today's Spotlight
              </span>
              <span className="text-xs font-extrabold text-black">
                {todayInfo.dayName}
              </span>
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-extrabold text-black tracking-tight">
              {todayInfo.formattedDate}
            </h2>
          </div>

          <button
            onClick={() => openEditModal(todayInfo.dayName)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-black/5 transition shadow-xs self-start sm:self-auto"
          >
            <Edit2 size={12} />
            <span>Update Today</span>
          </button>
        </div>

        {/* 3 Parts Spotlight Grid: Morning, Meals, Evening */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Morning Slot */}
          <div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-[#fafafa] p-4.5 transition hover:border-black/30">
            <div>
              <div className="flex items-center gap-2 text-black/70">
                <Sun size={15} className="text-black" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-black">Morning</span>
              </div>
              <div className="mt-3">
                {todayMeals.morning ? (
                  <p className="text-sm font-semibold text-black whitespace-pre-line leading-relaxed">
                    {todayMeals.morning}
                  </p>
                ) : (
                  <p className="text-xs text-black/40 italic">
                    No morning meal planned.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Meals Slot */}
          <div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-[#fafafa] p-4.5 transition hover:border-black/30">
            <div>
              <div className="flex items-center gap-2 text-black/70">
                <Utensils size={15} className="text-black" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-black">Meals</span>
              </div>
              <div className="mt-3">
                {todayMeals.meals ? (
                  <p className="text-sm font-semibold text-black whitespace-pre-line leading-relaxed">
                    {todayMeals.meals}
                  </p>
                ) : (
                  <p className="text-xs text-black/40 italic">
                    No meal planned.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Evening Slot */}
          <div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-[#fafafa] p-4.5 transition hover:border-black/30">
            <div>
              <div className="flex items-center gap-2 text-black/70">
                <Sunset size={15} className="text-black" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-black">Evening</span>
              </div>
              <div className="mt-3">
                {todayMeals.evening ? (
                  <p className="text-sm font-semibold text-black whitespace-pre-line leading-relaxed">
                    {todayMeals.evening}
                  </p>
                ) : (
                  <p className="text-xs text-black/40 italic">
                    No evening meal planned.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {todayMeals.notes && (
          <div className="mt-4 rounded-xl border border-black/5 bg-[#f5f5f3] p-3 text-xs text-black/70">
            <span className="font-bold text-black">Note: </span>
            <span>{todayMeals.notes}</span>
          </div>
        )}
      </div>

      {/* FULL 7-DAY WEEKLY SCHEDULE BOARD */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-black tracking-tight">
              7-Day Recurring Plan
            </h2>
            <p className="text-xs text-black/50">
              Repeats automatically every week. Click any day to edit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {DAYS_OF_WEEK.map(day => {
            const isToday = day === todayInfo.dayName;
            const dayMeals = mealsMap[day] || {};

            return (
              <div
                key={day}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition shadow-xs ${
                  isToday
                    ? 'border-2 border-black bg-white shadow-sm'
                    : 'border-black/10 bg-white hover:border-black/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-black tracking-tight">
                        {day}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isToday && (
                        <span className="rounded-full bg-black px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                          Today
                        </span>
                      )}
                      <button
                        onClick={() => openEditModal(day)}
                        className="rounded-lg p-1 text-black/40 hover:bg-black/5 hover:text-black transition"
                        title={`Edit ${day}`}
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* 3 Slots */}
                  <div className="mt-3 space-y-2.5 text-xs">
                    {/* Morning */}
                    <div className="rounded-xl border border-black/5 bg-[#fafafa] p-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">
                        <Sun size={10} />
                        <span>Morning</span>
                      </div>
                      <p className="text-xs text-black font-medium line-clamp-2">
                        {dayMeals.morning || <span className="text-black/30 italic">—</span>}
                      </p>
                    </div>

                    {/* Meals */}
                    <div className="rounded-xl border border-black/5 bg-[#fafafa] p-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">
                        <Utensils size={10} />
                        <span>Meals</span>
                      </div>
                      <p className="text-xs text-black font-medium line-clamp-2">
                        {dayMeals.meals || <span className="text-black/30 italic">—</span>}
                      </p>
                    </div>

                    {/* Evening */}
                    <div className="rounded-xl border border-black/5 bg-[#fafafa] p-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">
                        <Sunset size={10} />
                        <span>Evening</span>
                      </div>
                      <p className="text-xs text-black font-medium line-clamp-2">
                        {dayMeals.evening || <span className="text-black/30 italic">—</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-black/5 flex justify-end">
                  <button
                    onClick={() => openEditModal(day)}
                    className="text-[11px] font-bold text-black/60 hover:text-black transition"
                  >
                    Edit →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Day Meal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div className="flex items-center gap-2">
                <Utensils size={16} className="text-black" />
                <h3 className="text-sm font-bold text-black">
                  Edit Plan: {selectedDay}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-black mb-1">
                  <Sun size={12} />
                  <span>Morning</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Oatmeal with chia seeds & black coffee"
                  value={form.morning}
                  onChange={(e) => setForm({ ...form, morning: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-black mb-1">
                  <Utensils size={12} />
                  <span>Meals</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rice, dal, vegetables & salad"
                  value={form.meals}
                  onChange={(e) => setForm({ ...form, meals: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-black mb-1">
                  <Sunset size={12} />
                  <span>Evening</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Light soup, roti or salad"
                  value={form.evening}
                  onChange={(e) => setForm({ ...form, evening: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Notes / Groceries (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Buy fresh spinach, soak almonds overnight"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Clear meals for ${selectedDay}?`)) {
                      clearMealPlan(selectedDay);
                      setIsModalOpen(false);
                    }
                  }}
                  className="text-xs font-semibold text-black/40 hover:text-black transition"
                >
                  Clear Day
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-xs"
                  >
                    Save Plan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
