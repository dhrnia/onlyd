import React, { useState } from 'react';
import { X, Database, Check, Download, Upload, ShieldCheck, HardDrive, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function DeviceSyncModal() {
  const { isDeviceModalOpen, setIsDeviceModalOpen, syncState, triggerSync, data, importDatabase, showToast } = useApp();

  if (!isDeviceModalOpen) return null;

  const exportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onlyd-sqlite-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Database backup downloaded');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === 'object') {
          importDatabase(parsed);
        } else {
          alert('Invalid JSON file format');
        }
      } catch (err) {
        alert('Failed to parse backup JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-black">Database Storage</h2>
              <p className="text-xs text-black/50">Production ACID-Compliant SQLite Engine</p>
            </div>
          </div>
          <button
            onClick={() => setIsDeviceModalOpen(false)}
            className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Database Status Info */}
        <div className="my-5 space-y-2.5">
          <div className="rounded-xl border border-black/10 bg-[#f7f7f5] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-black">Database Engine</span>
              <span className="font-mono text-black font-bold">SQLite v3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60">Storage File</span>
              <span className="font-mono text-[11px] text-black/80">server/data/onlyd.sqlite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60">Status</span>
              <span className="flex items-center gap-1.5 font-bold text-black">
                <span className="h-2 w-2 rounded-full bg-black"></span>
                Connected & Persistent
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-3 text-xs">
            <div className="flex items-center gap-2 text-black/70">
              <ShieldCheck size={14} className="text-black" />
              <span>Zero external cloud/passwords</span>
            </div>
            <span className="text-black/50">Local Native Engine</span>
          </div>
        </div>

        {/* Backup & Actions */}
        <div className="border-t border-black/10 pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-2">
            Database Backup & Restore
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportBackup}
              className="flex items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-medium text-black hover:bg-black/5 transition"
            >
              <Download size={14} />
              Export SQLite JSON
            </button>
            <label className="flex items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-medium text-black hover:bg-black/5 cursor-pointer transition">
              <Upload size={14} />
              Import & Restore
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setIsDeviceModalOpen(false)}
            className="rounded-xl bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
