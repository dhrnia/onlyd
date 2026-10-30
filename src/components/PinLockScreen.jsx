import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

const CORRECT_PIN = '1703';

export function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (pin === CORRECT_PIN) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        if (nextPin === CORRECT_PIN) {
          setTimeout(() => onUnlock(), 150);
        } else {
          setTimeout(() => {
            setError(true);
            setPin('');
          }, 200);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5] text-[#171717] px-4 selection:bg-black selection:text-white">
      <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-8 shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-xs">
          <span className="font-bold text-xl tracking-tighter">D</span>
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-black">
          OnlyD
        </h1>
        <p className="mt-1 text-xs text-black/50">
          Enter PIN to unlock your workspace
        </p>

        {/* PIN Indicators */}
        <div className="my-6 flex justify-center items-center gap-3">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`h-3.5 w-3.5 rounded-full border transition-all duration-150 ${
                  error
                    ? 'border-black bg-black animate-shake'
                    : isFilled
                    ? 'border-black bg-black scale-110'
                    : 'border-black/20 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-semibold text-black mb-3">
            Incorrect PIN. Try again.
          </p>
        )}

        {/* Numeric Keypad for fast mobile/desktop entry */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white text-base font-bold text-black hover:bg-black/5 active:bg-black active:text-white transition"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/5 bg-[#f7f7f5] text-xs font-semibold text-black/60 hover:bg-black/10 transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white text-base font-bold text-black hover:bg-black/5 active:bg-black active:text-white transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/5 bg-[#f7f7f5] text-xs font-semibold text-black/60 hover:bg-black/10 transition"
          >
            ⌫
          </button>
        </div>

        {/* Hidden keyboard input for desktop typing */}
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
              setError(false);
              if (val.length === 4) {
                if (val === CORRECT_PIN) {
                  onUnlock();
                } else {
                  setError(true);
                  setPin('');
                }
              }
            }}
            placeholder="or type on keyboard"
            className="w-full text-center text-xs tracking-widest text-black/50 border-b border-black/15 bg-transparent py-1.5 focus:border-black focus:outline-none"
          />
        </form>
      </div>
    </div>
  );
}
