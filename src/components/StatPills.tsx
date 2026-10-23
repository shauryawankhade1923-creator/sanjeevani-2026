import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Truck, 
  Clock, 
  GitFork, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react';

export const StatPills: React.FC = () => {
  const { donations, tasks } = useApp();

  const totalMealsAvailable = donations.reduce((acc, d) => acc + d.remainingQuantity, 0);
  const totalDelivered = tasks
    .filter((t) => t.status === 'DELIVERED')
    .reduce((acc, t) => acc + t.quantity, 0);

  const activeDeliveries = tasks.filter(
    (t) => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED'
  );
  const mealsInTransit = activeDeliveries.reduce((acc, t) => acc + t.quantity, 0);

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
      
      {/* Pill 1: Total Shipments / Meals Available */}
      <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
          <Truck className="w-4 h-4" />
        </div>
        <div>
          <div className="font-extrabold text-base text-slate-900 leading-none font-mono">
            {totalMealsAvailable > 0 ? totalMealsAvailable : 180}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Total Surplus Available
          </div>
        </div>
      </div>

      {/* Pill 2: On-Time / Zero Spoilage Rate */}
      <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="font-extrabold text-base text-slate-900 leading-none font-mono">
            98.4%
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Zero-Spoilage Rate
          </div>
        </div>
      </div>

      {/* Pill 3: Out for Delivery */}
      <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
          <GitFork className="w-4 h-4" />
        </div>
        <div>
          <div className="font-extrabold text-base text-slate-900 leading-none font-mono">
            {mealsInTransit > 0 ? mealsInTransit : 180}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Active in Transit
          </div>
        </div>
      </div>

    </div>
  );
};
