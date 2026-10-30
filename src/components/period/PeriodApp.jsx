import React, { useState, useMemo } from 'react';
import {
  CalendarHeart,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  Clock,
  Sparkles,
  Droplets,
  Heart,
  Info,
  CalendarDays
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

const FLOW_LEVELS = ['Light', 'Medium', 'Heavy', 'Spotting'];

export function PeriodApp() {
  const { data, updatePeriodSettings, addPeriodLog, updatePeriodLog, deletePeriodLog, navigateTo } = useApp();

  const periodData = data.period || {
    settings: { cycleDuration: 28, periodDuration: 5 },
    logs: []
  };

  const settings = periodData.settings || { cycleDuration: 28, periodDuration: 5 };
  const logs = periodData.logs || [];

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    cycleDuration: settings.cycleDuration || 28,
    periodDuration: settings.periodDuration || 5
  });

  // Log form state
  const [logForm, setLogForm] = useState({
    startDate: todayStr,
    endDate: addDays(todayStr, (settings.periodDuration || 5) - 1),
    flow: 'Medium',
    notes: ''
  });

  // Calendar View Month Navigation (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Determine latest period log or create a baseline
  const latestLog = useMemo(() => {
    if (logs.length > 0) {
      return [...logs].sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
    }
    return null;
  }, [logs]);

  // Baseline start date (either latest log or 14 days ago if fresh)
  const baselineStartDate = useMemo(() => {
    if (latestLog) return latestLog.startDate;
    return addDays(todayStr, -14);
  }, [latestLog, todayStr]);

  const baselineEndDate = useMemo(() => {
    if (latestLog) return latestLog.endDate;
    return addDays(baselineStartDate, (settings.periodDuration || 5) - 1);
  }, [latestLog, baselineStartDate, settings.periodDuration]);

  // Current Cycle Day and Phase calculations
  const cycleMetrics = useMemo(() => {
    const cycleLength = Number(settings.cycleDuration) || 28;
    const periodLength = Number(settings.periodDuration) || 5;

    // Cycle day count (Day 1 = start date)
    const daysSinceStart = diffDays(todayStr, baselineStartDate);
    const cycleDay = daysSinceStart >= 0 ? (daysSinceStart % cycleLength) + 1 : 1;

    // Next period prediction
    const cyclesElapsed = Math.floor(daysSinceStart / cycleLength);
    const nextStart = addDays(baselineStartDate, cycleLength * Math.max(1, cyclesElapsed + 1));
    const daysUntilNext = diffDays(nextStart, todayStr);

    // Phase identification
    // Day 1 to periodLength: Menstrual
    // Day periodLength+1 to ovulationDay - 6: Follicular
    // Day ovulationDay - 5 to ovulationDay + 1: Fertility Window / Ovulation
    // Day ovulationDay + 2 to cycleLength: Luteal
    const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
    const fertileStartDay = Math.max(periodLength + 1, ovulationDay - 5);
    const fertileEndDay = ovulationDay + 1;

    let phaseName = 'Luteal Phase';
    let phaseDescription = 'Progesterone peaks then drops. Rest, hydrate, and maintain steady nutrition.';
    let isPeriodActive = false;

    if (daysSinceStart >= 0 && daysSinceStart < periodLength) {
      phaseName = 'Menstrual Phase';
      phaseDescription = 'Active period bleeding. Low hormone levels. Prioritize rest and gentle movement.';
      isPeriodActive = true;
    } else if (cycleDay <= periodLength) {
      phaseName = 'Menstrual Phase';
      phaseDescription = 'Active period bleeding. Prioritize rest, comfort, and iron-rich meals.';
      isPeriodActive = true;
    } else if (cycleDay < fertileStartDay) {
      phaseName = 'Follicular Phase';
      phaseDescription = 'Estrogen rises, boosting stamina, creativity, and energy.';
    } else if (cycleDay >= fertileStartDay && cycleDay <= fertileEndDay) {
      if (cycleDay === ovulationDay) {
        phaseName = 'Ovulation Day';
        phaseDescription = 'Peak fertility. The egg is released; energy and social drive peak.';
      } else {
        phaseName = 'Fertility Window';
        phaseDescription = 'High likelihood of conception. Rising LH and estrogen levels.';
      }
    } else {
      phaseName = 'Luteal Phase';
      phaseDescription = 'Progesterone dominance. Metabolism increases slightly. Wind down and prepare.';
    }

    return {
      cycleLength,
      periodLength,
      cycleDay,
      daysUntilNext,
      nextStart,
      phaseName,
      phaseDescription,
      isPeriodActive,
      ovulationDay,
      fertileStartDay,
      fertileEndDay
    };
  }, [settings, baselineStartDate, todayStr]);

  // Upcoming Cycles (next 4 cycles)
  const upcomingCycles = useMemo(() => {
    const list = [];
    const cycleLength = Number(settings.cycleDuration) || 28;
    const periodLength = Number(settings.periodDuration) || 5;

    for (let i = 1; i <= 4; i++) {
      const start = addDays(baselineStartDate, cycleLength * i);
      const end = addDays(start, periodLength - 1);
      const ovDay = addDays(start, cycleLength - 14);
      list.push({
        cycleNumber: i,
        startDate: start,
        endDate: end,
        ovulationDate: ovDay
      });
    }
    return list;
  }, [baselineStartDate, settings]);

  // Calendar Days Matrix
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map recorded period days for quick lookup
    const recordedPeriodSet = new Set();
    logs.forEach(log => {
      let cur = log.startDate;
      while (cur <= log.endDate) {
        recordedPeriodSet.add(cur);
        cur = addDays(cur, 1);
      }
    });

    // Map upcoming predicted period days
    const predictedPeriodSet = new Set();
    const predictedFertileSet = new Set();
    const predictedOvulationSet = new Set();

    upcomingCycles.forEach(cyc => {
      let cur = cyc.startDate;
      while (cur <= cyc.endDate) {
        predictedPeriodSet.add(cur);
        cur = addDays(cur, 1);
      }
      predictedOvulationSet.add(cyc.ovulationDate);
      for (let offset = -5; offset <= 1; offset++) {
        predictedFertileSet.add(addDays(cyc.ovulationDate, offset));
      }
    });

    const days = [];
    // Padding before 1st day of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isToday: dateStr === todayStr,
        isRecordedPeriod: recordedPeriodSet.has(dateStr),
        isPredictedPeriod: predictedPeriodSet.has(dateStr),
        isOvulation: predictedOvulationSet.has(dateStr),
        isFertile: predictedFertileSet.has(dateStr) && !predictedPeriodSet.has(dateStr)
      });
    }

    return days;
  }, [currentMonth, logs, upcomingCycles, todayStr]);

  // Handlers
  const handleOpenSettings = () => {
    setSettingsForm({
      cycleDuration: settings.cycleDuration || 28,
      periodDuration: settings.periodDuration || 5
    });
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updatePeriodSettings({
      cycleDuration: Math.max(15, Math.min(60, Number(settingsForm.cycleDuration) || 28)),
      periodDuration: Math.max(1, Math.min(15, Number(settingsForm.periodDuration) || 5))
    });
    setIsSettingsOpen(false);
  };

  const handleOpenAddLog = (initialDate = todayStr) => {
    setEditingLog(null);
    setLogForm({
      startDate: initialDate,
      endDate: addDays(initialDate, (settings.periodDuration || 5) - 1),
      flow: 'Medium',
      notes: ''
    });
    setIsLogModalOpen(true);
  };

  const handleOpenEditLog = (log) => {
    setEditingLog(log);
    setLogForm({
      startDate: log.startDate,
      endDate: log.endDate,
      flow: log.flow || 'Medium',
      notes: log.notes || ''
    });
    setIsLogModalOpen(true);
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    if (!logForm.startDate || !logForm.endDate) return;

    if (logForm.startDate > logForm.endDate) {
      alert('Start date must be before or on end date');
      return;
    }

    if (editingLog) {
      updatePeriodLog(editingLog.id, logForm);
    } else {
      addPeriodLog(logForm);
    }
    setIsLogModalOpen(false);
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
              Period Tracker
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenSettings}
            className="flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-black/5 transition shadow-xs"
          >
            <Settings size={14} />
            <span>Cycle Settings</span>
          </button>

          <button
            onClick={() => handleOpenAddLog()}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs"
          >
            <Plus size={14} />
            <span>Log Period</span>
          </button>
        </div>
      </div>

      {/* Top Hero KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Countdown / Days Until Next Period */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">
            Next Period
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-black tracking-tight">
              {cycleMetrics.isPeriodActive
                ? 'Period Active'
                : cycleMetrics.daysUntilNext === 0
                ? 'Due Today'
                : cycleMetrics.daysUntilNext > 0
                ? `${cycleMetrics.daysUntilNext} Days`
                : `${Math.abs(cycleMetrics.daysUntilNext)} Days Late`}
            </span>
          </div>
          <div className="mt-2 text-xs text-black/60 flex items-center gap-1.5">
            <CalendarDays size={13} className="text-black/40" />
            <span>Expected {formatDate(cycleMetrics.nextStart)}</span>
          </div>
        </div>

        {/* 2. Current Phase */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">
            Current Phase
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-0.5 text-xs font-bold text-white">
              <Sparkles size={11} />
              {cycleMetrics.phaseName}
            </span>
            <span className="text-xs font-semibold text-black/60">
              Day {cycleMetrics.cycleDay} of {cycleMetrics.cycleLength}
            </span>
          </div>
          <p className="mt-2 text-xs text-black/60 line-clamp-2">
            {cycleMetrics.phaseDescription}
          </p>
        </div>

        {/* 3. Cycle & Period Duration */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">
              Cycle Configuration
            </div>
            <button
              onClick={handleOpenSettings}
              className="text-xs text-black/40 hover:text-black underline"
            >
              Edit
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between border-b border-black/5 pb-2 text-xs">
            <span className="text-black/60">Cycle Duration</span>
            <span className="font-bold text-black">{settings.cycleDuration || 28} Days</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-black/60">Period Duration</span>
            <span className="font-bold text-black">{settings.periodDuration || 5} Days</span>
          </div>
        </div>

        {/* 4. Last Recorded Period */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">
              Last Period
            </div>
            {latestLog && (
              <button
                onClick={() => handleOpenEditLog(latestLog)}
                className="text-xs text-black/40 hover:text-black"
                title="Edit last log"
              >
                <Edit2 size={12} />
              </button>
            )}
          </div>
          <div className="mt-2">
            <div className="text-sm font-extrabold text-black">
              {formatDate(baselineStartDate)}
            </div>
            <div className="text-xs text-black/50 mt-0.5">
              to {formatDate(baselineEndDate)} ({diffDays(baselineEndDate, baselineStartDate) + 1} days)
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/70">
              Flow: {latestLog?.flow || 'Medium'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Calendar + Upcoming Cycles */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Calendar (2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
          {/* Calendar Header */}
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-black" />
              <h2 className="text-base font-bold text-black">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-black hover:bg-black/5"
              >
                Today
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
                }}
                className="rounded-lg border border-black/10 p-1.5 text-black/70 hover:bg-black/5 hover:text-black"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
                }}
                className="rounded-lg border border-black/10 p-1.5 text-black/70 hover:bg-black/5 hover:text-black"
                aria-label="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-red-600 shadow-xs" />
              <span className="font-semibold text-black">Period Days (Logged)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md border-2 border-red-500 bg-red-50" />
              <span className="text-black/70">Predicted Period</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-black/60" />
              <span className="text-black/70">Fertile / Ovulation</span>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="mt-6 grid grid-cols-7 text-center text-[11px] font-bold text-black/40 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid */}
          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {calendarData.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-12 sm:h-14" />;
              }

              const {
                dayNumber,
                dateStr,
                isToday,
                isRecordedPeriod,
                isPredictedPeriod,
                isOvulation,
                isFertile
              } = cell;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleOpenAddLog(dateStr)}
                  title={`${dateStr} (Click to log)`}
                  className={`relative flex h-12 sm:h-14 flex-col items-center justify-between rounded-xl p-1.5 text-xs transition focus:outline-none ${
                    isRecordedPeriod
                      ? 'bg-red-600 text-white font-bold shadow-xs hover:bg-red-700'
                      : isPredictedPeriod
                      ? 'border-2 border-red-500 bg-red-50 text-red-900 font-bold hover:bg-red-100'
                      : isToday
                      ? 'border-2 border-black bg-black/5 font-extrabold text-black'
                      : 'border border-black/5 bg-[#fafafa] text-black hover:border-black/30'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs">{dayNumber}</span>

                  <div className="flex items-center gap-1">
                    {isRecordedPeriod && (
                      <Droplets size={10} className="text-white fill-white" />
                    )}
                    {isPredictedPeriod && !isRecordedPeriod && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    )}
                    {isOvulation && !isRecordedPeriod && !isPredictedPeriod && (
                      <span className="h-1.5 w-1.5 rounded-full bg-black" title="Ovulation Day" />
                    )}
                    {isFertile && !isOvulation && !isRecordedPeriod && !isPredictedPeriod && (
                      <span className="h-1 w-1 rounded-full bg-black/40" title="Fertile Window" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-center text-[11px] text-black/40">
            Click any calendar day to log or update a period on that date.
          </div>
        </div>

        {/* Right Sidebar: Upcoming Cycles & Log History */}
        <div className="space-y-6">
          {/* Upcoming Cycles */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-black/10 pb-3">
              <CalendarHeart size={16} className="text-black" />
              <h3 className="text-sm font-bold text-black">Upcoming Cycles</h3>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingCycles.map((cyc) => (
                <div
                  key={cyc.cycleNumber}
                  className="rounded-xl border border-black/5 bg-[#f7f7f5] p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-black">
                    <span>Cycle #{cyc.cycleNumber}</span>
                    <span className="rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                      Period Due
                    </span>
                  </div>
                  <div className="mt-1 text-black/70">
                    {formatDate(cyc.startDate)} – {formatDate(cyc.endDate)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-black/50 border-t border-black/5 pt-1.5">
                    <span>Est. Ovulation</span>
                    <span className="font-semibold text-black">{formatDate(cyc.ovulationDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Period Logs */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Recorded Logs ({logs.length})</h3>
              <button
                onClick={() => handleOpenAddLog()}
                className="text-xs font-bold text-black hover:underline"
              >
                + Add
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="py-6 text-center text-xs text-black/40">
                No past logs recorded yet. Click "Log Period" to record your history.
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-black/5 bg-[#fbfbfb] p-2.5 text-xs hover:border-black/20 transition"
                  >
                    <div>
                      <div className="font-bold text-black">
                        {formatDate(log.startDate)} – {formatDate(log.endDate)}
                      </div>
                      <div className="text-[11px] text-black/50">
                        {diffDays(log.endDate, log.startDate) + 1} days · Flow: {log.flow || 'Medium'}
                      </div>
                      {log.notes && (
                        <div className="text-[10px] text-black/60 italic mt-0.5">"{log.notes}"</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditLog(log)}
                        className="p-1 text-black/40 hover:text-black"
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this period log?')) {
                            deletePeriodLog(log.id);
                          }
                        }}
                        className="p-1 text-black/40 hover:text-black"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal (Cycle Duration & Period Duration) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Cycle Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Average Cycle Duration (Days)
                </label>
                <input
                  type="number"
                  min="18"
                  max="60"
                  required
                  value={settingsForm.cycleDuration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cycleDuration: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-black/50">
                  Number of days from the start of one period to the start of the next (typically 28 days).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Average Period Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  required
                  value={settingsForm.periodDuration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, periodDuration: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-black/50">
                  Number of days bleeding lasts (typically 4–7 days).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Period Modal (Start Date, End Date, Flow, Notes) */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingLog ? 'Edit Period Entry' : 'Log Period Dates'}
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Period Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={logForm.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const daysSpan = Math.max(0, diffDays(logForm.endDate, logForm.startDate));
                    setLogForm({
                      ...logForm,
                      startDate: newStart,
                      endDate: logForm.endDate < newStart ? addDays(newStart, (settings.periodDuration || 5) - 1) : logForm.endDate
                    });
                  }}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Period End Date *
                </label>
                <input
                  type="date"
                  required
                  value={logForm.endDate}
                  onChange={(e) => setLogForm({ ...logForm, endDate: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Flow Intensity
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {FLOW_LEVELS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setLogForm({ ...logForm, flow: f })}
                      className={`rounded-xl border py-1.5 text-xs font-semibold transition ${
                        logForm.flow === f
                          ? 'border-black bg-black text-white'
                          : 'border-black/10 bg-white text-black/70 hover:bg-black/5'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Notes (Symptoms / Mood)
                </label>
                <textarea
                  rows={2}
                  placeholder="Cramps, energy level, headache, cravings..."
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {editingLog ? 'Save Changes' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
