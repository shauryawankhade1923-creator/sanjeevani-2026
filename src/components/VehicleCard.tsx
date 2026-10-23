import React from 'react';
import { Truck, ArrowUpRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const VehicleCard: React.FC = () => {
  const { volunteers, tasks, setActiveTab } = useApp();

  const activeRiders = volunteers.filter((v) => v.status === 'IN_TRANSIT' || v.status === 'RESERVED');
  const leadRider = activeRiders[0] || volunteers[0];

  return (
    <div className="bg-gradient-to-br from-[#EAF4DC] to-[#D5E6DA] rounded-3xl p-6 border border-[#C5D8C9] shadow-xs relative flex flex-col justify-between h-[230px] overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-2 text-slate-800">
          <Truck className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold tracking-tight">Delivery Vehicles</h3>
        </div>
        <button 
          onClick={() => setActiveTab('volunteers')}
          title="Open Volunteer Fleet Management"
          className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-600 shadow-xs transition"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Delivery Vehicle Graphic (Clean Isometric Van / Aid Carrier) */}
      <div className="relative w-full flex items-center justify-center -my-3">
        <svg viewBox="0 0 320 180" className="w-56 h-auto drop-shadow-md">
          {/* Ground Soft Shadow */}
          <ellipse cx="160" cy="155" rx="100" ry="12" fill="rgba(0,0,0,0.15)" />
          
          {/* Main White Cargo Box */}
          <path d="M100 45 L240 38 L250 120 L110 130 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M100 45 L110 130 L95 128 L85 43 Z" fill="#E2E8F0" />
          <path d="M85 43 L100 45 L240 38 L225 36 Z" fill="#FFFFFF" />

          {/* Van Cabin Front */}
          <path d="M240 38 L275 60 L280 125 L250 120 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M275 60 L290 85 L292 122 L280 125 Z" fill="#F1F5F9" />
          
          {/* Windshield */}
          <path d="M245 45 L270 62 L268 85 L245 80 Z" fill="#334155" opacity="0.85" />
          
          {/* Headlights & Grille */}
          <rect x="278" y="92" width="12" height="6" rx="2" fill="#E5F940" />
          <rect x="260" y="98" width="28" height="12" rx="3" fill="#64748B" />
          <line x1="262" y1="102" x2="286" y2="102" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="262" y1="106" x2="286" y2="106" stroke="#94A3B8" strokeWidth="1.5" />

          {/* Side Door Details & Sanjeevani Brand Accent */}
          <line x1="245" y1="42" x2="252" y2="120" stroke="#CBD5E1" strokeWidth="1.5" />
          <path d="M130 75 Q160 65 190 75" stroke="#E5F940" strokeWidth="4" fill="none" strokeLinecap="round" />
          <text x="135" y="92" fill="#0C382E" fontSize="9" fontWeight="bold" fontFamily="sans-serif">SANJEEVANI AID</text>

          {/* Wheels */}
          {/* Rear Wheel */}
          <circle cx="140" cy="135" r="18" fill="#1E293B" />
          <circle cx="140" cy="135" r="10" fill="#94A3B8" />
          <circle cx="140" cy="135" r="4" fill="#E2E8F0" />
          
          {/* Front Wheel */}
          <circle cx="255" cy="132" r="18" fill="#1E293B" />
          <circle cx="255" cy="132" r="10" fill="#94A3B8" />
          <circle cx="255" cy="132" r="4" fill="#E2E8F0" />
        </svg>
      </div>

      {/* Bottom Status Pill: "On-Route" (Matching User Screenshot) */}
      <div className="z-10 flex items-center justify-between">
        <div className="inline-flex items-center space-x-1.5 bg-[#202924] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#E5F940] animate-pulse" />
          <span>On-Route</span>
        </div>
        <span className="text-[11px] font-mono text-slate-600 font-semibold">
          {leadRider.name} (Cap: {leadRider.carryCapacity})
        </span>
      </div>

    </div>
  );
};
