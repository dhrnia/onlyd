import React, { useState } from 'react';
import {
  Library,
  IndianRupee,
  Users,
  KeyRound,
  Gift,
  Briefcase,
  Home,
  RefreshCw,
  Database,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const APPS = [
  { id: 'home', name: 'Home', icon: Home, desc: 'Overview & launcher' },
  { id: 'shelf', name: 'Shelf', icon: Library, desc: 'Books, movies, shows' },
  { id: 'budget', name: 'Budget', icon: IndianRupee, desc: 'Targets & spendings' },
  { id: 'contacts', name: 'Contacts', icon: Users, desc: 'Address book & tags' },
  { id: 'vault', name: 'Vault', icon: KeyRound, desc: 'Passwords & links' },
  { id: 'wishlist', name: 'Wishlist', icon: Gift, desc: 'Priorities & pricing' },
  { id: 'jobs', name: 'Jobs', icon: Briefcase, desc: 'Application tracker' },
];

export function Header() {
  const { currentApp, navigateTo, syncState, lastSynced, triggerSync, setIsDeviceModalOpen } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeAppObj = APPS.find(a => a.id === currentApp) || APPS[0];

  const handleNav = (appId) => {
    navigateTo(appId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f7f5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Brand Logo & App Selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-sm transition group-hover:scale-105">
                <span className="font-bold text-sm tracking-tighter">D</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-black">OnlyD</span>
                </div>
              </div>
            </button>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-xs">
            {APPS.map((app) => {
              const Icon = app.icon;
              const isActive = currentApp === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => handleNav(app.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-black text-white shadow-xs'
                      : 'text-black/60 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  <Icon size={14} />
                  <span>{app.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Sync Status & Device Sync */}
          <div className="flex items-center gap-2">
            {/* Sync Status Badge */}
            <button
              onClick={() => triggerSync()}
              title="Click to sync now"
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 transition"
            >
              <RefreshCw
                size={13}
                className={`text-black ${syncState === 'syncing' ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {syncState === 'syncing' ? 'Syncing...' : syncState === 'offline' ? 'Offline' : 'Synced'}
              </span>
            </button>

            {/* Database Management Modal Trigger */}
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition shadow-xs"
            >
              <Database size={13} />
              <span className="hidden sm:inline">Database</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black lg:hidden hover:bg-black/5 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-black/10 bg-white p-4 lg:hidden animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              {APPS.map((app) => {
                const Icon = app.icon;
                const isActive = currentApp === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleNav(app.id)}
                    className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition ${
                      isActive
                        ? 'bg-black text-white'
                        : 'border border-black/5 bg-[#f7f7f5] text-black hover:bg-black/5'
                    }`}
                  >
                    <Icon size={16} />
                    <div>
                      <div className="text-xs font-bold">{app.name}</div>
                      <div className={`text-[10px] ${isActive ? 'text-white/70' : 'text-black/50'}`}>
                        {app.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
