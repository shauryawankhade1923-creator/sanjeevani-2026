import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Package, 
  Send, 
  Bike, 
  Home, 
  Activity, 
  PlayCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getRemainingShelfLifeMinutes } from '../utils/engine';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    donations, 
    volunteers, 
    tasks, 
    shelters 
  } = useApp();

  // Calculate live badge counts
  const atRiskDonationCount = donations.filter((d) => {
    if (d.status === 'EXPIRED' || d.status === 'DELIVERED') return false;
    const rem = getRemainingShelfLifeMinutes(d.expiresAt);
    return rem > 0 && rem <= 75;
  }).length;

  const ghostRiderCount = volunteers.filter(
    (v) => v.responsiveness === 'UNRESPONSIVE'
  ).length;

  const inTransitCount = tasks.filter(
    (t) => t.status === 'IN_TRANSIT'
  ).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      badge: undefined
    },
    {
      id: 'donations',
      label: 'Aid Donations',
      icon: Package,
      badge: atRiskDonationCount > 0 ? `${atRiskDonationCount} urgent` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'dispatch',
      label: 'Dispatch Center',
      icon: Send,
      badge: inTransitCount > 0 ? `${inTransitCount} transit` : undefined,
      badgeColor: 'bg-teal-100 text-teal-800'
    },
    {
      id: 'volunteers',
      label: 'Volunteer Fleet',
      icon: Bike,
      badge: ghostRiderCount > 0 ? `${ghostRiderCount} stall` : undefined,
      badgeColor: 'bg-red-100 text-red-800'
    },
    {
      id: 'shelters',
      label: 'Shelters & Camps',
      icon: Home,
      badge: undefined
    },
    {
      id: 'events',
      label: 'Live Operations Log',
      icon: Activity,
      badge: undefined
    },
    {
      id: 'demo',
      label: 'Demo Control Center',
      icon: PlayCircle,
      badge: '4 Scenarios',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold'
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
          Operational Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isActive ? 'bg-white/20 text-white' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Municipal Reliability Status Footer */}
      <div className="p-4 m-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center space-x-2 text-emerald-800 font-bold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Safety Validator</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Rule-enforced dispatch with strict water, cooking fuel, and dynamic expiry constraints.
        </p>
        <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-mono">
          <span>Engine: Active</span>
          <span className="text-emerald-700 font-bold">100% Policy Pass</span>
        </div>
      </div>
    </aside>
  );
};
