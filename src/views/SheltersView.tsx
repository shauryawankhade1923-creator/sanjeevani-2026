import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Droplet, 
  Flame, 
  Snowflake, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  PowerOff, 
  Layers,
  MapPin,
  Phone,
  Search,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { findRerouteAlternatives } from '../utils/engine';

export const SheltersView: React.FC = () => {
  const { 
    shelters, 
    updateShelterStatus, 
    tasks, 
    volunteers, 
    donations, 
    rerouteTask, 
    pendingRerouteTask, 
    dismissPendingReroute 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Find reroute options if there is a pending reroute task
  let rerouteAlternatives: any[] = [];
  if (pendingRerouteTask) {
    const rider = volunteers.find(v => v.id === pendingRerouteTask.riderId);
    const donation = donations.find(d => d.id === pendingRerouteTask.donationId);
    if (rider && donation) {
      rerouteAlternatives = findRerouteAlternatives(pendingRerouteTask, rider, donation, shelters);
    }
  }

  const filteredShelters = shelters.filter((shelter) => {
    if (selectedStatus !== 'ALL' && shelter.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return shelter.name.toLowerCase().includes(q) || shelter.locationName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-10">
      
      {/* Pending Mid-Transit Conflict Intervention Banner */}
      {pendingRerouteTask && (
        <div className="bg-red-500 text-white p-5 rounded-3xl shadow-lg border border-red-600 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Emergency Mid-Transit Interception
                </span>
                <h3 className="text-base font-extrabold mt-1">
                  Task #{pendingRerouteTask.id.slice(-6)} ({pendingRerouteTask.quantity} Meals) In Peril!
                </h3>
                <p className="text-xs text-red-100 mt-0.5">
                  The original destination became full/closed while cargo is in transit. System identified eligible alternatives.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rerouteAlternatives.length > 0 && rerouteAlternatives[0].isEligible && (
                <button
                  onClick={() => {
                    rerouteTask(
                      pendingRerouteTask.id,
                      rerouteAlternatives[0].shelterId,
                      'Shelter status closed/full mid-transit.'
                    );
                  }}
                  className="bg-[#E5F940] hover:bg-[#d9ec34] text-slate-900 px-4 py-2 rounded-full text-xs font-black shadow-xs transition"
                >
                  Divert to {rerouteAlternatives[0].shelterName} (+{rerouteAlternatives[0].transitEtaMinutes}m)
                </button>
              )}
              <button
                onClick={dismissPendingReroute}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-full text-xs font-bold transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Destination Registry
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Capacity Tracking & Infrastructure Rules</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Night Shelters & Relief Outposts
          </h2>
        </div>

        <p className="text-xs text-slate-500 max-w-sm text-right hidden sm:block">
          Aid assignments are strictly validated against verified clean water and cooking fuel infrastructure.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search shelters by name or zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'ACCEPTING', 'CAPACITY_REACHED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredShelters.map((shelter) => {
          const availableCap = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
          const occupancyPercent = Math.min(100, Math.round(((shelter.currentOccupancy + shelter.committedCapacity) / shelter.maxCapacity) * 100));

          const incomingTasks = tasks.filter(
            (t) => t.targetShelterId === shelter.id && (t.status === 'IN_TRANSIT' || t.status === 'CLAIMED')
          );

          return (
            <div
              key={shelter.id}
              className={`bg-white/95 backdrop-blur-md rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                shelter.status === 'CLOSED'
                  ? 'border-red-200 bg-red-50/20'
                  : shelter.status === 'CAPACITY_REACHED'
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Title & Status */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {shelter.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{shelter.locationName}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border font-mono ${
                    shelter.status === 'ACCEPTING'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : shelter.status === 'CAPACITY_REACHED'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {shelter.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Occupancy / Capacity</span>
                    <span className="font-bold font-mono text-slate-900">
                      {shelter.currentOccupancy} + <span className="text-teal-800 font-semibold">{shelter.committedCapacity} committed</span> / {shelter.maxCapacity}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-slate-700 h-full"
                      style={{ width: `${(shelter.currentOccupancy / shelter.maxCapacity) * 100}%` }}
                    />
                    <div
                      className="bg-[#E5F940] h-full animate-pulse"
                      style={{ width: `${(shelter.committedCapacity / shelter.maxCapacity) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1.5 font-mono">
                    <span>{occupancyPercent}% load</span>
                    <span className={availableCap > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {Math.max(0, availableCap)} units remaining space
                    </span>
                  </div>
                </div>

                {/* Infrastructure Capabilities Matrix */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
                      <Droplet className="w-3.5 h-3.5 text-sky-500" />
                      <span>Potable Clean Water:</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      shelter.hasCleanWater ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                    }`}>
                      {shelter.hasCleanWater ? '✓ Verified Safe' : '✕ UNAVAILABLE (Blocks Formula)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cooking Facilities & Fuel:</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      shelter.hasCookingFuel ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                    }`}>
                      {shelter.hasCookingFuel ? '✓ Operational Kitchen' : '✕ NO STOVE (Blocks Raw Rations)'}
                    </span>
                  </div>

                  {shelter.specialRestrictions && (
                    <div className="p-2.5 bg-amber-50 text-amber-900 text-[11px] rounded-xl border border-amber-200 mt-2">
                      <strong>Policy Restriction:</strong> {shelter.specialRestrictions}
                    </div>
                  )}
                </div>

                {/* Incoming Deliveries Count */}
                {incomingTasks.length > 0 && (
                  <div className="mt-3 p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-900 font-medium">
                    ⚡ {incomingTasks.length} in-transit delivery incoming ({incomingTasks.reduce((a, b) => a + b.quantity, 0)} meals).
                  </div>
                )}
              </div>

              {/* Simulation Toggle Buttons for Testing Mid-Transit Rerouting */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newOcc = shelter.currentOccupancy >= shelter.maxCapacity ? Math.floor(shelter.maxCapacity / 2) : shelter.maxCapacity;
                    const newStatus = newOcc >= shelter.maxCapacity ? 'CAPACITY_REACHED' : 'ACCEPTING';
                    updateShelterStatus(shelter.id, newStatus, newOcc);
                  }}
                  className="flex-1 py-2 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition"
                  title="Toggle capacity to full to test mid-transit reroute"
                >
                  {shelter.currentOccupancy >= shelter.maxCapacity ? 'Reset to 50% Space' : 'Simulate 100% Full'}
                </button>

                <button
                  onClick={() => {
                    const newStatus = shelter.status === 'CLOSED' ? 'ACCEPTING' : 'CLOSED';
                    updateShelterStatus(shelter.id, newStatus);
                  }}
                  className={`py-2 px-4 text-[11px] font-bold rounded-full transition ${
                    shelter.status === 'CLOSED'
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                  title="Toggle emergency closure"
                >
                  {shelter.status === 'CLOSED' ? 'Reopen' : 'Close'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
