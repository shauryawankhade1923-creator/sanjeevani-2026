import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Download, 
  Plus, 
  Flame, 
  ChevronDown, 
  PlayCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { StatPills } from '../components/StatPills';
import { DarkBarChartCard } from '../components/DarkBarChartCard';
import { RadialGaugeCard } from '../components/RadialGaugeCard';
import { VehicleCard } from '../components/VehicleCard';
import { DeliveryMapCard } from '../components/DeliveryMapCard';

export const DashboardView: React.FC = () => {
  const { quickCreate180Meals, setActiveTab, events } = useApp();
  const [selectedTimeframe, setSelectedTimeframe] = useState('Dec 2026');

  const handleExportCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,Title,Category,Remaining,Total,Status\n" +
      "don-01,180 Cooked Meals,COOKED_MEALS,180,180,AVAILABLE\n" +
      "don-02,Infant Nutrition Formula,BABY_FORMULA,30,30,AVAILABLE\n" +
      "don-03,Raw Grain Rations,RAW_RATIONS,50,50,AVAILABLE";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sanjeevani_shipments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-10">
      
      {/* Main Section Header Row (Matching User Screenshot Exactly) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
            Delivery Tracking Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Active perishable aid redistribution & real-time spoilage defense under uncertainty.
          </p>
        </div>

        {/* Right Action Bar (Timeframe, Export CSV, Add New Shipment) */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Timeframe Dropdown Pill */}
          <div className="flex items-center space-x-1.5 bg-white px-3.5 py-2 rounded-full border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-normal">Timeframe</span>
            <span className="font-bold text-slate-900">{selectedTimeframe}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Export CSV Pill */}
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 px-4 py-2 rounded-full border border-slate-200/90 shadow-xs text-xs font-bold text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Add New Shipment Vibrant Lime Pill */}
          <button
            onClick={() => {
              quickCreate180Meals();
              setActiveTab('dispatch');
            }}
            className="flex items-center space-x-2 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 px-5 py-2 rounded-full shadow-sm text-xs font-extrabold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Add new shipment</span>
          </button>

        </div>
      </div>

      {/* Stat Summary Row (3 Rounded Pill Cards) */}
      <StatPills />

      {/* Main Grid: 4-Card Master View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        
        {/* Column 1: Left Dark Card (5 cols) -> Shipments Statistics */}
        <div className="lg:col-span-5 h-full">
          <DarkBarChartCard />
        </div>

        {/* Column 2: Center Stack (3.5 cols) -> Analytic View + Delivery Vehicles */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-5 sm:gap-6 h-full">
          <RadialGaugeCard />
          <VehicleCard />
        </div>

        {/* Column 3: Right Tall Card (3.5 cols) -> Live Delivery Map */}
        <div className="lg:col-span-4 h-full">
          <DeliveryMapCard />
        </div>

      </div>

      {/* Bottom Hackathon Quick Access Bar */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#122B24] text-[#E5F940] flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">
              VIBE-A-THON 2026 Core Test Engine Ready
            </h4>
            <p className="text-[11px] text-slate-500">
              All 4 failure simulations (Expiry Crisis, Ghost Reclaim, Mid-Transit Reroute, and Safety Rule Enforcement) are armed.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('demo')}
          className="inline-flex items-center space-x-1.5 bg-[#0C382E] hover:bg-[#154E41] text-white text-xs font-bold px-4 py-2.5 rounded-full transition shadow-xs shrink-0"
        >
          <span>Launch Demo Scenarios</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#E5F940]" />
        </button>
      </div>

    </div>
  );
};
