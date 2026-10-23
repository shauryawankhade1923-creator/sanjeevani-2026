import React from 'react';
import { FileText, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const RadialGaugeCard: React.FC = () => {
  const { donations, tasks, setActiveTab } = useApp();

  const totalDelivered = tasks
    .filter((t) => t.status === 'DELIVERED')
    .reduce((acc, t) => acc + t.quantity, 0);

  const totalCreated = donations.reduce((acc, d) => acc + d.totalQuantity, 0);
  const expiredMeals = donations
    .filter((d) => d.status === 'EXPIRED')
    .reduce((acc, d) => acc + d.remainingQuantity, 0);

  const activeInTransit = tasks
    .filter((t) => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED')
    .reduce((acc, t) => acc + t.quantity, 0);

  const totalTicks = 32;
  const ratio = totalCreated > 0 
    ? (totalDelivered + activeInTransit * 0.5) / totalCreated 
    : 0.5;
  const activeTicks = Math.min(totalTicks, Math.max(2, Math.round(ratio * totalTicks)));

  const zeroWastePct = totalCreated > 0
    ? Math.max(0, Math.min(100, Math.round(((totalCreated - expiredMeals) / totalCreated) * 1000) / 10))
    : 100;

  const radius = 80;
  const centerX = 110;
  const centerY = 100;

  const ticks = Array.from({ length: totalTicks }).map((_, i) => {
    // Angle in radians from Math.PI to 0
    const angle = Math.PI - (i / (totalTicks - 1)) * Math.PI;
    const innerR = radius - 14;
    const outerR = radius;

    const x1 = centerX + innerR * Math.cos(angle);
    const y1 = centerY - innerR * Math.sin(angle);
    const x2 = centerX + outerR * Math.cos(angle);
    const y2 = centerY - outerR * Math.sin(angle);

    const isActive = i <= activeTicks;

    return {
      x1,
      y1,
      x2,
      y2,
      color: isActive ? '#E5F940' : '#D0DFD4',
      width: 2.8,
    };
  });

  return (
    <div className="bg-[#DCE7DF] rounded-3xl p-6 border border-[#CADBCF] shadow-xs relative flex flex-col justify-between h-[230px]">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-800">
          <FileText className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold tracking-tight">Analytic view</h3>
        </div>
        <button 
          onClick={() => setActiveTab('events')}
          title="Open Audit Trail"
          className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-600 shadow-xs transition"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Radial Semi-Circle Meter */}
      <div className="relative flex flex-col items-center justify-center -mt-2">
        <svg width="220" height="110" viewBox="0 0 220 110" className="overflow-visible">
          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.color}
              strokeWidth={t.width}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Center Stats */}
        <div className="absolute bottom-2 text-center">
          <span className="text-[11px] font-medium text-slate-500 block">
            {totalDelivered > 0 ? 'Total Delivered' : 'Pipeline Total'}
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {totalDelivered > 0 ? `${totalDelivered} Meals` : `${activeInTransit > 0 ? activeInTransit : 180} Meals`}
          </span>
        </div>
      </div>

      {/* Bottom Subtitle */}
      <div className="flex items-center justify-center space-x-1 text-xs text-emerald-800 font-semibold">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
        <span>+{zeroWastePct}% Zero-Waste Compliance</span>
      </div>

    </div>
  );
};
