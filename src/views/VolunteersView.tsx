import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bike, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Clock, 
  UserX,
  Send,
  Navigation,
  Search,
  Zap
} from 'lucide-react';

export const VolunteersView: React.FC = () => {
  const { 
    volunteers, 
    tasks, 
    donations, 
    shelters, 
    simulateGhostRider, 
    reclaimGhostTask, 
    confirmPickup, 
    confirmDelivery 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');

  const filteredVolunteers = volunteers.filter((rider) => {
    if (selectedZone !== 'ALL' && !rider.zone.includes(selectedZone)) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return rider.name.toLowerCase().includes(q) || rider.zone.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-10">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Fleet Watchdog
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Ghost Stall Detection & Heartbeats</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Volunteer Two-Wheeler Fleet
          </h2>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Dead-man auto-reclaim watchdog: <strong>30s</strong> (accelerated)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search volunteers by name or corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'Central', 'North', 'West'].map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                selectedZone === zone
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {zone === 'ALL' ? 'All Corridors' : `${zone} Corridor`}
            </button>
          ))}
        </div>
      </div>

      {/* Volunteer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVolunteers.map((rider) => {
          const isGhost = rider.responsiveness === 'UNRESPONSIVE';
          const activeTask = tasks.find((t) => t.id === rider.activeTaskId);
          const targetShelter = activeTask ? shelters.find((s) => s.id === activeTask.targetShelterId) : null;
          const relatedDonation = activeTask ? donations.find((d) => d.id === activeTask.donationId) : null;

          const secondsUntilReclaim = activeTask && activeTask.status === 'CLAIMED'
            ? Math.max(0, Math.ceil((new Date(activeTask.claimExpiresAt).getTime() - Date.now()) / 1000))
            : null;

          return (
            <div
              key={rider.id}
              className={`bg-white/95 backdrop-blur-md rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isGhost
                  ? 'border-red-300 ring-2 ring-red-100 bg-red-50/10'
                  : rider.status === 'IN_TRANSIT'
                  ? 'border-teal-300 bg-teal-50/10'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Status Badges */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                      isGhost ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{rider.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{rider.phone}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border font-mono ${
                    isGhost
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : rider.status === 'IN_TRANSIT'
                      ? 'bg-teal-100 text-teal-800 border-teal-200'
                      : rider.status === 'RESERVED'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isGhost ? 'UNRESPONSIVE' : rider.status}
                  </span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-600 mb-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Vehicle & Capacity:</span>
                    <strong className="text-slate-900">{rider.vehicleType}</strong>
                    <span className="text-slate-500 font-mono"> ({rider.carryCapacity} max)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Reliability Score:</span>
                    <strong className="text-slate-900 font-mono">
                      {Math.round(rider.reliabilityScore * 100)}%
                    </strong>
                  </div>
                </div>

                {/* Active Mission Details */}
                {activeTask && (
                  <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs mb-3 space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span>Task #{activeTask.id.slice(-6)}</span>
                      <span className="font-mono bg-amber-200/80 px-2 py-0.2 rounded-full">{activeTask.quantity} Meals</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Target: <strong>{targetShelter?.name || 'Assigned Shelter'}</strong>
                      {activeTask.isRerouted && (
                        <span className="ml-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full">
                          REROUTED
                        </span>
                      )}
                    </p>
                    {secondsUntilReclaim !== null && (
                      <p className="text-[10px] font-mono text-amber-700 font-bold">
                        Reclaim countdown: {secondsUntilReclaim}s remaining
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {activeTask && activeTask.status === 'CLAIMED' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => confirmPickup(activeTask.id)}
                      className="flex-1 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-full text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Confirm Pickup</span>
                    </button>
                    <button
                      onClick={() => simulateGhostRider(rider.id)}
                      className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-full text-xs font-bold transition flex items-center space-x-1"
                      title="Simulate stalled/offline rider"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Simulate Ghost</span>
                    </button>
                  </div>
                )}

                {activeTask && activeTask.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => confirmDelivery(activeTask.id)}
                    className="w-full py-2 bg-[#0C382E] hover:bg-[#154E41] text-white rounded-full text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E5F940]" />
                    <span>Confirm Delivery Handover</span>
                  </button>
                )}

                {isGhost && activeTask && (
                  <button
                    onClick={() => reclaimGhostTask(activeTask.id, true)}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs animate-pulse"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Instant Reclaim ({activeTask.quantity} Meals)</span>
                  </button>
                )}

                {!activeTask && (
                  <div className="text-center py-1 text-[11px] text-slate-400 font-mono">
                    Standing By &bull; {rider.zone}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
