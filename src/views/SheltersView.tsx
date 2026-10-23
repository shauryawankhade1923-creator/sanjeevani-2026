import React from 'react';
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
  Phone
} from 'lucide-react';

export const SheltersView: React.FC = () => {
  const { shelters, updateShelterStatus, tasks } = useApp();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Destination Registry
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Capacity Tracking & Infrastructure Rules</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Night Shelters & Relief Outposts
          </h2>
        </div>

        <p className="text-xs text-slate-500 max-w-sm text-right hidden sm:block">
          Aid assignments are strictly validated against verified clean water and cooking fuel infrastructure.
        </p>
      </div>

      {/* Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shelters.map((shelter) => {
          const availableCap = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
          const occupancyPercent = Math.min(100, Math.round(((shelter.currentOccupancy + shelter.committedCapacity) / shelter.maxCapacity) * 100));
          const isFullOrClosed = shelter.status === 'CAPACITY_REACHED' || shelter.status === 'CLOSED';

          // Incoming deliveries to this shelter
          const incomingTasks = tasks.filter(
            (t) => t.targetShelterId === shelter.id && (t.status === 'IN_TRANSIT' || t.status === 'CLAIMED')
          );

          return (
            <div
              key={shelter.id}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                shelter.status === 'CLOSED'
                  ? 'border-red-200 bg-red-50/20'
                  : shelter.status === 'CAPACITY_REACHED'
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Title & Status */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">
                        {shelter.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{shelter.locationName}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
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
                      className="bg-teal-700 h-full animate-pulse"
                      style={{ width: `${(shelter.committedCapacity / shelter.maxCapacity) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                    <span>{occupancyPercent}% load</span>
                    <span className={availableCap > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {Math.max(0, availableCap)} units remaining space
                    </span>
                  </div>
                </div>

                {/* Infrastructure Capabilities Matrix */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-1.5 bg-slate-50/60 rounded border border-slate-100">
                    <span className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
                      <Droplet className="w-3.5 h-3.5 text-sky-500" />
                      <span>Potable Clean Water:</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      shelter.hasCleanWater ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                    }`}>
                      {shelter.hasCleanWater ? '✓ Verified Safe' : '✕ UNAVAILABLE (Blocks Formula)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50/60 rounded border border-slate-100">
                    <span className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cooking Facilities & Fuel:</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      shelter.hasCookingFuel ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                    }`}>
                      {shelter.hasCookingFuel ? '✓ Operational Kitchen' : '✕ NO STOVE (Blocks Raw Rations)'}
                    </span>
                  </div>

                  {shelter.specialRestrictions && (
                    <div className="p-2 bg-amber-50 text-amber-800 text-[11px] rounded border border-amber-200 mt-2">
                      <strong>Restriction:</strong> {shelter.specialRestrictions}
                    </div>
                  )}
                </div>

                {/* Incoming Deliveries Count */}
                {incomingTasks.length > 0 && (
                  <div className="mt-3 p-2 bg-teal-50 border border-teal-200 rounded text-[11px] text-teal-900 font-medium">
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
                  className="flex-1 py-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  title="Toggle capacity to full to test mid-transit reroute"
                >
                  {shelter.currentOccupancy >= shelter.maxCapacity ? 'Reset to 50% Space' : 'Simulate 100% Full'}
                </button>

                <button
                  onClick={() => {
                    const newStatus = shelter.status === 'CLOSED' ? 'ACCEPTING' : 'CLOSED';
                    updateShelterStatus(shelter.id, newStatus);
                  }}
                  className={`py-1.5 px-2.5 text-[11px] font-bold rounded-lg transition ${
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
