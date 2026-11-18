import React from 'react';
import {
  Home,
  Library,
  IndianRupee,
  Users,
  KeyRound,
  Gift
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MOBILE_NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: Home },
  { id: 'shelf', name: 'Shelf', icon: Library },
  { id: 'budget', name: 'Budget', icon: IndianRupee },
  { id: 'contacts', name: 'Contacts', icon: Users },
  { id: 'vault', name: 'Vault', icon: KeyRound },
  { id: 'wishlist', name: 'Wishlist', icon: Gift }
];

export function MobileNavBar() {
  const { currentApp, navigateTo } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white/95 backdrop-blur-md lg:hidden shadow-lg pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentApp === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`flex flex-col items-center justify-center rounded-xl py-1 px-2.5 transition active:scale-95 ${
                isActive
                  ? 'text-black font-bold'
                  : 'text-black/40 hover:text-black'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  isActive ? 'bg-black text-white' : 'bg-transparent'
                }`}
              >
                <Icon size={16} />
              </div>
              <span className="mt-1 text-[10px] tracking-tight">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
