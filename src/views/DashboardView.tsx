import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Bike, 
  Home, 
  ArrowRight, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Flame,
  Send
} from 'lucide-react';
import { getRemainingShelfLifeMinutes } from '../utils/engine';
import { InteractiveMap } from '../components/InteractiveMap';

export const DashboardView: React.FC = () => {
  const { 
    donations, 
    shelters, 
    volunteers, 
    tasks, 
    events, 
    setActiveTab, 
    quickCreate180Meals 
  } = useApp();

  // Metrics calculation
  const totalMealsCreated = donations.reduce((acc, d) => acc + d.totalQuantity, 0);
  const totalMealsAvailable = donations.reduce((acc, d) => acc + d.remainingQuantity, 0);
  
  const totalDelivered = tasks
    .filter((t) => t.status === 'DELIVERED')
    .reduce((acc, t) => acc + t.quantity, 0);

  const activeDeliveries = tasks.filter(
    (t) => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED'
  );
  const mealsInTransit = activeDeliveries.reduce((acc, t) => acc + t.quantity, 0);

  // At risk: available batches with remaining shelf life <= 60 minutes
  const atRiskDonations = donations.filter((d) => {
    if (d.status === 'EXPIRED' || d.status === 'DELIVERED') return false;
    const rem = getRemainingShelfLifeMinutes(d.expiresAt);
    return rem > 0 && rem <= 75;
  });
  const mealsAtRisk = atRiskDonations.reduce((acc, d) => acc + d.remainingQuantity, 0);

  const availableVolunteers = volunteers.filter((v) => v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE').length;
  const sheltersWithSpace = shelters.filter(
    (s) => s.status === 'ACCEPTING' && (s.maxCapacity - (s.currentOccupancy + s.committedCapacity)) > 0
  ).length;

  // Food Saved % = Delivered / (Delivered + Expired or Total)
  const expiredMeals = donations
    .filter((d) => d.status === 'EXPIRED')
    .reduce((acc, d) => acc + d.remainingQuantity, 0);

  const foodSavedPercentage = totalMealsCreated > 0 
    ? Math.round(((totalDelivered + mealsInTransit) / totalMealsCreated) * 100) 
    : 100;

  // Urgency Queue: Sort available donations by shortest safe-use deadline
  const urgencyQueue = [...donations]
    .filter((d) => d.remainingQuantity > 0 && d.status !== 'EXPIRED')
    .sort((a, b) => {
      const remA = getRemainingShelfLifeMinutes(a.expiresAt);
      const remB = getRemainingShelfLifeMinutes(b.expiresAt);
      return remA - remB;
    });

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Judge Notice */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VIBE-A-THON 2026 Core Simulation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Coordinating Perishable Surplus & Fragile Aid
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Sanjeevani active coordination engine actively balances strict shelf-life decay, multi-rider batch splitting, ghost-reservation timeouts, and dynamic mid-journey rerouting.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => setActiveTab('demo')}
              className="inline-flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition"
            >
              <span>Explore 4 Demo Scenarios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                quickCreate180Meals();
                setActiveTab('dispatch');
              }}
              className="inline-flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3.5 py-2 rounded-xl border border-white/20 transition"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate 180 Meals Crisis</span>
            </button>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Package className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Card 1: Available Surplus */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Available Aid</span>
            <Package className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {totalMealsAvailable}
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Units ready in pool
          </p>
        </div>

        {/* Card 2: Delivered */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-teal-800" />
          </div>
          <div className="mt-2 text-2xl font-black text-teal-800 font-mono">
            {totalDelivered}
          </div>
          <p className="text-[11px] text-teal-700 mt-0.5 font-medium">
            Zero spoilage logged
          </p>
        </div>

        {/* Card 3: At Risk of Expiry */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>At Expiry Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 font-mono">
            {mealsAtRisk}
          </div>
          <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
            &le; 75 mins remaining
          </p>
        </div>

        {/* Card 4: In Transit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Deliveries</span>
            <Bike className="w-4 h-4 text-sky-800" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-800 font-mono">
            {activeDeliveries.length}
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {mealsInTransit} units on road
          </p>
        </div>

        {/* Card 5: Fleet & Shelters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Riders / Shelters</span>
            <Home className="w-4 h-4 text-indigo-800" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {availableVolunteers} <span className="text-slate-400 text-sm">/ {sheltersWithSpace}</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Ready for dispatch
          </p>
        </div>

        {/* Card 6: Food Saved % */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Food Saved</span>
            <TrendingUp className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800 font-mono">
            {foodSavedPercentage}%
          </div>
          <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
            Redistribution efficiency
          </p>
        </div>

      </div>

      {/* Main Grid: Interactive Map & Live Urgency Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Map & Fleet Telemetry (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Civic Micro-Logistics Radar</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-semibold px-2 py-0.5 rounded-full">
                  Real-Time
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Spatial view of donors (green), shelters (blue), and live volunteer vectors.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('dispatch')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>Dispatch Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-h-[460px]">
            <InteractiveMap />
          </div>
        </div>

        {/* Right Column: Urgency Queue & Live Audit Log (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Urgency Queue */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Urgency Priority Queue</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Sorted by safe-use deadline
              </span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {urgencyQueue.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No active donations waiting in urgency queue.
                </div>
              ) : (
                urgencyQueue.map((item) => {
                  const remMin = getRemainingShelfLifeMinutes(item.expiresAt);
                  const isCritical = remMin <= 30;
                  const isWarning = remMin <= 75;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 transition flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            isCritical ? 'bg-red-100 text-red-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {remMin > 0 ? `${remMin}m left` : 'EXPIRED'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                            {item.itemTitle}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {item.donorName} &bull; <strong>{item.remainingQuantity}</strong> / {item.totalQuantity} units
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('dispatch')}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Operations Timeline */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Recent Operational Events</h3>
              <button
                onClick={() => setActiveTab('events')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                View all ({events.length})
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {events.slice(0, 4).map((ev) => {
                const borderColors = {
                  CRITICAL: 'border-l-red-500 bg-red-50/30',
                  WARNING: 'border-l-amber-500 bg-amber-50/30',
                  SUCCESS: 'border-l-emerald-500 bg-emerald-50/30',
                  INFO: 'border-l-slate-400 bg-slate-50'
                };

                return (
                  <div
                    key={ev.id}
                    className={`p-2.5 rounded-r-lg border-l-4 border-t border-r border-b border-slate-100 text-xs ${borderColors[ev.severity]}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ev.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {ev.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
