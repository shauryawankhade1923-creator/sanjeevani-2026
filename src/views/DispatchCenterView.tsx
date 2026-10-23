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
  Info
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
    setActiveTab 
  } = useApp();

  // Active Selected Donation
  const activeDonations = donations.filter((d) => d.remainingQuantity > 0 && d.status !== 'EXPIRED');
  const [selectedDonationId, setSelectedDonationId] = useState<string>(
    activeDonations[0]?.id || ''
  );

  const selectedDonation = donations.find((d) => d.id === selectedDonationId) || activeDonations[0];

  // Selected Shelter
  const [selectedShelterId, setSelectedShelterId] = useState<string>('');

  // Selected Dispatch Mode: 'SINGLE' | 'MULTI_SPLIT'
  const [dispatchMode, setDispatchMode] = useState<'SINGLE' | 'MULTI_SPLIT'>('MULTI_SPLIT');
  const [singleRiderId, setSingleRiderId] = useState<string>('');
  const [dispatchQuantity, setDispatchQuantity] = useState<number>(40);

  // Dispatch feedback toast
  const [dispatchNotice, setDispatchNotice] = useState<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
  } | null>(null);

  if (!selectedDonation) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Active Surplus Ready for Dispatch</h3>
        <p className="text-xs text-slate-500 mt-1">
          All surplus aid batches have been fully dispatched, delivered, or expired.
        </p>
        <button
          onClick={() => setActiveTab('donations')}
          className="mt-4 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl"
        >
          Create New Donation Batch
        </button>
      </div>
    );
  }

  // Calculate Shelter Rankings and Eligibility
  const shelterRankings = rankSheltersForDispatch(
    selectedDonation,
    shelters,
    selectedDonation.remainingQuantity
  );

  // Determine active targeted shelter
  const activeShelter = shelters.find((s) => s.id === selectedShelterId) || shelters[0];
  const activeRanking = shelterRankings.find((r) => r.shelterId === activeShelter?.id);

  // Available Riders
  const availableRiders = volunteers.filter(
    (v) => v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE'
  );

  // Preview Multi-Rider Split
  const splitQuantity = Math.min(
    selectedDonation.remainingQuantity,
    activeShelter.maxCapacity - (activeShelter.currentOccupancy + activeShelter.committedCapacity)
  );

  const splitPreview = calculateBatchSplit(
    Math.max(0, splitQuantity),
    availableRiders
  );

  const handleExecuteDispatch = () => {
    setDispatchNotice(null);

    if (dispatchMode === 'MULTI_SPLIT') {
      const res = splitAndDispatch(selectedDonation.id, activeShelter.id);
      if (res.success) {
        setDispatchNotice({ type: 'SUCCESS', message: res.message });
      } else {
        setDispatchNotice({ type: 'ERROR', message: res.message });
      }
    } else {
      if (!singleRiderId) {
        setDispatchNotice({ type: 'ERROR', message: 'Please select a volunteer rider for single dispatch.' });
        return;
      }
      const res = claimTask(selectedDonation.id, singleRiderId, activeShelter.id, dispatchQuantity);
      if (res.success) {
        setDispatchNotice({ type: 'SUCCESS', message: `Dispatched ${dispatchQuantity} units successfully.` });
      } else {
        setDispatchNotice({ type: 'ERROR', message: res.error || 'Dispatch failed' });
      }
    }
  };

  const remMinutes = getRemainingShelfLifeMinutes(selectedDonation.expiresAt);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Autonomous Dispatch Engine
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Explainable Multi-Variable Scoring</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Dispatch Coordination & Knapsack Splitting
          </h2>
        </div>

        {/* Dispatch Feedback Toast */}
        {dispatchNotice && (
          <div className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 animate-in fade-in ${
            dispatchNotice.type === 'SUCCESS'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {dispatchNotice.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{dispatchNotice.message}</span>
          </div>
        )}
      </div>

      {/* Step 1: Ingested Batch Selection Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold text-slate-700 mb-2">
          Step 1: Select Surplus Aid Batch to Coordinate
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {activeDonations.map((d) => {
            const isSelected = d.id === selectedDonation.id;
            const rMin = getRemainingShelfLifeMinutes(d.expiresAt);
            return (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDonationId(d.id);
                  setDispatchNotice(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-900 truncate max-w-[140px]">{d.donorName}</span>
                  <span className="font-mono text-xs font-extrabold text-amber-700">{rMin}m left</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{d.itemTitle}</h4>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{d.category.replace('_', ' ')}</span>
                  <span className="font-bold font-mono text-emerald-700">{d.remainingQuantity} units</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 & 3: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Candidate Shelters with Explainable Scoring (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 2: Candidate Shelters & Prerequisite Validator
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluated against clean water, cooking fuel, cold-chain, and temporal decay constraints.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
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
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/40 shadow-sm'
                        : ranked.isEligible
                        ? 'border-slate-200 hover:border-slate-300 bg-white'
                        : 'border-red-200 bg-red-50/20 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${ranked.isEligible ? 'bg-emerald-600' : 'bg-red-500'}`} />
                          <h4 className="font-bold text-xs text-slate-900">{shelter.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">({ranked.distanceKm} km &bull; ~{ranked.transitEtaMinutes}m ETA)</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {shelter.locationName} &bull; Capacity: <strong className="font-mono">{availableCap}</strong> free / {shelter.maxCapacity} max
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {ranked.isEligible ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 font-mono">
                              Score: {ranked.compositeScore}/100
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 uppercase tracking-wide">
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prerequisite Tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded ${shelter.hasCleanWater ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {shelter.hasCleanWater ? '✓ Clean Water' : '✕ No Potable Water'}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${shelter.hasCookingFuel ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {shelter.hasCookingFuel ? '✓ Cooking Fuel' : '✕ No Kitchen/Fuel'}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${shelter.hasRefrigeration ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                        {shelter.hasRefrigeration ? '✓ Cold Chain' : 'No Cold Storage'}
                      </span>
                    </div>

                    {/* Explainable Decision Text */}
                    <div className={`mt-2.5 p-2 rounded-lg text-[11px] ${
                      ranked.isEligible ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
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

        {/* Right Column: Multi-Rider Splitting & Dispatch Execution (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Step 3: Multi-Vehicle Knapsack Splitting
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enforcing individual rider carrying limits (e.g. 40 meals max per two-wheeler).
            </p>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold mb-4">
              <button
                onClick={() => setDispatchMode('MULTI_SPLIT')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  dispatchMode === 'MULTI_SPLIT' ? 'bg-white text-emerald-900 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Multi-Rider Split
              </button>
              <button
                onClick={() => setDispatchMode('SINGLE')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  dispatchMode === 'SINGLE' ? 'bg-white text-emerald-900 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Single Rider
              </button>
            </div>

            {dispatchMode === 'MULTI_SPLIT' ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Surplus to Dispatch:</span>
                    <span className="font-bold font-mono text-slate-900">{splitQuantity} Meals</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-bold text-slate-900">{activeShelter.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Available Riders:</span>
                    <span className="font-bold text-emerald-700">{availableRiders.length} Active Riders</span>
                  </div>
                </div>

                {/* Splitting Plan Output */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Calculated Sub-Shipment Plan:</h4>
                  {splitPreview.plan.length === 0 ? (
                    <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                      No available riders with free carrying capacity.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {splitPreview.plan.map((item, idx) => (
                        <div
                          key={item.rider.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{item.rider.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {item.rider.vehicleType} (Max Cap: {item.rider.carryCapacity})
                              </p>
                            </div>
                          </div>
                          <span className="font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{item.allocatedQuantity} Meals
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-[11px] text-slate-500">
                    Total Allocated: <strong className="font-mono text-slate-900">{splitPreview.totalAllocated}</strong> / {splitQuantity} units
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Available Rider:</label>
                  <select
                    value={singleRiderId}
                    onChange={(e) => setSingleRiderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="">-- Choose Rider --</option>
                    {availableRiders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.vehicleType} - Cap: {r.carryCapacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dispatch Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={dispatchQuantity}
                    onChange={(e) => setDispatchQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Execute Dispatch Button */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <button
                disabled={!activeRanking?.isEligible || (dispatchMode === 'MULTI_SPLIT' && splitPreview.plan.length === 0)}
                onClick={handleExecuteDispatch}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition ${
                  activeRanking?.isEligible
                    ? 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Execute Coordinated Dispatch</span>
              </button>

              {!activeRanking?.isEligible && (
                <p className="text-[11px] text-red-600 text-center mt-2 font-medium">
                  Dispatch disabled: Target destination failed safety or capacity constraints.
                </p>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
