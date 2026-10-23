import React, { useState } from 'react';
import { 
  Globe, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Crosshair 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DeliveryMapCard: React.FC = () => {
  const { tasks, shelters, volunteers, donations } = useApp();
  const [zoomLevel, setZoomLevel] = useState(1);

  const activeTask = tasks.find((t) => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED') || tasks[0];
  const targetShelter = activeTask ? shelters.find((s) => s.id === activeTask.targetShelterId) : shelters[0];
  const rider = activeTask ? volunteers.find((v) => v.id === activeTask.riderId) : volunteers[0];

  const trackingId = activeTask ? `#${activeTask.id.slice(-6).toUpperCase()}-SANJ-829` : '#267972-63-829bm';
  const etaMinutes = activeTask ? activeTask.estimatedTransitMinutes : 14;

  return (
    <div className="bg-[#DCE7DF] rounded-3xl p-6 border border-[#CADBCF] shadow-xs flex flex-col justify-between h-full min-h-[480px] relative overflow-hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between z-10 mb-2">
        <div className="flex items-center space-x-2 text-slate-800">
          <Globe className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold tracking-tight">Live Delivery Map</h3>
        </div>
        <button className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-600 shadow-xs transition">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid Canvas with Route Vector (Matching Screenshot exactly) */}
      <div className="relative flex-1 w-full bg-[#D6E3D9] rounded-2xl border border-[#C5D7CA] overflow-hidden p-4 min-h-[220px] flex items-center justify-center bg-grid-pattern">
        
        {/* Route Polyline SVG */}
        <svg viewBox="0 0 320 200" className="w-full h-full">
          {/* Subtle connecting road line */}
          <path
            d="M 40 40 Q 90 120 180 80 T 280 150"
            fill="none"
            stroke="#C0D4C5"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Active Navigation Polyline in Vibrant Lime */}
          <path
            d="M 40 40 Q 90 120 180 80 T 280 150"
            fill="none"
            stroke="#E5F940"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Node 1: Origin (Donor Gate) */}
          <circle cx="40" cy="40" r="6" fill="#FFFFFF" stroke="#64748B" strokeWidth="2" />

          {/* Node 2: Checkpoint 1 */}
          <circle cx="110" cy="95" r="4.5" fill="#FFFFFF" opacity="0.8" />

          {/* Node 3: Current Position with Arrow */}
          <circle cx="180" cy="80" r="5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
          
          {/* Directional Navigation Cursor Pointer */}
          <polygon
            points="180,72 188,88 180,84 172,88"
            fill="#E5F940"
            stroke="#0F172A"
            strokeWidth="1.5"
            transform="rotate(35 180 80)"
          />

          {/* Node 4: Destination Shelter */}
          <circle cx="280" cy="150" r="7" fill="#E5F940" stroke="#0F172A" strokeWidth="2.5" />
        </svg>

        {/* Floating Tooltip Pill: "4 h 10 min" or "14 min ETA" */}
        <div className="absolute top-[28%] left-[52%] -translate-x-1/2 -translate-y-full z-20">
          <div className="bg-[#121614] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1.5 whitespace-nowrap">
            <span>{etaMinutes} min ETA</span>
          </div>
          {/* Pointer Triangle */}
          <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#121614] mx-auto" />
        </div>

        {/* Zoom Controls (+ / - / Recenter) in Circular Buttons */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 z-10">
          <button 
            onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
            className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
            className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow-xs transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute bottom-3 right-3 z-10">
          <button className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow-xs transition">
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Bottom Tracking Info & Vertical Stepper Timeline */}
      <div className="mt-4 pt-3 border-t border-[#CADBCF]/80">
        
        {/* Tracking ID Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] text-slate-500 font-medium block">Tracking ID</span>
            <span className="text-xs font-black text-slate-900 font-mono tracking-tight">
              {trackingId}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs font-bold text-[#6D8A0F]">
            <span className="w-2 h-2 rounded-full bg-[#E5F940] animate-pulse" />
            <span>In transit</span>
          </div>
        </div>

        {/* Vertical Stepper Timeline (Exact match to screenshot) */}
        <div className="space-y-3 text-xs pl-1">
          
          {/* Step 1: In Transit */}
          <div className="flex items-start space-x-3 relative">
            <div className="w-3 h-3 rounded-full bg-[#E5F940] border-2 border-slate-900 mt-0.5 shrink-0 z-10" />
            <div className="absolute left-1.5 top-3.5 bottom-0 w-0.5 -ml-[1px] bg-slate-300" />
            <div className="flex-1 flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-900">In Transit</p>
                <p className="text-[11px] text-slate-500">
                  On the way to {targetShelter?.name || 'destination'}.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">01:42 PM</span>
            </div>
          </div>

          {/* Step 2: At Warehouse / Donor Gate */}
          <div className="flex items-start space-x-3 relative">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-400 mt-0.5 shrink-0 z-10" />
            <div className="absolute left-1.5 top-3.5 bottom-0 w-0.5 -ml-[1px] bg-slate-300" />
            <div className="flex-1 flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-800">In Sorting</p>
                <p className="text-[11px] text-slate-500">Verified at Grand Regal Banquet.</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">11:18 AM</span>
            </div>
          </div>

          {/* Step 3: Picked Up */}
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-400 mt-0.5 shrink-0 z-10" />
            <div className="flex-1 flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-800">Picked Up</p>
                <p className="text-[11px] text-slate-500">Package collected by {rider?.name || 'Rider'}.</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">10:02 AM</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
