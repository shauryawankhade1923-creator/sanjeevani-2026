import React from 'react';
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
  Navigation
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Fleet Watchdog
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Ghost Detection & Dead-Man Heartbeats</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Volunteer Two-Wheeler Fleet
          </h2>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Dead-man auto-reclaim threshold: <strong>30s</strong> (accelerated)</span>
        </div>
      </div>

      {/* Volunteer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {volunteers.map((rider) => {
          const isGhost = rider.responsiveness === 'UNRESPONSIVE';
          const activeTask = tasks.find((t) => t.id === rider.activeTaskId);
          const targetShelter = activeTask ? shelters.find((s) => s.id === activeTask.targetShelterId) : null;
          const relatedDonation = activeTask ? donations.find((d) => d.id === activeTask.donationId) : null;

          return (
            <div
              key={rider.id}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isGhost
                  ? 'border-red-300 ring-1 ring-red-200 bg-red-50/10'
                  : rider.status === 'IN_TRANSIT'
                  ? 'border-teal-300 bg-teal-50/10'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Status Badges */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isGhost ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{rider.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{rider.phone}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600 mb-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Vehicle & Cap:</span>
                    <strong className="text-slate-800">{rider.vehicleType}</strong>
                    <span className="text-slate-500 font-mono"> ({rider.carryCapacity} units)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Reliability Score:</span>
                    <strong className="text-slate-800 font-mono">
                      {Math.round(rider.reliabilityScore * 100)}%
                    </strong>
                  </div>
                </div>

                {/* Active Mission Details */}
                {activeTask && (
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-xs mb-3 space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span>Task #{activeTask.id.slice(-6)}</span>
                      <span className="font-mono">{activeTask.quantity} Meals</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Destination: <strong>{targetShelter?.name || 'Assigned Shelter'}</strong>
                      {activeTask.isRerouted && (
                        <span className="ml-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                          REROUTED
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-amber-700">
                      Status: <strong className="uppercase">{activeTask.status}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {activeTask && activeTask.status === 'CLAIMED' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => confirmPickup(activeTask.id)}
                      className="flex-1 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Confirm Pickup</span>
                    </button>
                    <button
                      onClick={() => simulateGhostRider(rider.id)}
                      className="py-1.5 px-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                      title="Simulate stalled/offline rider for hackathon testing"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Simulate Ghost</span>
                    </button>
                  </div>
                )}

                {activeTask && activeTask.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => confirmDelivery(activeTask.id)}
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Delivery Handover</span>
                  </button>
                )}

                {isGhost && activeTask && (
                  <button
                    onClick={() => reclaimGhostTask(activeTask.id, true)}
                    className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm animate-pulse"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reclaim {activeTask.quantity} Meals Now</span>
                  </button>
                )}

                {!activeTask && (
                  <div className="text-center py-1 text-[11px] text-slate-400 font-mono">
                    Ready & Standing By in {rider.zone}
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
