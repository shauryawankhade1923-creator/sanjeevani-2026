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
  Check,
  User,
  Building2,
  Bike,
  Package
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'donations', label: 'Donor' },
    { id: 'dispatch', label: 'Coordinator' },
    { id: 'volunteers', label: 'Rider' },
    { id: 'shelters', label: 'Shelter' },
    { id: 'admin', label: 'Admin' },
    { id: 'events', label: 'Operations Log' },
    { id: 'demo', label: 'Demo Scenarios' },
  ];

  const unreadAlerts = events.filter((e) => e.severity === 'CRITICAL' || e.severity === 'WARNING').length;

  return (
    <header className="w-full pt-3 pb-2 px-3 sm:px-6 max-w-[1520px] mx-auto">
      
      {/* Click-Outside Overlay to Dismiss Dropdowns */}
      {(showNotifications || showProfileMenu) && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => { setShowNotifications(false); setShowProfileMenu(false); }} 
        />
      )}

      <div className="flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Official Sanjeevani Brand Logo & Identity */}
        <div 
          className="flex items-center space-x-3 sm:space-x-4 cursor-pointer shrink-0 group select-none"
          onClick={() => setActiveTab('dashboard')}
          title="Return to Dashboard"
        >
          {/* Prominent High-Visibility Logo Badge */}
          <div className="h-12 w-20 sm:h-14 sm:w-24 md:h-16 md:w-28 lg:h-[68px] lg:w-[124px] rounded-2xl bg-white shadow-xs group-hover:shadow-md border border-slate-200/90 group-hover:border-emerald-600/40 p-1.5 flex items-center justify-center shrink-0 transition-all duration-200">
            <img 
              src="/sanjeevani-logo.jpg" 
              alt="SANJEEVANI Logo - What Matters When It Matters" 
              className="w-full h-full object-contain filter contrast-[1.03] transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>

          {/* Wordmark and Tagline Lockup */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-2">
              <h1 className="font-black text-xl sm:text-2xl lg:text-[26px] tracking-tight text-[#0C382E] leading-none font-sans group-hover:text-[#06241D] transition-colors">
                SANJEEVANI
              </h1>
              {/* Restrained Saffron Accent Indicator */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-900 border border-amber-500/30 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                Civic Ops
              </span>
            </div>
            
            {/* Tagline: Exactly "WHAT MATTERS WHEN IT MATTERS" */}
            <p className="text-[9px] sm:text-[10.5px] lg:text-[11px] font-extrabold tracking-[0.16em] text-[#16493E] uppercase mt-1 leading-tight font-sans">
              WHAT MATTERS WHEN IT MATTERS
            </p>
          </div>
        </div>

        {/* Center: Capsule Pill Navigation Bar (Responsive Compact) */}
        <nav className="hidden lg:flex items-center bg-white/80 backdrop-blur-md rounded-full px-1.5 lg:px-2 py-1 border border-slate-200/80 shadow-xs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
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

        {/* Right Controls: Speed, Reset, Search, Bell, Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          
          {/* Speed Multiplier Pill (Visible on xl screens, also in Profile dropdown) */}
          <div className="hidden xl:flex items-center bg-white rounded-full px-2.5 py-1.5 border border-slate-200/80 shadow-xs text-xs">
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Search Button */}
          <button
            onClick={() => setActiveTab('events')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition"
            title="Search audit log"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Bell with Badge */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition relative"
              title="Operational alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FA4A3E] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-[#E8EFE9]">
                {Math.min(7, unreadAlerts || 3)}
              </span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in">
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

          {/* User Profile Pill Capsule with Interactive Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
              className="flex items-center bg-white hover:bg-slate-50 active:bg-slate-100 rounded-full p-1 pr-3 border border-slate-200/80 shadow-xs space-x-2 transition cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-[#0C382E]/30"
              title="User profile & quick role switch"
            >
              <div className="w-8 h-8 rounded-full bg-[#122B24] text-[#E5F940] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                M
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">Municipal Ops</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight">Civic Lead</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180 text-slate-700' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3.5 text-xs">
                
                {/* Profile Identity Card */}
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-2xl bg-[#0C382E] text-[#E5F940] flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    M
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-xs truncate">Municipal Ops</h4>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Online
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Dr. Meera Nambiar</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">Civic Disaster Secretariat</p>
                  </div>
                </div>

                {/* Quick Persona & Navigation Switcher */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                    Switch Stakeholder View
                  </span>

                  <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                    <button
                      onClick={() => { setActiveTab('dispatch'); setShowProfileMenu(false); }}
                      className={`p-2 rounded-xl text-left border transition flex items-center space-x-2 ${
                        activeTab === 'dispatch' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Coordinator</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('donations'); setShowProfileMenu(false); }}
                      className={`p-2 rounded-xl text-left border transition flex items-center space-x-2 ${
                        activeTab === 'donations' ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Food Donor</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('volunteers'); setShowProfileMenu(false); }}
                      className={`p-2 rounded-xl text-left border transition flex items-center space-x-2 ${
                        activeTab === 'volunteers' ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      <span>Field Rider</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('shelters'); setShowProfileMenu(false); }}
                      className={`p-2 rounded-xl text-left border transition flex items-center space-x-2 ${
                        activeTab === 'shelters' ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>Shelter Camp</span>
                    </button>
                  </div>
                </div>

                {/* Simulation Speed Control */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Simulation Speed:</span>
                  </span>
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-full">
                    {[1, 5, 10].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setTimeMultiplier(spd)}
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold transition ${
                          timeMultiplier === spd ? 'bg-[#E5F940] text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Governance Links */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => { setActiveTab('admin'); setShowProfileMenu(false); }}
                    className="text-[#0C382E] hover:text-[#06241D] font-bold flex items-center space-x-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Admin Console</span>
                  </button>

                  <button
                    onClick={() => { resetAllData(); setShowProfileMenu(false); }}
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Data</span>
                  </button>
                </div>

              </div>
            )}
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
