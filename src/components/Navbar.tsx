import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  RotateCcw, 
  Zap, 
  Clock, 
  ShieldAlert, 
  Flame, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    timeMultiplier, 
    setTimeMultiplier, 
    resetAllData, 
    quickCreate180Meals,
    setActiveTab
  } = useApp();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-700 flex items-center justify-center shadow-md p-1.5">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
              <path d="M50 8 C68 8 84 22 84 42 C84 65 50 92 50 92 C50 92 16 65 16 42 C16 22 32 8 50 8 Z" fill="#065f46" />
              <path d="M50 20 C50 20 66 32 66 50 C66 60 58 68 50 68 C42 68 34 60 34 50 C34 32 50 20 50 20 Z" fill="#ffffff" />
              <path d="M50 26 C50 38 46 54 50 64" stroke="#059669" strokeWidth="4" strokeLinecap="round" fill="none" />
              <circle cx="50" cy="30" r="4.5" fill="#f59e0b" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-emerald-950 font-mono">
                SANJEEVANI
              </span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase border border-amber-200">
                Civic V2.6
              </span>
            </div>
            <p className="text-[11px] font-medium text-teal-700">
              Smart Aid. Safer Deliveries.
            </p>
          </div>
        </div>

        {/* Center: Prominent Demo Simulation Indicator */}
        <div className="hidden md:flex items-center space-x-2 bg-emerald-50/80 border border-emerald-200 px-3 py-1 rounded-full text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="font-bold text-emerald-900 tracking-wider">DEMO SIMULATION</span>
          <span className="text-emerald-700">|</span>
          <span className="text-emerald-700 font-medium">Accelerated Event Watchdog Active</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick 180 Meals Shortcut */}
          <button
            onClick={() => {
              quickCreate180Meals();
              setActiveTab('dispatch');
            }}
            className="hidden sm:inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all duration-150"
            title="Create 180 meals @ 75 mins shelf-life"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>+ 180 Meals Crisis</span>
          </button>

          {/* Time Multiplier Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <span className="px-1.5 text-slate-500 font-mono flex items-center">
              <Clock className="w-3 h-3 mr-1 text-slate-400" /> Speed:
            </span>
            <button
              onClick={() => setTimeMultiplier(1)}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                timeMultiplier === 1 ? 'bg-white shadow-sm text-emerald-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => setTimeMultiplier(5)}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                timeMultiplier === 5 ? 'bg-white shadow-sm text-amber-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5x
            </button>
            <button
              onClick={() => setTimeMultiplier(10)}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                timeMultiplier === 10 ? 'bg-white shadow-sm text-red-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10x
            </button>
          </div>

          {/* Reset Baseline Button */}
          <button
            onClick={resetAllData}
            className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition"
            title="Reset to clean initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

      </div>
    </header>
  );
};
