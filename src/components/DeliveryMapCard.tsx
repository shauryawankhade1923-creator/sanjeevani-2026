import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  Crosshair, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Radio, 
  Maximize2, 
  X,
  Truck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InteractiveMap } from './InteractiveMap';

export const DeliveryMapCard: React.FC = () => {
  const { tasks, shelters, volunteers, donations, setActiveTab } = useApp();
  
  // Interactive Controls State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'radar' | 'gis'>('radar');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isFullscreenModal, setIsFullscreenModal] = useState<boolean>(false);
  const [activeStepInfo, setActiveStepInfo] = useState<string | null>(null);
  const [recenterFlash, setRecenterFlash] = useState<boolean>(false);

  // Active Tasks Filtering
  const activeTasks = tasks.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED' || t.status === 'DIVERTED');
  const allAvailableTasks = activeTasks.length > 0 ? activeTasks : tasks;
  
  // Selected or Lead Task
  const currentTask = allAvailableTasks.find((t) => t.id === selectedTaskId) || allAvailableTasks[0];
  const targetShelter = currentTask ? shelters.find((s) => s.id === currentTask.targetShelterId) : shelters[0];
  const rider = currentTask ? volunteers.find((v) => v.id === currentTask.riderId) : volunteers[0];
  const donation = currentTask ? donations.find((d) => d.id === currentTask.donationId) : donations[0];

  const trackingId = currentTask 
    ? `#${currentTask.id.slice(-6).toUpperCase()}-SANJ-829` 
    : '#267972-63-829bm';
  const etaMinutes = currentTask ? currentTask.estimatedTransitMinutes : 10;

  // Dynamic Timestamps
  const now = new Date();
  const timeNowStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timePriorStr = new Date(now.getTime() - 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeStartStr = new Date(now.getTime() - 35 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Animated Vehicle Position on Vector Curve
  // Curve equation: M 40 40 Q 90 120 180 80 T 280 150
  const [vehicleProgress, setVehicleProgress] = useState(0.55); // 0 to 1 along curve

  useEffect(() => {
    // Gentle oscillation/progression to indicate active real-time GPS telemetry
    const interval = setInterval(() => {
      setVehicleProgress((prev) => {
        const next = prev + 0.004;
        return next > 0.85 ? 0.45 : next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Compute (x, y) along Bézier curve for rider pointer
  const t = vehicleProgress;
  // Approximate point along compound quadratic curve:
  // Segment 1 (t from 0 to 0.5): (40,40) -> control (90,120) -> (180,80)
  // Segment 2 (t from 0.5 to 1.0): (180,80) -> control (270,40) -> (280,150)
  let curX = 180;
  let curY = 80;
  let angleDeg = 35;

  if (t <= 0.5) {
    const u = t * 2;
    curX = (1 - u) * (1 - u) * 40 + 2 * (1 - u) * u * 90 + u * u * 180;
    curY = (1 - u) * (1 - u) * 40 + 2 * (1 - u) * u * 120 + u * u * 80;
    // Derivative for tangent angle
    const dx = 2 * (1 - u) * (90 - 40) + 2 * u * (180 - 90);
    const dy = 2 * (1 - u) * (120 - 40) + 2 * u * (80 - 120);
    angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  } else {
    const u = (t - 0.5) * 2;
    curX = (1 - u) * (1 - u) * 180 + 2 * (1 - u) * u * 250 + u * u * 280;
    curY = (1 - u) * (1 - u) * 80 + 2 * (1 - u) * u * 60 + u * u * 150;
    const dx = 2 * (1 - u) * (250 - 180) + 2 * u * (280 - 250);
    const dy = 2 * (1 - u) * (60 - 80) + 2 * u * (150 - 60);
    angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  // Handle Zoom In
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.0, +(prev + 0.2).toFixed(1)));
  };

  // Handle Zoom Out
  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.6, +(prev - 0.2).toFixed(1)));
  };

  // Handle Recenter
  const handleRecenter = () => {
    setZoomLevel(1.0);
    setRecenterFlash(true);
    setTimeout(() => setRecenterFlash(false), 900);
  };

  return (
    <>
      <div className="bg-[#DCE7DF] rounded-3xl p-6 border border-[#CADBCF] shadow-xs flex flex-col justify-between h-full min-h-[480px] relative overflow-hidden transition-all duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between z-10 mb-2 gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <Globe className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold tracking-tight">Live Delivery Map</h3>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* View Mode Switcher: Radar Vector vs GIS Leaflet */}
            <div className="flex items-center bg-white/70 p-0.5 rounded-full border border-[#C5D7CA] text-[10px] font-bold">
              <button
                onClick={() => setViewMode('radar')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  viewMode === 'radar' 
                    ? 'bg-[#0C382E] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Stylized Radar View"
              >
                Radar
              </button>
              <button
                onClick={() => setViewMode('gis')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  viewMode === 'gis' 
                    ? 'bg-[#0C382E] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Live Street Map (Leaflet)"
              >
                GIS Map
              </button>
            </div>

            {/* Expand / Fullscreen Button */}
            <button 
              onClick={() => setIsFullscreenModal(true)}
              title="Expand Fullscreen Live Dispatch Map"
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-700 hover:text-slate-950 shadow-xs transition hover:scale-105 active:scale-95"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Task Switcher Pill Strip (if multiple active deliveries exist) */}
        {allAvailableTasks.length > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 mb-2 z-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Active Fleet:
            </span>
            {allAvailableTasks.slice(0, 5).map((t, idx) => {
              const r = volunteers.find((v) => v.id === t.riderId);
              const isSelected = (currentTask && currentTask.id === t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-[#0C382E] text-[#E5F940] border-[#0C382E] font-bold shadow-xs'
                      : 'bg-white/60 text-slate-700 border-[#CADBCF] hover:bg-white'
                  }`}
                >
                  #{idx + 1} {r?.name.split(' ')[0] || 'Rider'} ({t.quantity}m)
                </button>
              );
            })}
          </div>
        )}

        {/* Map Canvas Container */}
        <div className="relative flex-1 w-full bg-[#D6E3D9] rounded-2xl border border-[#C5D7CA] overflow-hidden min-h-[220px] flex items-center justify-center bg-grid-pattern shadow-inner">
          
          {/* Recenter Toast Feedback */}
          {recenterFlash && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-[#0C382E] text-[#E5F940] text-[10px] font-mono font-bold px-3 py-1 rounded-full shadow-lg border border-[#E5F940]/30 animate-in fade-in">
              Camera Centered: 100% Zoom
            </div>
          )}

          {/* VIEW MODE 1: Stylized Tactical Radar (Matches Reference UI exactly) */}
          {viewMode === 'radar' && (
            <div 
              className="w-full h-full relative overflow-hidden flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Route Polyline SVG */}
              <svg viewBox="0 0 320 200" className="w-full h-full overflow-visible">
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
                  strokeDasharray="6 3"
                />

                {/* Node 1: Origin (Donor Gate: Grand Regal Banquet) */}
                <circle cx="40" cy="40" r="7" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
                <circle cx="40" cy="40" r="3" fill="#64748B" />

                {/* Node 2: Urban Transit Checkpoint */}
                <circle cx="110" cy="95" r="4.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />

                {/* Dynamic Pulsing Beacon Ring around Rider */}
                <circle 
                  cx={curX} 
                  cy={curY} 
                  r="14" 
                  fill="#E5F940" 
                  opacity="0.35" 
                  className="animate-ping" 
                />

                {/* Node 3: Current Rider Position */}
                <circle cx={curX} cy={curY} r="5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
                
                {/* Directional Navigation Cursor Pointer with Heading Angle */}
                <polygon
                  points={`${curX},${curY - 8} ${curX + 8},${curY + 8} ${curX},${curY + 4} ${curX - 8},${curY + 8}`}
                  fill="#E5F940"
                  stroke="#0F172A"
                  strokeWidth="1.5"
                  transform={`rotate(${angleDeg} ${curX} ${curY})`}
                />

                {/* Node 4: Destination Shelter (Alpha or Beta) */}
                <circle 
                  cx="280" 
                  cy="150" 
                  r="8" 
                  fill={currentTask?.isRerouted ? '#A855F7' : '#E5F940'} 
                  stroke="#0F172A" 
                  strokeWidth="2.5" 
                />
                <circle cx="280" cy="150" r="3" fill="#0F172A" />
              </svg>

              {/* Dynamic Floating Tooltip Pill following vehicle */}
              <div 
                className="absolute z-20 pointer-events-none transition-all duration-300"
                style={{
                  left: `${(curX / 320) * 100}%`,
                  top: `${(curY / 200) * 100}%`,
                  transform: 'translate(-50%, -130%)'
                }}
              >
                <div className="bg-[#121614] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1.5 whitespace-nowrap border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5F940] animate-pulse" />
                  <span>{etaMinutes} min ETA</span>
                </div>
                {/* Pointer Triangle */}
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#121614] mx-auto" />
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Real Embedded Leaflet GIS Map */}
          {viewMode === 'gis' && (
            <div className="w-full h-full relative z-0">
              <InteractiveMap />
            </div>
          )}

          {/* Zoom Controls (+ / - / Recenter) in Circular Buttons */}
          {viewMode === 'radar' && (
            <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 z-20 bg-white/70 backdrop-blur-xs p-1 rounded-full border border-[#C5D7CA] shadow-xs">
              <button 
                onClick={handleZoomIn}
                title="Zoom in (+20%)"
                className="w-6 h-6 rounded-full bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center shadow-xs transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleZoomOut}
                title="Zoom out (-20%)"
                className="w-6 h-6 rounded-full bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center shadow-xs transition active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-700 px-1.5">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          )}

          {viewMode === 'radar' && (
            <div className="absolute bottom-3 right-3 z-20">
              <button 
                onClick={handleRecenter}
                title="Recenter camera on courier"
                className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 flex items-center justify-center shadow-xs transition active:scale-95 border border-[#C5D7CA]"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
              <span>
                {currentTask?.status === 'DIVERTED' 
                  ? 'Rerouted' 
                  : currentTask?.status === 'DELIVERED' 
                  ? 'Delivered' 
                  : 'In transit'}
              </span>
            </div>
          </div>

          {/* Clickable Step Info Banner (if clicked) */}
          {activeStepInfo && (
            <div className="mb-2 p-2 rounded-xl bg-white/90 border border-[#C5D7CA] text-[11px] text-slate-800 flex items-center justify-between shadow-xs animate-in fade-in">
              <span>{activeStepInfo}</span>
              <button 
                onClick={() => setActiveStepInfo(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Vertical Stepper Timeline */}
          <div className="space-y-3 text-xs pl-1">
            
            {/* Step 1: In Transit */}
            <div 
              onClick={() => setActiveStepInfo(`Active Corridor: Courier ${rider?.name || 'Rajesh Kumar'} is currently ${etaMinutes} mins away from ${targetShelter?.name || 'Shelter'}.`)}
              className="flex items-start space-x-3 relative cursor-pointer group"
            >
              <div className="w-3 h-3 rounded-full bg-[#E5F940] border-2 border-slate-900 mt-0.5 shrink-0 z-10 group-hover:scale-125 transition-transform" />
              <div className="absolute left-1.5 top-3.5 bottom-0 w-0.5 -ml-[1px] bg-slate-300" />
              <div className="flex-1 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <p className="font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">In Transit</p>
                    {currentTask?.isRerouted && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
                        Rerouted
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {currentTask?.isRerouted
                      ? `Diverted to ${targetShelter?.name || 'destination'}`
                      : `On the way to ${targetShelter?.name || 'destination'}.`}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{timeNowStr}</span>
              </div>
            </div>

            {/* Step 2: At Warehouse / Donor Gate */}
            <div 
              onClick={() => setActiveStepInfo(`Inspection Passed: Fresh temperature checked at 68°C. Sanitized insulated cargo box sealed.`)}
              className="flex items-start space-x-3 relative cursor-pointer group"
            >
              <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-400 mt-0.5 shrink-0 z-10 group-hover:border-slate-800 transition-colors" />
              <div className="absolute left-1.5 top-3.5 bottom-0 w-0.5 -ml-[1px] bg-slate-300" />
              <div className="flex-1 flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-800 group-hover:text-slate-950 transition-colors">In Sorting</p>
                  <p className="text-[11px] text-slate-500">
                    Verified at {donation?.donorName || 'Grand Regal Banquet'}.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{timePriorStr}</span>
              </div>
            </div>

            {/* Step 3: Picked Up */}
            <div 
              onClick={() => setActiveStepInfo(`Custody Transferred: Batch collected by certified volunteer ${rider?.name || 'Rajesh Kumar'} (${rider?.vehicleType || 'Motorbike'}).`)}
              className="flex items-start space-x-3 cursor-pointer group"
            >
              <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-400 mt-0.5 shrink-0 z-10 group-hover:border-slate-800 transition-colors" />
              <div className="flex-1 flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-800 group-hover:text-slate-950 transition-colors">Picked Up</p>
                  <p className="text-[11px] text-slate-500">
                    Package collected by {rider?.name || 'Rajesh Kumar'}.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{timeStartStr}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FULLSCREEN GIS DISPATCH MODAL (Activated via ↗ Button) */}
      {isFullscreenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#E8EFE9] w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0C382E] text-[#E5F940] flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Sanjeevani GIS Live Dispatch Command
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time geolocated courier routes, shelter capacities, and instant rerouting.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsFullscreenModal(false);
                    setActiveTab('dispatch');
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#E5F940] hover:bg-[#d8ec34] text-slate-950 text-xs font-bold transition"
                >
                  Go to Dispatch Center
                </button>
                <button
                  onClick={() => setIsFullscreenModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Interactive Map Body */}
            <div className="flex-1 w-full relative">
              <InteractiveMap />
            </div>

            {/* Modal Footer Active Deliveries Summary */}
            <div className="bg-white/95 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#065f46]" />
                  <span className="font-semibold text-slate-700">Donors (Green)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  <span className="font-semibold text-slate-700">Shelters (Blue)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
                  <span className="font-semibold text-slate-700">Over-Capacity / Closed (Red)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E5F940] border border-black" />
                  <span className="font-semibold text-slate-700">Active Riders</span>
                </div>
              </div>

              <div className="font-mono text-slate-500">
                Tracking {activeTasks.length} Live Deliveries Across City
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
