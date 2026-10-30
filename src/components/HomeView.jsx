import React from 'react';
import {
  Library,
  IndianRupee,
  Users,
  KeyRound,
  Gift,
  Briefcase,
  CalendarHeart
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function HomeView() {
  const { navigateTo } = useApp();

  const apps = [
    { id: 'shelf', name: 'Shelf', icon: Library },
    { id: 'budget', name: 'Budget', icon: IndianRupee },
    { id: 'contacts', name: 'Contacts', icon: Users },
    { id: 'vault', name: 'Vault', icon: KeyRound },
    { id: 'wishlist', name: 'Wishlist', icon: Gift },
    { id: 'jobs', name: 'Jobs', icon: Briefcase },
    { id: 'period', name: 'Period', icon: CalendarHeart }
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              onClick={() => navigateTo(app.id)}
              className="group flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-white p-6 shadow-xs hover:border-black/30 hover:shadow-md transition text-center focus:outline-none"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-xs transition group-hover:scale-105">
                <Icon size={26} />
              </div>
              <h2 className="mt-3.5 text-sm font-bold text-black tracking-tight">
                {app.name}
              </h2>
            </button>
          );
        })}
      </div>
    </div>
  );
}
