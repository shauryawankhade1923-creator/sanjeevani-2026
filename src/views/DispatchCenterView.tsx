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
  Zap,
  RotateCcw,
  Package,
  Truck,
  Building2,
  Users,
  Search,
  Filter,
  Navigation,
  Activity,
  Flame,
  Droplets,
  Thermometer,
  Compass,
  AlertCircle,
  ChevronRight,
  PlayCircle
} from 'lucide-react';
import { 
  rankSheltersForDispatch, 
  calculateBatchSplit, 
  getRemainingShelfLifeMinutes,
  validateAidDependencies
} from '../utils/engine';
import { calculateDistanceKm, estimateTransitMinutes } from '../utils/geo';
import { InteractiveMap } from '../components/InteractiveMap';
import { AidCategory, Shelter, Volunteer, DeliveryTask } from '../types';

export const DispatchCenterView: React.FC = () => {
  const { 
    donations, 
    shelters, 
    volunteers, 
    tasks, 
    events,
    claimTask, 
    splitAndDispatch, 
    smartMultiShelterDispatch,
    simulateGhostRider,
    reclaimGhostTask,
    updateShelterStatus,
    rerouteTask,
    resetAllData,
    selectedDonationId,
    setSelectedDonationId,
    setActiveTab,
    runScenarioA,
    runScenarioB,
    runScenarioC,
    runScenarioD,
    runScenarioShelterFull,
    activeScenario,
    scenarioStep,
    scenarioNotes
  } = useApp();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'NORMAL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [mapMode, setMapMode] = useState<'GIS' | 'RADAR'>('GIS');

  // Selected Donation in Focus
  const activeDonations = donations.filter((d) => d.remainingQuantity > 0 && d.status !== 'EXPIRED');
  const currentDonation = donations.find((d) => d.id === selectedDonationId) || activeDonations[0] || donations[0];

  // Selected Shelter for Manual Dispatch Mode
  const [targetShelterId, setTargetShelterId] = useState<string>(shelters[0]?.id || 'sh-01');
  const [manualRiderId, setManualRiderId] = useState<string>('');
  const [manualQuantity, setManualQuantity] = useState<number>(40);
  const [activeTabPanel, setActiveTabPanel] = useState<'DISPATCH' | 'RIDERS' | 'SHELTERS' | 'LOGS'>('DISPATCH');

  // Action Feedback Toast
  const [actionNotice, setActionNotice] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO';
    message: string;
  } | null>(null);

  // ----------------------------------------------------
  // 1. SUMMARY METRICS (Strictly Data-Driven)
  // ----------------------------------------------------
  const availableMealsTotal = donations
    .filter((d) => d.status !== 'EXPIRED' && d.status !== 'CANCELLED')
    .reduce((acc, d) => acc + d.remainingQuantity, 0);

  const atRiskExpiryBatches = donations.filter((d) => {
    const mins = getRemainingShelfLifeMinutes(d.expiresAt);
    return mins > 0 && mins <= 60 && d.remainingQuantity > 0 && d.status !== 'DELIVERED';
  });

  const activeDeliveries = tasks.filter(
    (t) => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED'
  );
  const activeMealsInTransit = activeDeliveries.reduce((acc, t) => acc + t.quantity, 0);

  const deliveredTasks = tasks.filter((t) => t.status === 'DELIVERED');
  const totalDeliveredMeals = deliveredTasks.reduce((acc, t) => acc + t.quantity, 0);

  const failedOrDelayedTasks = tasks.filter(
    (t) => t.status === 'RECLAIMED' || t.status === 'CANCELLED' || t.isRerouted
  );

  // ----------------------------------------------------
  // 2. URGENT DISPATCH QUEUE RANKING
  // Prioritized by Expiry, Travel Feasibility, Compatibility, and Shelter Capacity
  // ----------------------------------------------------
  const prioritizedQueue = [...donations]
    .filter((d) => {
      if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
      if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          d.itemTitle.toLowerCase().includes(q) ||
          d.donorName.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const remA = getRemainingShelfLifeMinutes(a.expiresAt);
      const remB = getRemainingShelfLifeMinutes(b.expiresAt);
      
      // Expired items sink to the bottom
      if (remA <= 0 && remB > 0) return 1;
      if (remB <= 0 && remA > 0) return -1;
      
      // Items needing immediate dispatch with remaining quantity come first
      if (a.remainingQuantity > 0 && b.remainingQuantity === 0) return -1;
      if (b.remainingQuantity > 0 && a.remainingQuantity === 0) return 1;
      
      return remA - remB;
    });

  // Target Shelter & Rankings for the Current Donation
  const targetShelter = shelters.find((s) => s.id === targetShelterId) || shelters[0];
  const shelterRankings = currentDonation 
    ? rankSheltersForDispatch(currentDonation, shelters, 0)
    : [];
  const currentShelterRanking = shelterRankings.find((r) => r.shelterId === targetShelter?.id);

  // Available Standby Riders
  const availableRiders = volunteers.filter(
    (v) => v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE'
  );
  const totalAvailableFleetCapacity = availableRiders.reduce((acc, r) => acc + r.carryCapacity, 0);

  // Available Target Shelter Space
  const shelterAvailableSpace = targetShelter 
    ? targetShelter.maxCapacity - (targetShelter.currentOccupancy + targetShelter.committedCapacity)
    : 0;

  // Multi-Rider Split Preview for target shelter
  const splitQuantity = currentDonation 
    ? Math.min(currentDonation.remainingQuantity, Math.max(0, shelterAvailableSpace))
    : 0;
  const splitPreview = calculateBatchSplit(splitQuantity, availableRiders);

  // ----------------------------------------------------
  // DISPATCH HANDLERS
  // ----------------------------------------------------
  const handleAutoMultiRiderDispatch = () => {
    if (!currentDonation || currentDonation.remainingQuantity <= 0) {
      setActionNotice({ type: 'ERROR', message: 'No remaining quantity available for dispatch.' });
      return;
    }

    const remMinutes = getRemainingShelfLifeMinutes(currentDonation.expiresAt);
    if (remMinutes <= 0) {
      setActionNotice({ type: 'ERROR', message: 'Safety violation: Safe shelf life has expired. Food locked from dispatch.' });
      return;
    }

    // Execute Smart Multi-Shelter Dispatch (handles 180 meals across 5 riders to Alpha & Beta)
    const result = smartMultiShelterDispatch(currentDonation.id);
    if (result.success) {
      setActionNotice({
        type: 'SUCCESS',
        message: result.message
      });
    } else {
      setActionNotice({
        type: 'ERROR',
        message: result.message
      });
    }
    setTimeout(() => setActionNotice(null), 7000);
  };

  const handleManualDispatch = () => {
    if (!currentDonation) return;

    if (!manualRiderId) {
      setActionNotice({ type: 'ERROR', message: 'Please select an available rider from the fleet.' });
      return;
    }

    const result = claimTask(currentDonation.id, manualRiderId, targetShelterId, manualQuantity);
    if (result.success) {
      setActionNotice({
        type: 'SUCCESS',
        message: `Dispatched ${manualQuantity} units to ${targetShelter.name} via courier.`
      });
    } else {
      setActionNotice({
        type: 'ERROR',
        message: result.error || 'Dispatch rejected by coordination safety rules.'
      });
    }
    setTimeout(() => setActionNotice(null), 6000);
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12">
      
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          actionNotice.type === 'SUCCESS' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : actionNotice.type === 'ERROR'
            ? 'bg-red-50 text-red-900 border-red-200'
            : 'bg-sky-50 text-sky-900 border-sky-200'
        }`}>
          <div className="flex items-center space-x-2">
            {actionNotice.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {actionNotice.type === 'ERROR' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
            {actionNotice.type === 'INFO' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>
      )}

      {/* 1. RELIEF COORDINATOR COMMAND HEADER */}
      <div className="bg-white/95 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="bg-[#0C382E] text-[#E5F940] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Central Control Room
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Real-Time Civic Micro-Logistics & Spoilage Prevention Engine
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            Relief Coordinator Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Autonomous matching, knapsack batch splitting, in-transit shelter rerouting, and dead-man ghost reservation reclamation.
          </p>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={resetAllData}
            title="Reset system to fresh baseline parameters"
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-full border border-slate-200 shadow-xs text-xs font-bold transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo Baseline</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className="flex items-center space-x-1.5 bg-[#0C382E] hover:bg-[#14493D] text-white px-4 py-2.5 rounded-full shadow-xs text-xs font-bold transition"
          >
            <PlayCircle className="w-4 h-4 text-[#E5F940]" />
            <span>Scenario Controls</span>
          </button>

          <button
            onClick={handleAutoMultiRiderDispatch}
            className="flex items-center space-x-2 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 px-5 py-2.5 rounded-full shadow-sm text-xs font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-slate-900" />
            <span>Auto Split & Dispatch Batch</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (5 Essential Control Room Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Available Surplus */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Available Surplus
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
              {availableMealsTotal}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Ready for courier claim
            </span>
          </div>
        </div>

        {/* Card 2: At Risk of Expiry */}
        <div className={`rounded-3xl p-5 border shadow-xs flex items-center space-x-3.5 transition-all ${
          atRiskExpiryBatches.length > 0
            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
            : 'bg-white/90 border-slate-200/90 text-slate-800'
        }`}>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            atRiskExpiryBatches.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider opacity-75 block leading-tight">
              Expiry Risk (&lt;60m)
            </span>
            <span className="text-2xl font-black font-mono tracking-tight leading-none mt-1 block">
              {atRiskExpiryBatches.length}
            </span>
            <span className="text-[10px] font-medium opacity-90 mt-1 block">
              {atRiskExpiryBatches.length > 0 ? 'Immediate dispatch needed' : 'All safe shelf-lives stable'}
            </span>
          </div>
        </div>

        {/* Card 3: Active Deliveries in Transit */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Active in Transit
            </span>
            <span className="text-2xl font-black text-purple-950 font-mono tracking-tight leading-none mt-1 block">
              {activeMealsInTransit}
            </span>
            <span className="text-[10px] text-purple-700 font-semibold mt-1 block">
              Across {activeDeliveries.length} field couriers
            </span>
          </div>
        </div>

        {/* Card 4: Successful Deliveries */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Total Delivered
            </span>
            <span className="text-2xl font-black text-emerald-950 font-mono tracking-tight leading-none mt-1 block">
              {totalDeliveredMeals}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
              Zero food waste achieved
            </span>
          </div>
        </div>

        {/* Card 5: Failed / Reclaimed Assignments */}
        <div className={`rounded-3xl p-5 border shadow-xs flex items-center space-x-3.5 transition-all ${
          failedOrDelayedTasks.length > 0
            ? 'bg-rose-50/90 border-rose-200 text-rose-900'
            : 'bg-white/90 border-slate-200/90 text-slate-800'
        }`}>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            failedOrDelayedTasks.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider opacity-75 block leading-tight">
              Reclaimed / Rerouted
            </span>
            <span className="text-2xl font-black font-mono tracking-tight leading-none mt-1 block">
              {failedOrDelayedTasks.length}
            </span>
            <span className="text-[10px] font-medium opacity-90 mt-1 block">
              Auto-recovered missions
            </span>
          </div>
        </div>

      </div>

      {/* 3. WORKING DEMO SCENARIOS CONTROL STRIP (Requirement: 5 Working Scenarios) */}
      <div className="bg-[#111614] text-white p-5 sm:p-6 rounded-3xl border border-[#1E2522] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#232D28]">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-[#E5F940]" />
            <h3 className="text-sm font-bold tracking-tight text-white">
              Deterministic Scenario Simulation Testbed
            </h3>
            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-[#E5F940]/10 text-[#E5F940] border border-[#E5F940]/30">
              Active Engine
            </span>
          </div>
          
          <span className="text-xs text-slate-400 font-mono">
            Status: {activeScenario !== 'NONE' ? `${activeScenario} (Step ${scenarioStep})` : 'Standby Baseline'}
          </span>
        </div>

        {/* 5 Working Interactive Scenarios Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Scenario 1: Rider Stops Responding */}
          <button
            onClick={runScenarioB}
            className="p-3.5 rounded-2xl bg-[#1A221E] hover:bg-[#232D28] border border-[#2B3731] text-left transition group"
          >
            <div className="flex items-center justify-between text-[#E5F940] mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase">Scenario 1</span>
              <Bike className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="font-extrabold text-white text-xs leading-snug">Rider Stops Responding</p>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">
              Watchdog expires stalled reservation & auto-reclaims cargo.
            </p>
          </button>

          {/* Scenario 2: Shelter Closes During Transit */}
          <button
            onClick={runScenarioC}
            className="p-3.5 rounded-2xl bg-[#1A221E] hover:bg-[#232D28] border border-[#2B3731] text-left transition group"
          >
            <div className="flex items-center justify-between text-[#E5F940] mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase">Scenario 2</span>
              <Navigation className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="font-extrabold text-white text-xs leading-snug">Mid-Transit Shelter Closure</p>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">
              Emergency closure triggers instant in-transit reroute.
            </p>
          </button>

          {/* Scenario 3: Shelter Becomes Full */}
          <button
            onClick={runScenarioShelterFull}
            className="p-3.5 rounded-2xl bg-[#1A221E] hover:bg-[#232D28] border border-[#2B3731] text-left transition group"
          >
            <div className="flex items-center justify-between text-[#E5F940] mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase">Scenario 3</span>
              <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="font-extrabold text-white text-xs leading-snug">Shelter Becomes Full</p>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">
              100% capacity triggers spillover rejection & backup shelter.
            </p>
          </button>

          {/* Scenario 4: Aid Fails Compatibility */}
          <button
            onClick={runScenarioD}
            className="p-3.5 rounded-2xl bg-[#1A221E] hover:bg-[#232D28] border border-[#2B3731] text-left transition group"
          >
            <div className="flex items-center justify-between text-[#E5F940] mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase">Scenario 4</span>
              <ShieldAlert className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="font-extrabold text-white text-xs leading-snug">Compatibility Failure</p>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">
              Blocks aid without clean water or kitchen stoves.
            </p>
          </button>

          {/* Scenario 5: Expiry Emergency Surge */}
          <button
            onClick={runScenarioA}
            className="p-3.5 rounded-2xl bg-[#1A221E] hover:bg-[#232D28] border border-[#2B3731] text-left transition group"
          >
            <div className="flex items-center justify-between text-[#E5F940] mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase">Scenario 5</span>
              <Flame className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="font-extrabold text-white text-xs leading-snug">75m Expiry Crisis</p>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">
              180 meals split across 5 riders to Alpha & Beta.
            </p>
          </button>

        </div>

        {/* Live Scenario Progress Status Banner */}
        {activeScenario !== 'NONE' && (
          <div className="p-3 rounded-xl bg-[#161D19] border border-[#2A352F] text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#E5F940] animate-ping" />
              <span className="font-mono text-[#E5F940] font-bold">Step {scenarioStep}:</span>
              <span className="text-slate-200">{scenarioNotes}</span>
            </div>
            <button
              onClick={resetAllData}
              className="text-[11px] text-slate-400 hover:text-white underline ml-2 shrink-0"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN WORKSPACE: MAP (LEFT) + DISPATCH ENGINE & ALLOCATION (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN (7 COLS): CENTRAL DISPATCH MAP */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200/90 shadow-xs flex-1 flex flex-col">
            
            {/* Map Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-[#0C382E]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Central Geospatial Dispatch & Telemetry Map
                </h3>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full text-[10px] font-bold">
                <button
                  onClick={() => setMapMode('GIS')}
                  className={`px-3 py-1 rounded-full transition ${
                    mapMode === 'GIS' ? 'bg-[#0C382E] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  OpenStreetMap (GIS)
                </button>
                <button
                  onClick={() => setMapMode('RADAR')}
                  className={`px-3 py-1 rounded-full transition ${
                    mapMode === 'RADAR' ? 'bg-[#0C382E] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tactical Grid
                </button>
              </div>
            </div>

            {/* Embedded OpenStreetMap with Clean Free Tiles */}
            <div className="w-full flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 relative">
              <InteractiveMap compact={false} />
            </div>

            {/* Map Legend */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#065f46]" />
                  <span>Donors</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  <span>Shelters (Blue)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                  <span>Full/Closed (Red)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>Couriers (Gold)</span>
                </span>
              </div>
              <span className="font-mono text-slate-400">
                Live Geocoded Bounds (Delhi NCR)
              </span>
            </div>

          </div>

          {/* DONATION ALLOCATION & QUANTITY CONSERVATION PANEL */}
          {currentDonation && (
            <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200/90 shadow-xs">
              
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Allocation Panel
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {currentDonation.itemTitle} (#{currentDonation.id.slice(-6)})
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">
                  Total Payload: {currentDonation.totalQuantity} units
                </span>
              </div>

              {/* Proportional Conservation Progress Bar */}
              {(() => {
                const total = currentDonation.totalQuantity;
                const rem = currentDonation.remainingQuantity;
                const delivered = tasks
                  .filter((t) => t.donationId === currentDonation.id && t.status === 'DELIVERED')
                  .reduce((a, t) => a + t.quantity, 0);
                const inTransit = tasks
                  .filter((t) => t.donationId === currentDonation.id && (t.status === 'IN_TRANSIT' || t.status === 'CLAIMED'))
                  .reduce((a, t) => a + t.quantity, 0);

                const remPct = (rem / total) * 100;
                const inTransitPct = (inTransit / total) * 100;
                const deliveredPct = (delivered / total) * 100;

                return (
                  <div className="space-y-2">
                    <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        style={{ width: `${remPct}%` }} 
                        className="bg-emerald-500 h-full transition-all" 
                        title={`Available: ${rem}`} 
                      />
                      <div 
                        style={{ width: `${inTransitPct}%` }} 
                        className="bg-purple-500 h-full transition-all" 
                        title={`In Transit: ${inTransit}`} 
                      />
                      <div 
                        style={{ width: `${deliveredPct}%` }} 
                        className="bg-teal-600 h-full transition-all" 
                        title={`Delivered: ${delivered}`} 
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Total</span>
                        <span className="font-mono font-black text-slate-900">{total}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">Available</span>
                        <span className="font-mono font-black text-emerald-900">{rem}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
                        <span className="text-[10px] text-purple-700 font-bold block uppercase">In Transit</span>
                        <span className="font-mono font-black text-purple-900">{inTransit}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-teal-50 border border-teal-100">
                        <span className="text-[10px] text-teal-700 font-bold block uppercase">Delivered</span>
                        <span className="font-mono font-black text-teal-900">{delivered}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

        </div>

        {/* RIGHT COLUMN (5 COLS): DISPATCH EXECUTION & CAPACITY KNAPSACK */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Active Donation Details & Batch Splitting Card */}
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200/90 shadow-xs flex-1 flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-emerald-700" />
                  <span>Dispatch Execution Engine</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Safe Shelf-Life: {getRemainingShelfLifeMinutes(currentDonation.expiresAt)} min
                </span>
              </div>

              {/* Target Shelter Selector */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target Recipient Shelter
                  </label>
                  <select
                    value={targetShelterId}
                    onChange={(e) => setTargetShelterId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#0C382E]"
                  >
                    {shelters.map((s) => {
                      const avail = s.maxCapacity - (s.currentOccupancy + s.committedCapacity);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status}) — Avail: {avail} / Cap: {s.maxCapacity}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Compatibility & Safety Audit Card */}
                {currentShelterRanking && (() => {
                  const aidDepCheck = currentDonation ? validateAidDependencies(currentDonation.category, targetShelter) : { passed: true };
                  const isSafeAndFeasible = aidDepCheck.passed && currentShelterRanking.feasibleWithinExpiry && currentShelterRanking.isEligible;

                  return (
                    <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                      isSafeAndFeasible
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-red-50/70 border-red-200 text-red-950'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-1.5">
                          {isSafeAndFeasible ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                          )}
                          <span>
                            {isSafeAndFeasible
                              ? 'Route Verified Safe & Compatible'
                              : 'Dispatch Policy Violation'}
                          </span>
                        </span>

                        <span className="font-mono text-[11px]">
                          ETA: {currentShelterRanking.transitEtaMinutes}m (Dist: {currentShelterRanking.distanceKm} km)
                        </span>
                      </div>

                      {!aidDepCheck.passed && aidDepCheck.reason && (
                        <p className="text-[11px] text-red-800 font-semibold leading-tight">
                          ✕ {aidDepCheck.reason}
                        </p>
                      )}

                      {!currentShelterRanking.feasibleWithinExpiry && (
                        <p className="text-[11px] text-red-800 font-semibold leading-tight">
                          ✕ Transit duration exceeds safe shelf-life deadline.
                        </p>
                      )}

                      {currentShelterRanking.ineligibilityReasons.length > 0 && aidDepCheck.passed && currentShelterRanking.feasibleWithinExpiry && (
                        <p className="text-[11px] text-red-800 font-semibold leading-tight">
                          ✕ {currentShelterRanking.ineligibilityReasons.join('; ')}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] border-t border-current/10">
                        <span>Water Verified: {targetShelter.hasCleanWater ? '✓ Clean' : '✕ None'}</span>
                        <span>Kitchen Stoves: {targetShelter.hasCookingFuel ? '✓ Active' : '✕ None'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Multi-Rider Knapsack Split Preview */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Available Standby Couriers:</span>
                    <span className="font-mono text-slate-600 font-bold">
                      {availableRiders.length} couriers ({totalAvailableFleetCapacity} units cap)
                    </span>
                  </div>

                  {splitPreview.feasible ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-600">
                        Optimal Knapsack Partition: Allocating <strong>{splitPreview.totalAllocated} units</strong> across {splitPreview.plan.length} couriers without drop.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {splitPreview.plan.map((sp, idx) => (
                          <span 
                            key={sp.rider.id}
                            className="bg-white px-2.5 py-1 rounded-xl text-[10.5px] font-mono font-bold text-slate-800 border border-slate-200 shadow-2xs"
                          >
                            {sp.rider.name}: {sp.allocatedQuantity} meals
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 font-medium">
                      Fleet capacity insufficient for single-shelter payload. Use <strong>Smart Multi-Shelter Dispatch</strong> to distribute across multiple shelters.
                    </p>
                  )}
                </div>

                {/* Manual Single Courier Picker */}
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Or Assign Dedicated Field Courier:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={manualRiderId}
                      onChange={(e) => setManualRiderId(e.target.value)}
                      className="col-span-2 px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                    >
                      <option value="">-- Choose Courier --</option>
                      {availableRiders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.vehicleType}, Cap: {r.carryCapacity})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleManualDispatch}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
                    >
                      Assign Rider
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom 1-Click Multi-Shelter Dispatch Action */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Recommended Action</span>
                <span className="text-xs font-extrabold text-slate-800">Automated Multi-Shelter Split</span>
              </div>

              <button
                onClick={handleAutoMultiRiderDispatch}
                className="px-5 py-2.5 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 font-black rounded-full shadow-xs transition hover:scale-105 active:scale-95 text-xs flex items-center space-x-1.5"
              >
                <span>Dispatch All Payload</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* 5. TABS ROW: DISPATCH QUEUE | FLEET AVAILABILITY | SHELTER STATUS | AUDIT LOG */}
      <div className="space-y-4">
        
        {/* Navigation Tabs Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-3xl border border-slate-200/80 shadow-xs">
          
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setActiveTabPanel('DISPATCH')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTabPanel === 'DISPATCH'
                  ? 'bg-[#0C382E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Urgent Dispatch Queue ({prioritizedQueue.length})
            </button>

            <button
              onClick={() => setActiveTabPanel('RIDERS')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTabPanel === 'RIDERS'
                  ? 'bg-[#0C382E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Volunteer Fleet Status ({volunteers.length})
            </button>

            <button
              onClick={() => setActiveTabPanel('SHELTERS')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTabPanel === 'SHELTERS'
                  ? 'bg-[#0C382E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Shelter Infrastructure ({shelters.length})
            </button>

            <button
              onClick={() => setActiveTabPanel('LOGS')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTabPanel === 'LOGS'
                  ? 'bg-[#0C382E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Operations Event Log
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search active missions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
            />
          </div>

        </div>

        {/* TAB 1: URGENT DISPATCH QUEUE */}
        {activeTabPanel === 'DISPATCH' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Batch ID & Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Remaining / Total</th>
                    <th className="py-3 px-4">Shelf-Life Deadline</th>
                    <th className="py-3 px-4">Feasibility & Compatibility</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prioritizedQueue.map((d) => {
                    const remMin = getRemainingShelfLifeMinutes(d.expiresAt);
                    const isExpired = remMin <= 0 && d.status !== 'DELIVERED';
                    const isCritical = remMin > 0 && remMin <= 30 && d.status !== 'DELIVERED';
                    const isSelected = currentDonation?.id === d.id;

                    return (
                      <tr 
                        key={d.id} 
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => setSelectedDonationId(d.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-slate-400">#{d.id.slice(-4)}</span>
                            <div>
                              <p className="font-extrabold text-slate-900">{d.itemTitle}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{d.pickupLocation}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                            {d.category.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                          {d.remainingQuantity} / {d.totalQuantity} units
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.status === 'DELIVERED' ? (
                            <span className="text-teal-700 font-bold">Fulfilled</span>
                          ) : isExpired ? (
                            <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              EXPIRED
                            </span>
                          ) : (
                            <span className={`font-mono font-bold ${isCritical ? 'text-red-700' : 'text-slate-800'}`}>
                              {remMin} min remaining
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.requiresCleanWater ? (
                            <span className="inline-flex items-center space-x-1 text-[10.5px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              <Droplets className="w-3 h-3 text-sky-600" />
                              <span>Requires Potable Water</span>
                            </span>
                          ) : d.requiresCooking ? (
                            <span className="inline-flex items-center space-x-1 text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Flame className="w-3 h-3 text-amber-600" />
                              <span>Requires Kitchen Fuel</span>
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[10.5px] flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Ready to Consume</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            d.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {d.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {d.remainingQuantity > 0 && !isExpired ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDonationId(d.id);
                                handleAutoMultiRiderDispatch();
                              }}
                              className="px-3 py-1 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 font-black rounded-full text-[10.5px] shadow-2xs"
                            >
                              Dispatch
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">Closed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VOLUNTEER FLEET STATUS */}
        {activeTabPanel === 'RIDERS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {volunteers.map((v) => {
              const isGhost = v.responsiveness === 'UNRESPONSIVE';
              const isInTransit = v.status === 'IN_TRANSIT';
              const isAvailable = v.status === 'AVAILABLE';

              return (
                <div key={v.id} className="bg-white/90 p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">#{v.id}</span>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        isGhost ? 'bg-red-100 text-red-800 animate-pulse' : isAvailable ? 'bg-emerald-50 text-emerald-800' : 'bg-purple-50 text-purple-800'
                      }`}>
                        {isGhost ? 'UNRESPONSIVE (STALL)' : v.status}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-sm">{v.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{v.phone} • Zone: {v.zone}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Vehicle Type</span>
                        <p className="font-bold text-slate-800">{v.vehicleType}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Carry Capacity</span>
                        <p className="font-mono font-bold text-slate-900">{v.carryCapacity} meals</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">
                      Reliability: {Math.round(v.reliabilityScore * 100)}%
                    </span>
                    {isAvailable && (
                      <button
                        onClick={() => simulateGhostRider(v.id)}
                        className="text-[10.5px] font-bold text-rose-700 hover:underline"
                        title="Simulate loss of GPS signal / courier stall"
                      >
                        Simulate Stall
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: SHELTER INFRASTRUCTURE */}
        {activeTabPanel === 'SHELTERS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shelters.map((s) => {
              const freeSpace = s.maxCapacity - (s.currentOccupancy + s.committedCapacity);
              const isFull = s.status === 'CAPACITY_REACHED' || freeSpace <= 0;
              const isClosed = s.status === 'CLOSED';

              return (
                <div key={s.id} className="bg-white/90 p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">#{s.id}</span>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        isClosed ? 'bg-red-100 text-red-800' : isFull ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base">{s.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{s.locationName} • Contact: {s.contactPhone}</p>

                    {/* Capacity Meter */}
                    <div className="mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Capacity Intake:</span>
                        <span className="font-mono">{s.currentOccupancy + s.committedCapacity} / {s.maxCapacity} meals</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, ((s.currentOccupancy + s.committedCapacity) / s.maxCapacity) * 100)}%` }}
                          className={`h-full ${isFull ? 'bg-red-500' : 'bg-[#0C382E]'}`}
                        />
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-1 font-mono">
                        Available Open Beds/Meals: {Math.max(0, freeSpace)} units
                      </p>
                    </div>

                    {/* Infrastructure Badges */}
                    <div className="mt-3 flex flex-wrap gap-2 text-[10.5px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${s.hasCleanWater ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {s.hasCleanWater ? '✓ Clean Drinking Water' : '✕ No Potable Water'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-bold ${s.hasCookingFuel ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {s.hasCookingFuel ? '✓ Active Kitchen Stoves' : '✕ No Kitchen Stoves'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Status Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">Simulate State:</span>
                    <div className="space-x-1.5">
                      <button
                        onClick={() => updateShelterStatus(s.id, 'CAPACITY_REACHED', s.maxCapacity)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-[10.5px]"
                      >
                        Set Full
                      </button>
                      <button
                        onClick={() => updateShelterStatus(s.id, s.status === 'CLOSED' ? 'ACCEPTING' : 'CLOSED')}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-900 rounded-lg font-bold text-[10.5px]"
                      >
                        {s.status === 'CLOSED' ? 'Open' : 'Close'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: OPERATIONS AUDIT STREAM */}
        {activeTabPanel === 'LOGS' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-xs">Live Telemetry & Dispatch Audit Stream</span>
              <span className="text-[10px] font-mono text-slate-400">Total Events: {events.length}</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.slice(0, 10).map((ev) => (
                <div key={ev.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                        ev.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : ev.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ev.severity}
                      </span>
                      <span className="font-bold text-slate-900">{ev.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{ev.message}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{ev.timestamp.slice(11, 19)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};