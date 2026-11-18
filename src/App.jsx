import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ShelfApp } from './components/shelf/ShelfApp';
import { BudgetApp } from './components/budget/BudgetApp';
import { ContactsApp } from './components/contacts/ContactsApp';
import { VaultApp } from './components/vault/VaultApp';
import { WishlistApp } from './components/wishlist/WishlistApp';
import { JobsApp } from './components/jobs/JobsApp';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { MobileNavBar } from './components/MobileNavBar';
import { PinLockScreen } from './components/PinLockScreen';
import { Check } from 'lucide-react';

const PIN_SESSION_KEY = 'onlyd_unlocked_session';

function AppContent() {
  const { currentApp, toast } = useApp();
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem(PIN_SESSION_KEY) === 'true';
  });

  const handleUnlock = () => {
    sessionStorage.setItem(PIN_SESSION_KEY, 'true');
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return <PinLockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f5] text-[#171717] pb-20 lg:pb-0">
      <Header />

      <main className="flex-1">
        {currentApp === 'home' && <HomeView />}
        {currentApp === 'shelf' && <ShelfApp />}
        {currentApp === 'budget' && <BudgetApp />}
        {currentApp === 'contacts' && <ContactsApp />}
        {currentApp === 'vault' && <VaultApp />}
        {currentApp === 'wishlist' && <WishlistApp />}
        {currentApp === 'jobs' && <JobsApp />}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-black/10 bg-white py-6 mt-12 text-center text-xs text-black/50 hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black">OnlyD</span>
          </div>
          <div className="flex items-center gap-4 text-black/40">
            <span>High-Contrast Monochrome</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar />

      {/* Sync & QR Device Connection Modal */}
      <DeviceSyncModal />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-black/10 bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <Check size={14} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
