import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Bike, 
  Home, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  rankSheltersForDispatch, 
  calculateBatchSplit, 
  getRemainingShelfLifeMinutes 
} from '../utils/engine';

export const DispatchCenterView: React.FC = () => {
  const { 
    donations, 
    shelters, 
    volunteers, 
    tasks, 
    claimTask, 
    splitAndDispatch, 
    smartMultiShelterDispatch,
    selectedDonationId,
    setSelectedDonationId,
    setActiveTab 
  } = useApp();

  const activeDonations = donations.filter((d) => d.remainingQuantity > 0 && d.status !== 'EXPIRED');
  
  // Ensure selectedDonation is valid
  const selectedDonation = donations.find((d) => d.id === selectedDonationId) || activeDonations[0] || donations[0];

  // Selected Shelter
  const [selectedShelterId, setSelectedShelterId] = useState<string>('sh-01');

  // Selected Dispatch Mode: 'MULTI_SPLIT' | 'SINGLE' | 'MULTI_SHELTER'
  const [dispatchMode, setDispatchMode] = useState<'MULTI_SPLIT' | 'SINGLE' | 'MULTI_SHELTER'>('MULTI_SPLIT');
  const [singleRiderId, setSingleRiderId] = useState<string>('');
  const [dispatchQuantity, setDispatchQuantity] = useState<number>(40);

  // Dispatch feedback toast
  const [dispatchNotice, setDispatchNotice] = useState<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
  } | null>(null);

  if (!selectedDonation) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-xl mx-auto shadow-sm">
        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Active Surplus In Dispatch Queue</h3>
        <p className="text-xs text-slate-500 mt-1">
          All surplus aid batches have been fully dispatched, delivered, or expired.
        </p>
        <button
          onClick={() => setActiveTab('donations')}
          className="mt-4 px-5 py-2.5 bg-[#0C382E] hover:bg-[#154E41] text-white text-xs font-bold rounded-full transition shadow-xs"
        >
          Register New Surplus Batch
        </button>
      </div>
    );
  }

  // Calculate Shelter Rankings and Eligibility based on current dispatch mode
  const shelterRankings = rankSheltersForDispatch(
    selectedDonation,
    shelters,
    dispatchMode === 'SINGLE' ? dispatchQuantity : 0
  );

  // Determine active targeted shelter
  const activeShelter = shelters.find((s) => s.id === selectedShelterId) || shelters[0];
  const activeRanking = shelterRankings.find((r) => r.shelterId === activeShelter?.id);

  // Available Riders
  const availableRiders = volunteers.filter(
    (v) => v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE'
  );

  // Available shelter capacity
  const availableCapacity = activeShelter.maxCapacity - (activeShelter.currentOccupancy + activeShelter.committedCapacity);

  // Multi-rider single shelter split preview
  const splitQuantity = Math.min(selectedDonation.remainingQuantity, Math.max(0, availableCapacity));
  const splitPreview = calculateBatchSplit(splitQuantity, availableRiders);

  const handleExecuteDispatch = () => {
    setDispatchNotice(null);

    if (dispatchMode === 'MULTI_SHELTER') {
      const res = smartMultiShelterDispatch(selectedDonation.id);
      if (res.success) {
        setDispatchNotice({ type: 'SUCCESS', message: res.message });
      } else {
        setDispatchNotice({ type: 'ERROR', message: res.message });
      }
    } else if (dispatchMode === 'MULTI_SPLIT') {
      const res = splitAndDispatch(selectedDonation.id, activeShelter.id);
      if (res.success) {
        setDispatchNotice({ type: 'SUCCESS', message: res.message });
      } else {
        setDispatchNotice({ type: 'ERROR', message: res.message });
      }
    } else {
      if (!singleRiderId) {
        setDispatchNotice({ type: 'ERROR', message: 'Please select an available volunteer rider.' });
        return;
      }
      const res = claimTask(selectedDonation.id, singleRiderId, activeShelter.id, dispatchQuantity);
      if (res.success) {
        setDispatchNotice({ type: 'SUCCESS', message: `Dispatched ${dispatchQuantity} units to ${activeShelter.name}.` });
      } else {
        setDispatchNotice({ type: 'ERROR', message: res.error || 'Dispatch failed' });
      }
    }
  };

  const remMinutes = getRemainingShelfLifeMinutes(selectedDonation.expiresAt);

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-10">
      
      {/* Top Header */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Rule-Enforced Dispatch Engine
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Explainable Multi-Variable Scoring</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dispatch Coordination & Knapsack Splitting
          </h2>
        </div>

        {/* Dispatch Feedback Toast */}
        {dispatchNotice && (
          <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center space-x-2 animate-in fade-in ${
            dispatchNotice.type === 'SUCCESS'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {dispatchNotice.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{dispatchNotice.message}</span>
          </div>
        )}
      </div>

      {/* Step 1: Batch Selector Horizontal Strip */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <label className="block text-xs font-bold text-slate-700 mb-2.5">
          Step 1: Select Surplus Batch to Coordinate
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {donations.map((d) => {
            const isSelected = d.id === selectedDonation.id;
            const rMin = getRemainingShelfLifeMinutes(d.expiresAt);
            const isExpired = rMin <= 0;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDonationId(d.id);
                  setDispatchNotice(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#0C382E] bg-emerald-50/40 ring-2 ring-[#0C382E]/20 shadow-xs'
                    : isExpired
                    ? 'border-red-200 bg-red-50/20 opacity-70'
                    : 'border-slate-200/80 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-900 truncate max-w-[150px]">{d.donorName}</span>
                  <span className={`font-mono text-xs font-extrabold ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                    {isExpired ? 'EXPIRED' : `${rMin}m left`}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{d.itemTitle}</h4>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{d.category.replace('_', ' ')}</span>
                  <span className="font-bold text-emerald-800 font-mono">{d.remainingQuantity} / {d.totalQuantity} units</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Step 2 & Step 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Candidate Shelters */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 2: Candidate Shelters & Prerequisite Validator
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluated against clean water, cooking fuel, cold-chain, and temporal decay constraints.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {shelterRankings.length} Evaluated
              </span>
            </div>

            <div className="space-y-3">
              {shelterRankings.map((ranked) => {
                const shelter = shelters.find((s) => s.id === ranked.shelterId)!;
                const isSelected = activeShelter.id === ranked.shelterId;
                const availableCap = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);

                return (
                  <div
                    key={ranked.shelterId}
                    onClick={() => {
                      setSelectedShelterId(ranked.shelterId);
                      setDispatchNotice(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0C382E] bg-emerald-50/50 shadow-xs ring-1 ring-[#0C382E]/20'
                        : ranked.isEligible
                        ? 'border-slate-200 hover:border-slate-300 bg-white'
                        : 'border-red-200 bg-red-50/20 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${ranked.isEligible ? 'bg-emerald-600' : 'bg-red-500'}`} />
                          <h4 className="font-bold text-xs text-slate-900">{shelter.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">({ranked.distanceKm} km &bull; ~{ranked.transitEtaMinutes}m ETA)</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {shelter.locationName} &bull; Capacity: <strong className="font-mono text-slate-800">{availableCap}</strong> free / {shelter.maxCapacity} max
                        </p>
                      </div>

                      <div className="text-right">
                        {ranked.isEligible ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#E5F940] text-slate-900 font-mono shadow-xs">
                            Score: {ranked.compositeScore}/100
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 uppercase tracking-wide">
                            Blocked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prerequisite Tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full ${shelter.hasCleanWater ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {shelter.hasCleanWater ? '✓ Clean Water' : '✕ No Potable Water'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${shelter.hasCookingFuel ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {shelter.hasCookingFuel ? '✓ Cooking Fuel' : '✕ No Kitchen/Fuel'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${shelter.hasRefrigeration ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                        {shelter.hasRefrigeration ? '✓ Cold Chain' : 'No Cold Storage'}
                      </span>
                    </div>

                    {/* Explainable Decision Box */}
                    <div className={`mt-2.5 p-2.5 rounded-xl text-[11px] leading-relaxed ${
                      ranked.isEligible ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' : 'bg-red-50 text-red-950 border border-red-200'
                    }`}>
                      <div className="flex items-start space-x-1.5">
                        {ranked.isEligible ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <span>{ranked.explanation}</span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right Column (5 cols): Splitting & Dispatch Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Step 3: Fleet Knapsack Allocation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enforce two-wheeler capacity limits (max 40 meals per scooter).
            </p>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold mb-4">
              <button
                onClick={() => setDispatchMode('MULTI_SPLIT')}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  dispatchMode === 'MULTI_SPLIT' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Split for Shelter
              </button>
              <button
                onClick={() => setDispatchMode('MULTI_SHELTER')}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  dispatchMode === 'MULTI_SHELTER' ? 'bg-[#E5F940] text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Multi-Shelter (180M)
              </button>
              <button
                onClick={() => setDispatchMode('SINGLE')}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  dispatchMode === 'SINGLE' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Single Rider
              </button>
            </div>

            {/* Mode 1: Split for Single Selected Shelter */}
            {dispatchMode === 'MULTI_SPLIT' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination Shelter:</span>
                    <span className="font-bold text-slate-900">{activeShelter.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Intake Capacity:</span>
                    <span className="font-bold font-mono text-emerald-800">{Math.max(0, availableCapacity)} Units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Available Riders:</span>
                    <span className="font-bold text-slate-900 font-mono">{availableRiders.length} Active Riders</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Calculated Sub-Shipment Manifest:</h4>
                  {splitPreview.plan.length === 0 ? (
                    <div className="p-3.5 bg-amber-50 text-amber-800 text-xs rounded-2xl border border-amber-200">
                      No available riders with free carrying capacity.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {splitPreview.plan.map((item, idx) => (
                        <div
                          key={item.rider.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{item.rider.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {item.rider.vehicleType} (Max Cap: {item.rider.carryCapacity})
                              </p>
                            </div>
                          </div>
                          <span className="font-extrabold font-mono text-slate-900 bg-[#E5F940] px-2.5 py-0.5 rounded-full">
                            +{item.allocatedQuantity} Meals
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-[11px] text-slate-500">
                    Allocated to {activeShelter.name}: <strong className="font-mono text-slate-900">{splitPreview.totalAllocated}</strong> / {selectedDonation.remainingQuantity} units
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Multi-Shelter Complete Knapsack Allocation */}
            {dispatchMode === 'MULTI_SHELTER' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-2 text-emerald-950">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>Autonomous Multi-Facility Knapsack Engine</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    Distributes the full {selectedDonation.remainingQuantity}-meal surplus across all verified shelters (Shelter Alpha + Shelter Beta) and activates all 5 volunteer two-wheeler riders simultaneously.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Target 1: Shelter Alpha</span>
                    <strong className="text-slate-900">100 Meals (3 Riders)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target 2: Shelter Beta</span>
                    <strong className="text-slate-900">80 Meals (2 Riders)</strong>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-emerald-800">
                    <span>Total Coordinated:</span>
                    <span>180 / 180 Meals</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: Single Rider Manual Assign */}
            {dispatchMode === 'SINGLE' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Available Rider:</label>
                  <select
                    value={singleRiderId}
                    onChange={(e) => setSingleRiderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                  >
                    <option value="">-- Choose Rider --</option>
                    {availableRiders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.vehicleType} - Cap: {r.carryCapacity} meals)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payload Units to Assign:</label>
                  <input
                    type="number"
                    min="1"
                    max={Math.min(selectedDonation.remainingQuantity, availableCapacity)}
                    value={dispatchQuantity}
                    onChange={(e) => setDispatchQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Max allowed for this destination: {Math.min(selectedDonation.remainingQuantity, availableCapacity)} units
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Execute Coordinated Dispatch Button */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <button
                disabled={
                  (dispatchMode !== 'MULTI_SHELTER' && !activeRanking?.isEligible) ||
                  (dispatchMode === 'MULTI_SPLIT' && splitPreview.plan.length === 0) ||
                  (dispatchMode === 'SINGLE' && !singleRiderId)
                }
                onClick={handleExecuteDispatch}
                className={`w-full py-3.5 rounded-full font-extrabold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all ${
                  (dispatchMode === 'MULTI_SHELTER' || activeRanking?.isEligible) &&
                  !(dispatchMode === 'MULTI_SPLIT' && splitPreview.plan.length === 0) &&
                  !(dispatchMode === 'SINGLE' && !singleRiderId)
                    ? 'bg-[#E5F940] hover:bg-[#d9ec34] text-slate-900 cursor-pointer hover:scale-[1.01]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4 text-slate-900" />
                <span>
                  {dispatchMode === 'MULTI_SHELTER'
                    ? 'Execute Smart Multi-Shelter Dispatch'
                    : 'Execute Coordinated Dispatch'}
                </span>
              </button>

              {dispatchMode !== 'MULTI_SHELTER' && !activeRanking?.isEligible && (
                <p className="text-[11px] text-red-600 text-center mt-2 font-medium">
                  Dispatch blocked: Selected destination failed safety policy or available space constraints.
                </p>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
