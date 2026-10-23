import React from 'react';
import { BarChart3, ArrowUpRight, Flame, Clock, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getRemainingShelfLifeMinutes } from '../utils/engine';

export const DarkBarChartCard: React.FC = () => {
  const { donations, setActiveTab } = useApp();

  const barData = [
    { label: '10', height: 45, isHighlight: false },
    { label: '20', height: 75, isHighlight: false },
    { label: '30', height: 35, isHighlight: false },
    { label: '40', height: 60, isHighlight: false },
    { label: '50', height: 95, isHighlight: true }, // The 180 Meals Emergency Surge
    { label: '60', height: 68, isHighlight: false },
    { label: '70', height: 40, isHighlight: false },
    { label: '80', height: 50, isHighlight: false },
    { label: '90', height: 30, isHighlight: false },
  ];

  const urgentDonation = donations.find((d) => d.remainingQuantity > 0 && d.status !== 'EXPIRED');

  return (
    <div className="bg-[#111614] text-white rounded-3xl p-6 sm:p-7 border border-[#1E2522] shadow-xl flex flex-col justify-between h-full min-h-[480px]">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <BarChart3 className="w-4 h-4 text-[#E5F940]" />
            <h3 className="text-sm font-bold tracking-tight text-white">
              Shipments Statistics
            </h3>
          </div>
          <button 
            onClick={() => setActiveTab('donations')}
            className="w-7 h-7 rounded-full bg-[#1C2320] hover:bg-[#252E2A] flex items-center justify-center text-slate-300 shadow-xs transition"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend Radios */}
        <div className="flex items-center space-x-4 text-xs text-slate-400 mb-6">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3B4641]" />
            <span>Shipment</span>
          </div>
          <div className="flex items-center space-x-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E5F940]" />
            <span className="text-[#E5F940]">Emergency Surge (180 Meals)</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative flex-1 flex items-end justify-between px-2 pt-4 pb-2 border-b border-[#232D28]">
        
        {/* Horizontal Background Grid Reference Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 text-[10px] font-mono text-slate-500 pr-2">
          <div className="border-b border-white flex justify-between"><span>80%</span></div>
          <div className="border-b border-white flex justify-between"><span>60%</span></div>
          <div className="border-b border-white flex justify-between"><span>40%</span></div>
          <div className="border-b border-white flex justify-between"><span>20%</span></div>
          <div className="border-b border-white flex justify-between"><span>0%</span></div>
        </div>

        {/* Vertical Bars */}
        <div className="relative z-10 w-full flex items-end justify-between gap-2 sm:gap-3 h-48 px-4">
          {barData.map((bar, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div
                className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 group-hover:brightness-110 ${
                  bar.isHighlight
                    ? 'bg-gradient-to-t from-[#9DC815] to-[#E5F940] shadow-[0_0_20px_rgba(229,249,64,0.4)]'
                    : 'bg-[#313B36] group-hover:bg-[#3D4943]'
                }`}
                style={{ height: `${bar.height}%` }}
              />
              <span className={`text-[10px] font-mono mt-2 transition ${
                bar.isHighlight ? 'text-[#E5F940] font-bold' : 'text-slate-500'
              }`}>
                {bar.label}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom Live Surplus Ingestion Feed */}
      <div className="mt-5 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#171E1A] p-3.5 rounded-2xl border border-[#232D28]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#26312B] flex items-center justify-center text-[#E5F940] shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">
                {urgentDonation ? urgentDonation.itemTitle : '180 Cooked Meals (Grand Regal)'}
              </span>
              <span className="text-[10px] font-mono bg-[#E5F940]/20 text-[#E5F940] px-1.5 py-0.2 rounded font-bold">
                75m Safe-Life
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Available: <strong>{urgentDonation ? urgentDonation.remainingQuantity : 180}</strong> meals &bull; Ready for multi-rider dispatch
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('dispatch')}
          className="inline-flex items-center justify-center space-x-1.5 bg-[#E5F940] hover:bg-[#d6eb34] text-slate-900 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch Now</span>
        </button>
      </div>

    </div>
  );
};
