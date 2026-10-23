import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Clock, 
  RotateCcw, 
  Flame, 
  PlayCircle,
  ShieldCheck,
  Check
} from 'lucide-react';

export const TopNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    timeMultiplier, 
    setTimeMultiplier, 
    resetAllData,
    events,
    donations,
    volunteers,
    tasks
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'donations', label: 'Donor Dashboard' },
    { id: 'dispatch', label: 'Dispatch Center' },
    { id: 'volunteers', label: 'Volunteer Fleet' },
    { id: 'shelters', label: 'Shelters & Camps' },
    { id: 'events', label: 'Operations Log' },
    { id: 'demo', label: 'Demo Scenarios' },
  ];

  const unreadAlerts = events.filter((e) => e.severity === 'CRITICAL' || e.severity === 'WARNING').length;

  return (
    <header className="w-full pt-4 pb-2 px-4 sm:px-8 max-w-[1520px] mx-auto">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Official Sanjeevani Brand Logo & Identity */}
        <div 
          className="flex items-center space-x-3 sm:space-x-4 cursor-pointer shrink-0 group select-none"
          onClick={() => setActiveTab('dashboard')}
          title="Return to Dashboard"
        >
          {/* Prominent High-Visibility Logo Badge */}
          <div className="h-14 w-24 sm:h-16 sm:w-28 md:h-[72px] md:w-[130px] lg:h-[76px] lg:w-[138px] rounded-2xl bg-white shadow-xs group-hover:shadow-md border border-slate-200/90 group-hover:border-emerald-600/40 p-1.5 sm:p-2 flex items-center justify-center shrink-0 transition-all duration-200">
            <img 
              src="/sanjeevani-logo.jpg" 
              alt="SANJEEVANI Logo - What Matters When It Matters" 
              className="w-full h-full object-contain filter contrast-[1.03] transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>

          {/* Wordmark and Tagline Lockup */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-2">
              <h1 className="font-black text-xl sm:text-2xl lg:text-[28px] tracking-tight text-[#0C382E] leading-none font-sans group-hover:text-[#06241D] transition-colors">
                SANJEEVANI
              </h1>
              {/* Restrained Saffron Accent Indicator */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase bg-amber-500/10 text-amber-900 border border-amber-500/30 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                Civic Ops
              </span>
            </div>
            
            {/* Tagline: Exactly "WHAT MATTERS WHEN IT MATTERS" */}
            <p className="text-[9.5px] sm:text-[11px] lg:text-[11.5px] font-extrabold tracking-[0.16em] text-[#16493E] uppercase mt-1 leading-tight font-sans">
              WHAT MATTERS WHEN IT MATTERS
            </p>
          </div>
        </div>

        {/* Center: Capsule Pill Navigation Bar (Matching User Screenshot) */}
        <nav className="hidden lg:flex items-center bg-white/80 backdrop-blur-md rounded-full px-1.5 lg:px-2 py-1 border border-slate-200/80 shadow-xs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-full text-[11px] lg:text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E5F940] text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Search, Bell, Speed, Profile */}
        <div className="flex items-center space-x-2.5 shrink-0">
          
          {/* Speed Multiplier Pill */}
          <div className="hidden sm:flex items-center bg-white rounded-full px-2.5 py-1.5 border border-slate-200/80 shadow-xs text-xs">
            <span className="text-[11px] text-slate-400 font-medium mr-1.5 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-slate-400" /> Speed:
            </span>
            <button
              onClick={() => setTimeMultiplier(1)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                timeMultiplier === 1 ? 'bg-[#E5F940] text-slate-900' : 'text-slate-500'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => setTimeMultiplier(5)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                timeMultiplier === 5 ? 'bg-[#E5F940] text-slate-900' : 'text-slate-500'
              }`}
            >
              5x
            </button>
            <button
              onClick={() => setTimeMultiplier(10)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                timeMultiplier === 10 ? 'bg-[#E5F940] text-slate-900' : 'text-slate-500'
              }`}
            >
              10x
            </button>
          </div>

          {/* Reset Baseline Circular Button */}
          <button
            onClick={resetAllData}
            title="Reset fresh baseline"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Search Button */}
          <button
            onClick={() => setActiveTab('events')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition"
            title="Search audit log"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Bell with Badge (7) */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FA4A3E] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-[#E8EFE9]">
                {Math.min(7, unreadAlerts || 3)}
              </span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Operational Alerts</h4>
                  <span className="text-[10px] font-mono text-slate-400">Live Telemetry</span>
                </div>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {events.slice(0, 4).map((ev) => (
                    <div key={ev.id} className="text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{ev.title}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{ev.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill Capsule */}
          <div className="hidden sm:flex items-center bg-white rounded-full p-1 pr-3.5 border border-slate-200/80 shadow-xs space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#122B24] text-[#E5F940] flex items-center justify-center font-bold text-xs">
              M
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">Municipal Ops</p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">Civic Lead</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

        </div>

      </div>

      {/* Mobile Navigation Pills */}
      <div className="flex lg:hidden overflow-x-auto py-2.5 space-x-2 no-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#E5F940] text-slate-900 font-bold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

    </header>
  );
};
