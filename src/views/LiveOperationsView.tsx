import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, 
  Search, 
  Download, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert,
  Flame,
  RotateCcw
} from 'lucide-react';
import { EventSeverity } from '../types';

export const LiveOperationsView: React.FC = () => {
  const { events, resetAllData } = useApp();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity !== 'ALL' && ev.severity !== filterSeverity) return false;
    if (filterCategory !== 'ALL' && ev.category !== filterCategory) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return (
        ev.title.toLowerCase().includes(term) ||
        ev.message.toLowerCase().includes(term) ||
        ev.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sanjeevani_audit_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-10">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Audit Protocol
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Deterministic Event Log & Telemetry Verification</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Live Operational Event Timeline
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportJson}
            className="inline-flex items-center space-x-1.5 bg-[#0C382E] hover:bg-[#154E41] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-[#E5F940]" />
            <span>Export Audit JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search events by keyword, ID, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'CRITICAL', 'WARNING', 'SUCCESS', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                filterSeverity === sev
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 text-xs">
        <span className="text-slate-400 text-[11px] font-medium shrink-0">Category Filter:</span>
        {['ALL', 'DONATION', 'DISPATCH', 'GHOST_WATCH', 'REROUTE', 'SAFETY', 'SYSTEM'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              filterCategory === cat
                ? 'bg-[#E5F940] text-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No events match the selected criteria.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const icons = {
              CRITICAL: ShieldAlert,
              WARNING: AlertTriangle,
              SUCCESS: CheckCircle2,
              INFO: Info
            };
            const Icon = icons[ev.severity] || Info;

            const badgeStyles = {
              CRITICAL: 'bg-red-100 text-red-800 border-red-200',
              WARNING: 'bg-amber-100 text-amber-800 border-amber-200',
              SUCCESS: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              INFO: 'bg-slate-100 text-slate-800 border-slate-200'
            };

            return (
              <div key={ev.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex items-start space-x-3.5 text-xs">
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${badgeStyles[ev.severity]}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full border font-mono ${badgeStyles[ev.severity]}`}>
                        {ev.severity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full">
                        {ev.category}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-xs truncate">
                        {ev.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">
                    {ev.message}
                  </p>

                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-mono text-[10px] text-slate-600 overflow-x-auto">
                      {JSON.stringify(ev.metadata)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
