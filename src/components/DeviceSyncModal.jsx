import React from 'react';
import { X, Download, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function DeviceSyncModal() {
  const { isDeviceModalOpen, setIsDeviceModalOpen, data, importDatabase, showToast } = useApp();

  if (!isDeviceModalOpen) return null;

  const exportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onlyd-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded');
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
          setIsDeviceModalOpen(false);
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
      <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 pb-3">
          <h2 className="text-sm font-bold text-black">Database</h2>
          <button
            onClick={() => setIsDeviceModalOpen(false)}
            className="rounded-lg p-1 text-black/40 hover:bg-black/5 hover:text-black transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Export & Import Buttons Only */}
        <div className="py-5 grid grid-cols-2 gap-3">
          <button
            onClick={exportBackup}
            className="flex items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-3 text-xs font-semibold text-black hover:bg-black/5 transition shadow-xs"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-xs font-semibold text-white hover:bg-neutral-800 transition cursor-pointer shadow-xs">
            <Upload size={14} />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
