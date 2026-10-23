import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bike, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Clock, 
  UserX,
  Navigation,
  Search,
  Package, 
  Truck, 
  ArrowRight, 
  ChevronRight, 
  AlertCircle, 
  XCircle, 
  Check, 
  Camera, 
  User, 
  ShieldAlert, 
  Timer, 
  Building2, 
  Thermometer,
  Layers,
  Sparkles,
  Smartphone,
  Eye,
  Info
} from 'lucide-react';
import { getRemainingShelfLifeMinutes } from '../utils/engine';
import { calculateDistanceKm, estimateTransitMinutes } from '../utils/geo';
import { DeliveryTask, DelayReport, Volunteer } from '../types';

export const VolunteersView: React.FC = () => {
  const { 
    volunteers, 
    tasks, 
    donations, 
    shelters, 
    currentRiderId,
    setCurrentRiderId,
    updateRiderDutyStatus,
    acceptAssignment,
    declineAssignment,
    confirmArrivalAtPickup,
    confirmPickup,
    reportDelayOrProblem,
    confirmArrivalAtDestination,
    completeDeliveryWithProof,
    simulateGhostRider, 
    reclaimGhostTask 
  } = useApp();

  // Mode: 'RIDER_APP' (Personal mobile-first rider console) vs 'FLEET_WATCHDOG' (Coordinator fleet overview)
  const [viewMode, setViewMode] = useState<'RIDER_APP' | 'FLEET_WATCHDOG'>('RIDER_APP');

  // Currently logged-in active rider
  const currentRider = volunteers.find((v) => v.id === currentRiderId) || volunteers[0];

  // UI state for modals and notifications
  const [actionNotice, setActionNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);
  
  // Modals
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Vehicle issue / traffic impediment');
  
  const [showDelayModal, setShowDelayModal] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState<DelayReport['reason']>('TRAFFIC');
  const [delayMinutes, setDelayMinutes] = useState<number>(15);
  const [delayNotes, setDelayNotes] = useState<string>('');

  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofRecipientName, setProofRecipientName] = useState<string>('');
  const [proofNotes, setProofNotes] = useState<string>('');
  const [proofPhotoPreview, setProofPhotoPreview] = useState<string | null>(null);

  // Fleet overview filters
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [fleetZoneFilter, setFleetZoneFilter] = useState('ALL');

  // Active tasks for the logged in rider
  const riderTasks = tasks.filter((t) => t.riderId === currentRider.id);

  // Pending assignment (Claimed or Accepted)
  const pendingAssignments = riderTasks.filter(
    (t) => t.status === 'CLAIMED'
  );

  // Active in-progress task (Accepted, Arrived Pickup, In Transit, Arrived Destination)
  const activeDeliveryTask = riderTasks.find(
    (t) => ['ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DIVERTED'].includes(t.status)
  ) || riderTasks.find(t => t.status === 'CLAIMED');

  // Completed delivery history for this rider
  const completedTasks = riderTasks.filter((t) => t.status === 'DELIVERED');

  // Attention needed (Rerouted or Delayed)
  const attentionTasks = riderTasks.filter(
    (t) => t.isRerouted || (t.delayReport && t.status !== 'DELIVERED' && t.status !== 'CANCELLED')
  );

  // Available open unassigned tasks or newly dispatched requests across the system
  const systemClaimedTasks = tasks.filter(t => t.status === 'CLAIMED');

  const showBanner = (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 6000);
  };

  // ----------------------------------------------------
  // WORKFLOW ACTION HANDLERS
  // ----------------------------------------------------
  const handleToggleDuty = () => {
    const nextStatus = currentRider.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    const result = updateRiderDutyStatus(currentRider.id, nextStatus);
    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleAccept = (taskId: string) => {
    const result = acceptAssignment(taskId, currentRider.id);
    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleDeclineSubmit = () => {
    if (!showDeclineModal) return;
    const result = declineAssignment(showDeclineModal, currentRider.id, declineReason);
    setShowDeclineModal(null);
    if (result.success) {
      showBanner('INFO', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleArrivePickup = (taskId: string) => {
    const result = confirmArrivalAtPickup(taskId);
    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleConfirmCargoPickup = (taskId: string) => {
    confirmPickup(taskId);
    showBanner('SUCCESS', 'Cargo collected and verified. Aid shipment is now marked IN TRANSIT.');
  };

  const handleDelaySubmit = () => {
    if (!showDelayModal) return;
    const result = reportDelayOrProblem(showDelayModal, {
      reason: delayReason,
      notes: delayNotes || 'Encountered unexpected route delay.',
      estimatedDelayMinutes: Number(delayMinutes)
    });
    setShowDelayModal(null);
    setDelayNotes('');
    if (result.success) {
      showBanner('INFO', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleArriveDestination = (taskId: string) => {
    const result = confirmArrivalAtDestination(taskId);
    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleCompleteDeliverySubmit = () => {
    if (!showProofModal) return;
    if (!proofRecipientName.trim()) {
      showBanner('ERROR', 'Recipient or shelter supervisor name is required to complete delivery.');
      return;
    }
    const result = completeDeliveryWithProof(showProofModal, {
      recipientName: proofRecipientName,
      notes: proofNotes,
      photoUrl: proofPhotoPreview || undefined
    });
    setShowProofModal(null);
    setProofRecipientName('');
    setProofNotes('');
    setProofPhotoPreview(null);

    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  // Helper to get donation and shelter for a task
  const getTaskContext = (task: DeliveryTask) => {
    const donation = donations.find((d) => d.id === task.donationId);
    const targetShelter = shelters.find((s) => s.id === task.targetShelterId);
    const originalShelter = shelters.find((s) => s.id === task.originalShelterId);
    const distKm = donation && targetShelter ? calculateDistanceKm(donation.coordinates, targetShelter.coordinates) : 0;
    const etaMin = estimateTransitMinutes(distKm);
    const remMin = donation ? getRemainingShelfLifeMinutes(donation.expiresAt) : 0;
    return { donation, targetShelter, originalShelter, distKm, etaMin, remMin };
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-16">
      
      {/* Action Notification Toast Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          actionNotice.type === 'SUCCESS' 
            ? 'bg-emerald-50 text-emerald-950 border-emerald-200' 
            : actionNotice.type === 'ERROR'
            ? 'bg-red-50 text-red-950 border-red-200'
            : 'bg-amber-50 text-amber-950 border-amber-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            {actionNotice.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {actionNotice.type === 'ERROR' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
            {actionNotice.type === 'INFO' && <Info className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>
      )}

      {/* TOP BAR: Role / Courier Switcher & Duty Controls */}
      <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Active Courier Profile Card */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#0C382E] text-[#E5F940] flex items-center justify-center font-black text-xl shadow-xs border border-emerald-900/30">
              {currentRider.name.split(' ').map(n => n[0]).join('')}
            </div>
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              currentRider.status === 'AVAILABLE' 
                ? 'bg-emerald-500' 
                : currentRider.status === 'IN_TRANSIT'
                ? 'bg-purple-500 animate-pulse'
                : currentRider.status === 'RESERVED'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`} />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Field Courier
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-600 font-mono font-semibold">
                ID: {currentRider.id}
              </span>
            </div>

            <div className="flex items-center space-x-3 mt-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentRider.name}
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                ★ {Math.round(currentRider.reliabilityScore * 100)}% Reliability
              </span>
            </div>

            <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
              <span>{currentRider.vehicleType}</span>
              <span>•</span>
              <span>Max Capacity: <strong>{currentRider.carryCapacity} meals</strong></span>
              <span>•</span>
              <span>Zone: {currentRider.zone}</span>
            </p>
          </div>
        </div>

        {/* Right: Courier Switcher Dropdown, Duty Switch & View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch Courier Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100/90 rounded-2xl p-1 border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <select
              value={currentRider.id}
              onChange={(e) => setCurrentRiderId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 py-1.5 pr-2 outline-none cursor-pointer"
            >
              {volunteers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.vehicleType} - {v.carryCapacity} cap)
                </option>
              ))}
            </select>
          </div>

          {/* Duty Toggle Button */}
          <button
            onClick={handleToggleDuty}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-2 border shadow-2xs ${
              currentRider.status === 'AVAILABLE'
                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                : currentRider.status === 'IN_TRANSIT'
                ? 'bg-purple-600 text-white border-purple-700 opacity-90 cursor-not-allowed'
                : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
            }`}
            disabled={currentRider.status === 'IN_TRANSIT'}
            title={currentRider.status === 'IN_TRANSIT' ? 'Cannot change status while in transit' : 'Toggle online/offline duty status'}
          >
            <span className={`w-2 h-2 rounded-full ${currentRider.status === 'AVAILABLE' ? 'bg-[#E5F940] animate-ping' : 'bg-slate-400'}`} />
            <span>
              {currentRider.status === 'AVAILABLE' ? 'ON DUTY (Online)' : currentRider.status === 'IN_TRANSIT' ? 'IN TRANSIT' : 'OFF DUTY (Offline)'}
            </span>
          </button>

          {/* View Mode Switcher: Personal App vs Fleet Watchdog */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('RIDER_APP')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                viewMode === 'RIDER_APP'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Courier App</span>
            </button>
            <button
              onClick={() => setViewMode('FLEET_WATCHDOG')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                viewMode === 'FLEET_WATCHDOG'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Fleet Watchdog</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODE 1: DELIVERY RIDER WORKSPACE (MOBILE-FIRST CONSOLE) */}
      {/* ==================================================== */}
      {viewMode === 'RIDER_APP' && (
        <div className="space-y-6">

          {/* 1. SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            
            {/* Card 1: Available / Pending Assignments */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  New Assignments
                </span>
                <span className="text-2xl font-black text-amber-950 font-mono tracking-tight leading-none mt-1 block">
                  {pendingAssignments.length}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                  Awaiting your response
                </span>
              </div>
            </div>

            {/* Card 2: Active Deliveries */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Active in Transit
                </span>
                <span className="text-2xl font-black text-purple-950 font-mono tracking-tight leading-none mt-1 block">
                  {activeDeliveryTask && activeDeliveryTask.status !== 'CLAIMED' ? 1 : 0}
                </span>
                <span className="text-[10px] text-purple-700 font-semibold mt-1 block">
                  {activeDeliveryTask && activeDeliveryTask.status !== 'CLAIMED' ? `${activeDeliveryTask.quantity} units onboard` : 'No active haul'}
                </span>
              </div>
            </div>

            {/* Card 3: Completed Deliveries */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Completed Deliveries
                </span>
                <span className="text-2xl font-black text-emerald-950 font-mono tracking-tight leading-none mt-1 block">
                  {completedTasks.length}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                  Zero spoilage verified
                </span>
              </div>
            </div>

            {/* Card 4: Assignments Requiring Attention */}
            <div className={`rounded-3xl p-5 border shadow-xs flex items-center space-x-3.5 transition ${
              attentionTasks.length > 0
                ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                : 'bg-white/90 border-slate-200/90 text-slate-800'
            }`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                attentionTasks.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block leading-tight">
                  Requires Attention
                </span>
                <span className="text-2xl font-black font-mono tracking-tight leading-none mt-1 block">
                  {attentionTasks.length}
                </span>
                <span className="text-[10px] font-semibold mt-1 block">
                  {attentionTasks.length > 0 ? 'Reroute or delay report active' : 'All assignments clear'}
                </span>
              </div>
            </div>

          </div>

          {/* 2. ACTIVE DELIVERY STEP-BY-STEP WORKFLOW PANEL */}
          {activeDeliveryTask && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border-2 border-emerald-600/30 shadow-md space-y-6">
              
              {/* Active Delivery Header */}
              {(() => {
                const { donation, targetShelter, originalShelter, distKm, etaMin, remMin } = getTaskContext(activeDeliveryTask);
                const isRerouted = activeDeliveryTask.isRerouted;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-emerald-600 text-white text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E5F940] animate-pulse" />
                            <span>Active Haul in Progress</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            Task #{activeDeliveryTask.id.slice(-6)}
                          </span>
                          {isRerouted && (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                              Rerouted Mid-Transit
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                          {activeDeliveryTask.quantity} {donation?.unit || 'units'} of {donation?.itemTitle || 'Aid Cargo'}
                        </h3>
                      </div>

                      {/* Expiry / Shelf Life Timer Badge */}
                      <div className={`px-4 py-2 rounded-2xl border text-xs flex items-center space-x-2.5 font-bold ${
                        remMin <= 20
                          ? 'bg-red-50 text-red-950 border-red-300 animate-pulse'
                          : remMin <= 45
                          ? 'bg-amber-50 text-amber-950 border-amber-300'
                          : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      }`}>
                        <Timer className="w-4 h-4 text-current" />
                        <div>
                          <span className="text-[10px] block opacity-75 uppercase">Safe-Use Window</span>
                          <span className="font-mono text-sm font-black">{remMin} mins remaining</span>
                        </div>
                      </div>
                    </div>

                    {/* Mid-Transit Reroute Banner (If rerouted) */}
                    {isRerouted && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-950 text-xs space-y-1 animate-in fade-in">
                        <div className="flex items-center space-x-2 font-bold">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>DESTINATION CHANGED: Original Shelter Closed / Saturated Mid-Transit</span>
                        </div>
                        <p className="text-[11.5px] text-rose-900 pl-6">
                          Coordinator rerouted this cargo from <strong>{originalShelter?.name}</strong> to <strong>{targetShelter?.name}</strong>. Reason: <em>"{activeDeliveryTask.rerouteReason || 'Destination closed'}"</em>. Proceed to new shelter address below.
                        </p>
                      </div>
                    )}

                    {/* Step-by-Step Progress Pipeline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Delivery Milestone Pipeline</span>
                        <span className="text-slate-800 font-mono">
                          Current Stage: <strong>{activeDeliveryTask.status.replace('_', ' ')}</strong>
                        </span>
                      </div>

                      {/* Visual Stepper */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        
                        {/* Step 1: Accepted */}
                        <div className={`p-3 rounded-2xl border text-center transition ${
                          ['ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DELIVERED'].includes(activeDeliveryTask.status)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <div className="text-[10px] font-black uppercase tracking-wider">Step 1</div>
                          <div className="text-xs font-bold mt-0.5 flex items-center justify-center space-x-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Accepted</span>
                          </div>
                        </div>

                        {/* Step 2: Arrived at Pickup */}
                        <div className={`p-3 rounded-2xl border text-center transition ${
                          ['ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DELIVERED'].includes(activeDeliveryTask.status)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <div className="text-[10px] font-black uppercase tracking-wider">Step 2</div>
                          <div className="text-xs font-bold mt-0.5 flex items-center justify-center space-x-1">
                            {['ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DELIVERED'].includes(activeDeliveryTask.status) && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>Arrived Pickup</span>
                          </div>
                        </div>

                        {/* Step 3: In Transit */}
                        <div className={`p-3 rounded-2xl border text-center transition ${
                          ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DELIVERED'].includes(activeDeliveryTask.status)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <div className="text-[10px] font-black uppercase tracking-wider">Step 3</div>
                          <div className="text-xs font-bold mt-0.5 flex items-center justify-center space-x-1">
                            {['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DELIVERED'].includes(activeDeliveryTask.status) && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>In Transit</span>
                          </div>
                        </div>

                        {/* Step 4: Delivered Handover */}
                        <div className={`p-3 rounded-2xl border text-center transition ${
                          activeDeliveryTask.status === 'DELIVERED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : activeDeliveryTask.status === 'ARRIVED_DESTINATION'
                            ? 'bg-amber-50 border-amber-300 text-amber-950 animate-pulse'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <div className="text-[10px] font-black uppercase tracking-wider">Step 4</div>
                          <div className="text-xs font-bold mt-0.5 flex items-center justify-center space-x-1">
                            {activeDeliveryTask.status === 'DELIVERED' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>Proof & Signoff</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Routing Cards: Pickup and Destination */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Pickup Hub Details */}
                      <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Pickup Location (Donor)</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-bold">
                            {donation?.donorName}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm">
                          {donation?.pickupLocation}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-slate-500">Contact: <strong>{donation?.donorPhone}</strong></span>
                          <a
                            href={`tel:${donation?.donorPhone}`}
                            className="bg-white px-3 py-1 rounded-xl text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-50 transition flex items-center space-x-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Call Donor</span>
                          </a>
                        </div>
                      </div>

                      {/* Destination Shelter Details */}
                      <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Delivery Destination</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-bold">
                            {targetShelter?.name}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm">
                          {targetShelter?.locationName}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-slate-500">
                            Receiver: <strong>{targetShelter?.contactPerson}</strong> ({targetShelter?.contactPhone})
                          </span>
                          <a
                            href={`tel:${targetShelter?.contactPhone}`}
                            className="bg-white px-3 py-1 rounded-xl text-amber-800 border border-amber-300 font-bold hover:bg-amber-50 transition flex items-center space-x-1"
                          >
                            <Phone className="w-3 h-3 text-amber-600" />
                            <span>Call Shelter</span>
                          </a>
                        </div>
                      </div>

                    </div>

                    {/* Handling Instructions & Cargo Storage Requirements */}
                    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-xs space-y-2 text-amber-950">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-1.5">
                          <Thermometer className="w-4 h-4 text-amber-700" />
                          <span>Handling & Cargo Preservation Protocol</span>
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {donation?.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-medium leading-relaxed">
                        Storage: <strong>{donation?.storageRequirement || 'Maintain upright; keep insulated.'}</strong>
                        {donation?.specialInstructions && ` Note: ${donation.specialInstructions}`}
                      </p>
                      
                      {/* Clearly Labeled Route & Transit Time (NO FAKE GPS) */}
                      <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-amber-900 gap-1 font-semibold">
                        <span>
                          Calculated Route: ~{distKm} km via urban corridor (Est. {etaMin} mins transit).
                        </span>
                        <span className="text-[10px] opacity-75 font-mono">
                          Live telemetry synced with coordinator console
                        </span>
                      </div>
                    </div>

                    {/* Report Delay Banner if delay already reported */}
                    {activeDeliveryTask.delayReport && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-950 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Delay Reported: <strong>{activeDeliveryTask.delayReport.reason}</strong> (+{activeDeliveryTask.delayReport.estimatedDelayMinutes} mins). Coordinator alerted.
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-rose-700">
                          {new Date(activeDeliveryTask.delayReport.reportedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}

                    {/* ACTION BUTTONS (MOBILE-FIRST LARGE TOUCH TARGETS) */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      
                      {/* Workflow Button 1: Accept Assignment (if Claimed) */}
                      {activeDeliveryTask.status === 'CLAIMED' && (
                        <>
                          <button
                            onClick={() => handleAccept(activeDeliveryTask.id)}
                            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center space-x-2"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>ACCEPT ASSIGNMENT</span>
                          </button>
                          
                          <button
                            onClick={() => setShowDeclineModal(activeDeliveryTask.id)}
                            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-sm transition flex items-center justify-center space-x-2"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline Assignment</span>
                          </button>
                        </>
                      )}

                      {/* Workflow Button 2: Arrived at Pickup */}
                      {activeDeliveryTask.status === 'ACCEPTED' && (
                        <>
                          <button
                            onClick={() => handleArrivePickup(activeDeliveryTask.id)}
                            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center space-x-2"
                          >
                            <MapPin className="w-5 h-5 text-[#E5F940]" />
                            <span>CONFIRM ARRIVAL AT DONOR PICKUP</span>
                          </button>

                          <button
                            onClick={() => setShowDelayModal(activeDeliveryTask.id)}
                            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Report Traffic / Delay</span>
                          </button>
                        </>
                      )}

                      {/* Workflow Button 3: Confirm Cargo Handover & In Transit */}
                      {activeDeliveryTask.status === 'ARRIVED_PICKUP' && (
                        <>
                          <button
                            onClick={() => handleConfirmCargoPickup(activeDeliveryTask.id)}
                            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center space-x-2"
                          >
                            <Package className="w-5 h-5" />
                            <span>CONFIRM CARGO HANDOVER & START TRANSIT</span>
                          </button>

                          <button
                            onClick={() => setShowDelayModal(activeDeliveryTask.id)}
                            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Report Pickup Issue</span>
                          </button>
                        </>
                      )}

                      {/* Workflow Button 4: Confirm Arrival at Destination Shelter */}
                      {['IN_TRANSIT', 'DIVERTED', 'PICKED_UP'].includes(activeDeliveryTask.status) && (
                        <>
                          <button
                            onClick={() => handleArriveDestination(activeDeliveryTask.id)}
                            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-purple-700 text-white hover:bg-purple-800 font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center space-x-2"
                          >
                            <Navigation className="w-5 h-5" />
                            <span>CONFIRM ARRIVAL AT DESTINATION SHELTER</span>
                          </button>

                          <button
                            onClick={() => setShowDelayModal(activeDeliveryTask.id)}
                            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Report Transit Delay</span>
                          </button>
                        </>
                      )}

                      {/* Workflow Button 5: Complete Delivery & Submit Proof */}
                      {activeDeliveryTask.status === 'ARRIVED_DESTINATION' && (
                        <button
                          onClick={() => {
                            setShowProofModal(activeDeliveryTask.id);
                            setProofRecipientName(targetShelter?.contactPerson || '');
                          }}
                          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-base tracking-wide transition shadow-md flex items-center justify-center space-x-2.5 animate-pulse"
                        >
                          <CheckCircle2 className="w-6 h-6" />
                          <span>SUBMIT PROOF & COMPLETE DELIVERY HANDOVER</span>
                        </button>
                      )}

                    </div>
                  </>
                );
              })()}

            </div>
          )}

          {/* 3. NEW ASSIGNMENT OFFERS (Awaiting Acceptance) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Dispatched Assignments Awaiting Response
                </h3>
                <p className="text-xs text-slate-500">
                  Tasks reserved for your courier profile. Review cargo requirements and accept within reservation deadline.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                {pendingAssignments.length} Reserved Offers
              </span>
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/90 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-75" />
                <h4 className="text-sm font-bold text-slate-800">No Pending Assignment Offers</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You are all caught up! Keep your duty status set to <strong>ON DUTY</strong> to receive instant dispatch dispatches from the Relief Coordinator.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingAssignments.map((task) => {
                  const { donation, targetShelter, distKm, etaMin, remMin } = getTaskContext(task);

                  return (
                    <div 
                      key={task.id}
                      className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 border border-amber-200 shadow-xs space-y-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              New Offer
                            </span>
                            <span className="text-xs font-mono text-slate-500 font-bold">
                              #{task.id.slice(-6)}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 mt-1">
                            {task.quantity} {donation?.unit || 'units'} of {donation?.itemTitle}
                          </h4>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Deadline</span>
                          <span className="font-mono text-xs font-black text-rose-600">
                            {remMin}m safe shelf life
                          </span>
                        </div>
                      </div>

                      {/* Route specs */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Pickup Hub</span>
                          <span className="font-bold text-slate-800 line-clamp-1">{donation?.pickupLocation}</span>
                          <span className="text-[10px] text-slate-500">{donation?.donorName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Destination</span>
                          <span className="font-bold text-slate-800 line-clamp-1">{targetShelter?.name}</span>
                          <span className="text-[10px] text-slate-500">~{distKm} km ({etaMin}m transit)</span>
                        </div>
                      </div>

                      {/* Handling spec */}
                      <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
                        Handling: <strong>{donation?.storageRequirement || 'Maintain standard container seal.'}</strong>
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleAccept(task.id)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] font-black text-xs transition flex items-center justify-center space-x-1.5 shadow-2xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept Assignment</span>
                        </button>

                        <button
                          onClick={() => setShowDeclineModal(task.id)}
                          className="py-2.5 px-3 rounded-xl bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. COMPLETED DELIVERY HISTORY */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Your Verified Delivery History
                </h3>
                <p className="text-xs text-slate-500">
                  Completed aid handovers with receiver verification and zero recorded spoilage.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {completedTasks.length} Completed
              </span>
            </div>

            {completedTasks.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/90 text-center text-xs text-slate-500">
                No completed deliveries recorded yet for this courier profile.
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Task ID</th>
                        <th className="py-3 px-4">Cargo & Quantity</th>
                        <th className="py-3 px-4">Pickup Origin</th>
                        <th className="py-3 px-4">Shelter Destination</th>
                        <th className="py-3 px-4">Handover Time</th>
                        <th className="py-3 px-4">Receiver Signoff</th>
                        <th className="py-3 px-4">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedTasks.map((task) => {
                        const { donation, targetShelter } = getTaskContext(task);

                        return (
                          <tr key={task.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              #{task.id.slice(-6)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {task.quantity} units ({donation?.itemTitle || 'Aid Cargo'})
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {donation?.donorName || 'Donor Site'}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {targetShelter?.name || 'Shelter'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              {task.deliveredAt ? new Date(task.deliveredAt).toLocaleTimeString() : 'Delivered'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-emerald-900">
                              ✓ {task.proofRecipientName || targetShelter?.contactPerson || 'Authorized Staff'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                <span>Zero Spoilage</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* MODE 2: FLEET WATCHDOG & COORDINATOR MONITOR         */}
      {/* ==================================================== */}
      {viewMode === 'FLEET_WATCHDOG' && (
        <div className="space-y-6">

          {/* Watchdog Header */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Coordinator Radar
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">Ghost Stall Watchdog & Fleet Availability</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Volunteer Two-Wheeler Fleet Registry
              </h2>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Dead-man auto-reclaim watchdog: <strong>30s</strong> (accelerated)</span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search volunteers by name, corridor, vehicle..."
                value={fleetSearchQuery}
                onChange={(e) => setFleetSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'Central', 'North', 'West'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => setFleetZoneFilter(zone)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                    fleetZoneFilter === zone
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {zone === 'ALL' ? 'All Corridors' : `${zone} Corridor`}
                </button>
              ))}
            </div>
          </div>

          {/* Volunteer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {volunteers
              .filter((rider) => {
                if (fleetZoneFilter !== 'ALL' && !rider.zone.includes(fleetZoneFilter)) return false;
                if (fleetSearchQuery.trim() !== '') {
                  const q = fleetSearchQuery.toLowerCase();
                  return rider.name.toLowerCase().includes(q) || rider.zone.toLowerCase().includes(q);
                }
                return true;
              })
              .map((rider) => {
                const isGhost = rider.responsiveness === 'UNRESPONSIVE';
                const activeTask = tasks.find((t) => t.id === rider.activeTaskId);

                return (
                  <div
                    key={rider.id}
                    className={`rounded-3xl p-6 border transition-all duration-300 relative flex flex-col justify-between ${
                      isGhost 
                        ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400 shadow-sm' 
                        : rider.id === currentRider.id
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500 shadow-sm'
                        : 'bg-white/90 border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top status bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            rider.status === 'AVAILABLE'
                              ? 'bg-emerald-500'
                              : rider.status === 'IN_TRANSIT'
                              ? 'bg-purple-500 animate-pulse'
                              : rider.status === 'RESERVED'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`} />
                          <span className="text-xs font-bold text-slate-700">
                            {rider.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Ghost / Responsiveness Badge */}
                        {isGhost ? (
                          <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Ghost Stall</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Heartbeat Active
                          </span>
                        )}
                      </div>

                      {/* Courier Profile Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {rider.name}
                          </h3>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                            <Bike className="w-3.5 h-3.5 text-slate-400" />
                            <span>{rider.vehicleType}</span>
                            <span>•</span>
                            <span>Max: <strong>{rider.carryCapacity} units</strong></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700">
                            {Math.round(rider.reliabilityScore * 100)}%
                          </span>
                          <span className="text-[10px] block text-slate-400">Score</span>
                        </div>
                      </div>

                      {/* Location & Zone */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rider.zone}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{rider.phone}</span>
                        </span>
                      </div>

                      {/* Active Task Info if any */}
                      {activeTask && (
                        <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>Active Task #{activeTask.id.slice(-6)}</span>
                            <span className="font-mono text-emerald-700">{activeTask.quantity} meals</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Status: <strong className="text-slate-800">{activeTask.status}</strong>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentRiderId(rider.id);
                          setViewMode('RIDER_APP');
                          showBanner('INFO', `Switched active courier workspace to ${rider.name}`);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition text-center"
                      >
                        Act as this Rider
                      </button>

                      {/* Ghost simulation button for testing */}
                      {!isGhost && rider.status === 'RESERVED' && (
                        <button
                          onClick={() => simulateGhostRider(rider.id)}
                          title="Simulate unresponsive rider to test dead-man auto-reclaim"
                          className="p-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition text-xs font-bold"
                        >
                          Simulate Ghost
                        </button>
                      )}

                      {isGhost && activeTask && (
                        <button
                          onClick={() => reclaimGhostTask(activeTask.id, true)}
                          className="py-2 px-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold text-xs transition flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Auto-Reclaim</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: DECLINE ASSIGNMENT REASON MODAL             */}
      {/* ==================================================== */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Decline Aid Assignment</h3>
            </div>
            
            <p className="text-xs text-slate-600">
              Declining this assignment releases the reserved meals back into the Relief Coordinator's urgent dispatch queue for immediate reassignment to another courier.
            </p>

            <div className="space-y-1.5 text-xs font-bold text-slate-700">
              <label>Reason for declining:</label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-xs bg-slate-50"
              >
                <option value="Vehicle issue / mechanical trouble">Vehicle issue / mechanical breakdown</option>
                <option value="Excessive traffic / impassable route">Excessive traffic / impassable corridor</option>
                <option value="Emergency personal obligation">Personal emergency / unavailable</option>
                <option value="Exceeds comfortable load capacity">Exceeds comfortable carrying capacity</option>
                <option value="Other impediment">Other operational impediment</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDeclineModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineSubmit}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                Confirm Decline & Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: REPORT DELAY OR PROBLEM MODAL               */}
      {/* ==================================================== */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Report Route Delay or Incident</h3>
            </div>
            
            <p className="text-xs text-slate-600">
              Live updates help the coordinator verify safe arrival deadlines and recalculate backup rerouting if spoilage thresholds are threatened.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Incident Category:</label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value as DelayReport['reason'])}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-slate-50 font-medium"
                >
                  <option value="TRAFFIC">Traffic Congestion / Road Blockage</option>
                  <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown / Puncture</option>
                  <option value="PICKUP_UNAVAILABLE">Donor Unreachable / Pickup Failure</option>
                  <option value="DESTINATION_UNAVAILABLE">Shelter Gate Closed / Inaccessible</option>
                  <option value="BAD_WEATHER">Adverse Weather / Waterlogging</option>
                  <option value="OTHER">Other Operational Delay</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Estimated Additional Delay:</label>
                <div className="flex items-center space-x-2">
                  {[10, 15, 25, 40].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDelayMinutes(mins)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                        delayMinutes === mins
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Field Notes / Details:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Signal jammed near flyover; moving slowly..."
                  value={delayNotes}
                  onChange={(e) => setDelayNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDelayModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelaySubmit}
                className="px-5 py-2 rounded-xl text-xs font-black bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              >
                Broadcast Incident Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: DELIVERY PROOF & HANDOVER COMPLETION MODAL */}
      {/* ==================================================== */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-emerald-600">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Submit Delivery Proof & Handover</h3>
            </div>
            
            <p className="text-xs text-slate-600">
              Confirm that all cargo has been safely handed over to the authorized shelter representative without spoilage.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Recipient / Shelter Representative Name <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar (Camp Supervisor)"
                  value={proofRecipientName}
                  onChange={(e) => setProofRecipientName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Handover Notes / Inspection:</label>
                <input
                  type="text"
                  placeholder="e.g. All 40 meals intact, hot containers verified."
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Proof Photo (Optional):</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setProofPhotoPreview('/sanjeevani-logo.jpg')}
                    className="flex-1 py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600 font-bold flex items-center justify-center space-x-1.5 transition text-xs"
                  >
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>{proofPhotoPreview ? 'Photo Captured ✓' : 'Simulate Camera Photo'}</span>
                  </button>
                  {proofPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => setProofPhotoPreview(null)}
                      className="text-xs text-rose-600 font-bold px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowProofModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteDeliverySubmit}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Verify & Complete Handover</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
