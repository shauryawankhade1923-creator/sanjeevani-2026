import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Droplet, 
  Flame, 
  Snowflake, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers,
  MapPin,
  Phone,
  Search,
  ArrowRight,
  ShieldAlert,
  Building2,
  Clock,
  Settings,
  PackageCheck,
  Truck,
  Check,
  Camera,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus
} from 'lucide-react';
import { findRerouteAlternatives, getRemainingShelfLifeMinutes } from '../utils/engine';
import { Shelter, AidCategory, DeliveryTask } from '../types';

export const SheltersView: React.FC = () => {
  const { 
    shelters, 
    tasks, 
    volunteers, 
    donations, 
    currentShelterId,
    setCurrentShelterId,
    updateShelterSettings,
    reportShelterStatusChange,
    confirmShelterDeliveryReceipt,
    pendingRerouteTask,
    rerouteTask,
    dismissPendingReroute 
  } = useApp();

  // Mode: 'SHELTER_APP' (Dedicated console for active recipient organization) vs 'ALL_SHELTERS' (Macro overview)
  const [viewMode, setViewMode] = useState<'SHELTER_APP' | 'ALL_SHELTERS'>('SHELTER_APP');

  // Currently selected active shelter
  const currentShelter = shelters.find((s) => s.id === currentShelterId) || shelters[0];

  // UI state for notifications & banners
  const [actionNotice, setActionNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);

  // Status Change Modals
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureReason, setClosureReason] = useState('Scheduled structural maintenance & sanitization');

  // Delivery Confirmation & Discrepancy Modal
  const [confirmingTask, setConfirmingTask] = useState<DeliveryTask | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState<number>(0);
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>(currentShelter.contactPerson || '');
  const [proofNotes, setProofNotes] = useState<string>('');
  const [proofPhotoPreview, setProofPhotoPreview] = useState<string | null>(null);

  // Settings State for Active Shelter
  const [editMaxCapacity, setEditMaxCapacity] = useState<number>(currentShelter.maxCapacity);
  const [editOperatingHours, setEditOperatingHours] = useState<string>(currentShelter.operatingHours || '07:00 - 22:00 (Daily)');
  const [editCleanWater, setEditCleanWater] = useState<boolean>(currentShelter.hasCleanWater);
  const [editCookingFuel, setEditCookingFuel] = useState<boolean>(currentShelter.hasCookingFuel);
  const [editRefrigeration, setEditRefrigeration] = useState<boolean>(currentShelter.hasRefrigeration);
  const [editCategories, setEditCategories] = useState<AidCategory[]>(currentShelter.acceptsCategories);
  const [editRestrictions, setEditRestrictions] = useState<string>(currentShelter.specialRestrictions || '');

  // Keep settings form synced when switching active shelter
  const handleSelectShelter = (id: string) => {
    setCurrentShelterId(id);
    const s = shelters.find(sh => sh.id === id);
    if (s) {
      setEditMaxCapacity(s.maxCapacity);
      setEditOperatingHours(s.operatingHours || '07:00 - 22:00 (Daily)');
      setEditCleanWater(s.hasCleanWater);
      setEditCookingFuel(s.hasCookingFuel);
      setEditRefrigeration(s.hasRefrigeration);
      setEditCategories(s.acceptsCategories);
      setEditRestrictions(s.specialRestrictions || '');
      setRecipientName(s.contactPerson);
    }
  };

  const showBanner = (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Capacity metrics
  const remainingCapacity = Math.max(0, currentShelter.maxCapacity - (currentShelter.currentOccupancy + currentShelter.committedCapacity));
  const occupancyPercent = Math.min(100, Math.round(((currentShelter.currentOccupancy + currentShelter.committedCapacity) / currentShelter.maxCapacity) * 100));

  // Incoming tasks heading to this shelter (Claimed, Accepted, In Transit, Arrived)
  const incomingTasks = tasks.filter(
    (t) => t.targetShelterId === currentShelter.id && ['CLAIMED', 'ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'DIVERTED'].includes(t.status)
  );
  const totalIncomingUnits = incomingTasks.reduce((acc, t) => acc + t.quantity, 0);

  // Deliveries awaiting confirmation (Courier arrived or in transit ready for intake)
  const awaitingConfirmationTasks = incomingTasks.filter((t) => t.status === 'ARRIVED_DESTINATION' || t.status === 'IN_TRANSIT');

  // Completed received inventory at this shelter
  const completedDeliveries = tasks.filter(
    (t) => t.targetShelterId === currentShelter.id && t.status === 'DELIVERED'
  );
  const totalReceivedUnits = completedDeliveries.reduce((acc, t) => acc + (t.actualQuantityReceived ?? t.quantity), 0);

  // Emergency reroute alternatives if pending conflict exists
  let rerouteAlternatives: any[] = [];
  if (pendingRerouteTask) {
    const rider = volunteers.find(v => v.id === pendingRerouteTask.riderId);
    const donation = donations.find(d => d.id === pendingRerouteTask.donationId);
    if (rider && donation) {
      rerouteAlternatives = findRerouteAlternatives(pendingRerouteTask, rider, donation, shelters);
    }
  }

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------
  const handleSaveSettings = () => {
    const result = updateShelterSettings(currentShelter.id, {
      maxCapacity: Number(editMaxCapacity),
      operatingHours: editOperatingHours,
      hasCleanWater: editCleanWater,
      hasCookingFuel: editCookingFuel,
      hasRefrigeration: editRefrigeration,
      acceptsCategories: editCategories,
      specialRestrictions: editRestrictions
    });

    if (result.success) {
      showBanner('SUCCESS', 'Shelter facility specifications & safety criteria updated and synced.');
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleToggleCategory = (cat: AidCategory) => {
    setEditCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleReportClosure = () => {
    const result = reportShelterStatusChange(currentShelter.id, 'CLOSED', closureReason);
    setShowClosureModal(false);
    if (result.success) {
      showBanner('INFO', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleReportFullCapacity = () => {
    const result = reportShelterStatusChange(currentShelter.id, 'CAPACITY_REACHED', 'Intake capacity full (100% occupied).');
    if (result.success) {
      showBanner('INFO', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const handleResumeAccepting = () => {
    const result = reportShelterStatusChange(currentShelter.id, 'ACCEPTING');
    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  const openConfirmationModal = (task: DeliveryTask) => {
    setConfirmingTask(task);
    setReceivedQuantity(task.quantity);
    setDiscrepancyReason('');
    setProofNotes('');
    setProofPhotoPreview(null);
  };

  const handleConfirmReceiptSubmit = () => {
    if (!confirmingTask) return;
    if (!recipientName.trim()) {
      showBanner('ERROR', 'Supervisor or authorized receiver name is required.');
      return;
    }

    const result = confirmShelterDeliveryReceipt(confirmingTask.id, {
      receivedQuantity: Number(receivedQuantity),
      discrepancyReason: discrepancyReason || undefined,
      recipientName: recipientName.trim(),
      notes: proofNotes || undefined,
      photoUrl: proofPhotoPreview || undefined
    });

    setConfirmingTask(null);
    if (result.success) {
      showBanner('SUCCESS', result.message);
    } else {
      showBanner('ERROR', result.message);
    }
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-16">
      
      {/* Action Notification Banner */}
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
            {actionNotice.type === 'INFO' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>
      )}

      {/* Emergency Mid-Transit Interception Banner (If shelter closed while rider en route) */}
      {pendingRerouteTask && (
        <div className="bg-red-600 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-red-700 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Emergency Mid-Transit Interception
                </span>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  Task #{pendingRerouteTask.id.slice(-6)} ({pendingRerouteTask.quantity} Meals) In Peril!
                </h3>
                <p className="text-xs text-red-100 mt-0.5">
                  Target destination reported <strong>CLOSED / FULL</strong> while cargo is in transit. System identified eligible alternatives.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rerouteAlternatives.length > 0 && rerouteAlternatives[0].isEligible && (
                <button
                  onClick={() => {
                    const alt = rerouteAlternatives[0];
                    rerouteTask(pendingRerouteTask.id, alt.shelterId, 'Automatic dynamic reroute via shelter dashboard');
                    dismissPendingReroute();
                    showBanner('SUCCESS', `Successfully rerouted payload to ${alt.shelterName}!`);
                  }}
                  className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 text-xs font-black rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  <span>Reroute to {rerouteAlternatives[0].shelterName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={dismissPendingReroute}
                className="px-3 py-2 text-xs font-bold text-red-200 hover:text-white"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER: Active Recipient Organization Profile & Operating Status */}
      <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        
        {/* Left: Organization Profile */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0C382E] text-[#E5F940] flex items-center justify-center font-black text-xl shadow-xs border border-emerald-900/30 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Recipient Organization
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500 font-mono font-bold">
                ID: {currentShelter.id}
              </span>
            </div>

            <div className="flex items-center space-x-3 mt-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentShelter.name}
              </h2>

              {/* Status Badge */}
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                currentShelter.status === 'ACCEPTING'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentShelter.status === 'CAPACITY_REACHED'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                ● {currentShelter.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 mt-0.5">
              <span>{currentShelter.locationName}</span>
              <span>•</span>
              <span>Supervisor: <strong>{currentShelter.contactPerson}</strong> ({currentShelter.contactPhone})</span>
              <span>•</span>
              <span>Hours: {currentShelter.operatingHours || '07:00 - 22:00'}</span>
            </p>
          </div>
        </div>

        {/* Right: Organization Switcher & Quick Status Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Switch Organization Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100/90 rounded-2xl p-1 border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <select
              value={currentShelter.id}
              onChange={(e) => handleSelectShelter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 py-1.5 pr-2 outline-none cursor-pointer"
            >
              {shelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Operating Status Actions */}
          {currentShelter.status === 'ACCEPTING' ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setShowClosureModal(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition shadow-2xs"
              >
                Report Temporary Closure
              </button>

              <button
                onClick={handleReportFullCapacity}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-amber-800 hover:bg-amber-50 border border-amber-300 transition shadow-2xs"
              >
                Declare Capacity Full
              </button>
            </div>
          ) : (
            <button
              onClick={handleResumeAccepting}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Resume Accepting Aid</span>
            </button>
          )}

          {/* Mode Switch: Personal Workspace vs All Facilities */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('SHELTER_APP')}
              className={`px-3 py-1.5 rounded-xl transition ${
                viewMode === 'SHELTER_APP' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shelter Console
            </button>
            <button
              onClick={() => setViewMode('ALL_SHELTERS')}
              className={`px-3 py-1.5 rounded-xl transition ${
                viewMode === 'ALL_SHELTERS' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Shelters
            </button>
          </div>

        </div>

      </div>

      {/* ==================================================== */}
      {/* MODE 1: DEDICATED RECIPIENT ORGANIZATION DASHBOARD   */}
      {/* ==================================================== */}
      {viewMode === 'SHELTER_APP' && (
        <div className="space-y-6">

          {/* 1. SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            
            {/* Card 1: Remaining Receiving Capacity */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                <Home className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Available Intake Space
                </span>
                <span className="text-2xl font-black text-emerald-950 font-mono tracking-tight leading-none mt-1 block">
                  {remainingCapacity} <span className="text-xs font-semibold text-slate-500 font-sans">/ {currentShelter.maxCapacity}</span>
                </span>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${occupancyPercent >= 90 ? 'bg-red-500' : 'bg-emerald-600'}`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Incoming Deliveries */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Incoming Shipments
                </span>
                <span className="text-2xl font-black text-purple-950 font-mono tracking-tight leading-none mt-1 block">
                  {incomingTasks.length}
                </span>
                <span className="text-[10px] text-purple-700 font-semibold mt-1 block">
                  {totalIncomingUnits} meals committed en route
                </span>
              </div>
            </div>

            {/* Card 3: Received Aid Units */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Total Aid Received
                </span>
                <span className="text-2xl font-black text-sky-950 font-mono tracking-tight leading-none mt-1 block">
                  {totalReceivedUnits}
                </span>
                <span className="text-[10px] text-sky-700 font-semibold mt-1 block">
                  Across {completedDeliveries.length} verified handovers
                </span>
              </div>
            </div>

            {/* Card 4: Deliveries Requiring Confirmation */}
            <div className={`rounded-3xl p-5 border shadow-xs flex items-center space-x-3.5 transition ${
              awaitingConfirmationTasks.length > 0
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-white/90 border-slate-200/90 text-slate-800'
            }`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                awaitingConfirmationTasks.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block leading-tight">
                  Needs Signoff
                </span>
                <span className="text-2xl font-black font-mono tracking-tight leading-none mt-1 block">
                  {awaitingConfirmationTasks.length}
                </span>
                <span className="text-[10px] font-semibold mt-1 block">
                  {awaitingConfirmationTasks.length > 0 ? 'Couriers arrived at shelter' : 'No pending handovers'}
                </span>
              </div>
            </div>

          </div>

          {/* 2. INCOMING DELIVERIES TRACKER */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Incoming Aid Deliveries</span>
                  <span className="bg-purple-100 text-purple-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {incomingTasks.length} En Route
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time dispatches currently traveling to your location. Never counted as inventory until handover confirmation.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                Committed Capacity: {currentShelter.committedCapacity} Units
              </span>
            </div>

            {incomingTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No shipments currently in transit to this facility.</p>
                <p>New deliveries will appear here as soon as the Relief Coordinator authorizes a dispatch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingTasks.map((task) => {
                  const donation = donations.find((d) => d.id === task.donationId);
                  const rider = volunteers.find((v) => v.id === task.riderId);
                  const remMin = donation ? getRemainingShelfLifeMinutes(donation.expiresAt) : 0;

                  return (
                    <div 
                      key={task.id}
                      className={`rounded-2xl p-4 border transition space-y-3 ${
                        task.status === 'ARRIVED_DESTINATION'
                          ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              task.status === 'ARRIVED_DESTINATION'
                                ? 'bg-amber-500 text-slate-950 animate-pulse'
                                : 'bg-purple-100 text-purple-900'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-500">
                              #{task.id.slice(-6)}
                            </span>
                          </div>

                          <h4 className="text-base font-black text-slate-900 mt-1">
                            {task.quantity} units of {donation?.itemTitle || 'Aid Shipment'}
                          </h4>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Expiry Margin</span>
                          <span className={`font-mono text-xs font-black ${remMin <= 30 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {remMin} mins safe
                          </span>
                        </div>
                      </div>

                      {/* Cargo Handling & Specs */}
                      <div className="text-[11.5px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Donor: <strong>{donation?.donorName}</strong></span>
                          <span>Courier: <strong>{rider?.name}</strong> ({rider?.vehicleType})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic">
                          Handling: {donation?.storageRequirement || 'Maintain standard container seal.'}
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2 text-xs">
                          <a
                            href={`tel:${rider?.phone}`}
                            className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition flex items-center space-x-1"
                          >
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>Call Courier</span>
                          </a>
                        </div>

                        <button
                          onClick={() => openConfirmationModal(task)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black transition flex items-center space-x-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Handover Receipt</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. CURRENT INVENTORY / RECEIVED AID TABLE */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Current Shelter Inventory & Verified Receipts
                </h3>
                <p className="text-xs text-slate-500">
                  Food and medical batches safely received, verified for zero spoilage, and ready for camp distribution.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {totalReceivedUnits} Total Units Stored / Consumed
              </span>
            </div>

            {completedDeliveries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <PackageCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No completed deliveries on file yet.</p>
                <p>When couriers hand over cargo, receipts and discrepancy reports will be recorded here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Receipt ID</th>
                      <th className="py-3 px-4">Aid Cargo</th>
                      <th className="py-3 px-4">Qty (Actual / Expected)</th>
                      <th className="py-3 px-4">Intake Timestamp</th>
                      <th className="py-3 px-4">Safe Use Deadline</th>
                      <th className="py-3 px-4">Verified Signoff</th>
                      <th className="py-3 px-4">Quality & Discrepancy Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedDeliveries.map((task) => {
                      const donation = donations.find((d) => d.id === task.donationId);
                      const actual = task.actualQuantityReceived ?? task.quantity;
                      const hasDiscrepancy = actual !== task.quantity;

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            #{task.id.slice(-6)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {donation?.itemTitle || 'Aid Shipment'}
                            <span className="text-[10px] text-slate-400 block font-normal">From {donation?.donorName}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className="text-emerald-900">{actual} units</span>
                            {hasDiscrepancy && (
                              <span className="text-rose-600 text-[10px] block">
                                (Expected {task.quantity})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {task.deliveredAt ? new Date(task.deliveredAt).toLocaleTimeString() : 'Verified'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {donation ? new Date(donation.expiresAt).toLocaleTimeString() : 'Safe'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {task.proofRecipientName || currentShelter.contactPerson}
                          </td>
                          <td className="py-3.5 px-4">
                            {hasDiscrepancy ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>Discrepancy: {task.discrepancyReason || 'Shortage logged'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Zero Spoilage Verified</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. ORGANIZATION SETTINGS & FACILITY INFRASTRUCTURE */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <span>Facility Infrastructure & Intake Criteria</span>
                </h3>
                <p className="text-xs text-slate-500">
                  The dispatch engine automatically verifies these capabilities before routing raw rations, formula, or cold pharmaceuticals.
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-[#0C382E] text-[#E5F940] hover:bg-[#07241D] text-xs font-black rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Facility Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Col 1: Capacity & Hours */}
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Maximum Receiving Capacity (Meals/Units):</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={editMaxCapacity}
                    onChange={(e) => setEditMaxCapacity(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                  <span className="text-[10px] text-slate-400">Current Occupancy: {currentShelter.currentOccupancy} units</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Receiving & Operating Hours:</label>
                  <input
                    type="text"
                    value={editOperatingHours}
                    onChange={(e) => setEditOperatingHours(e.target.value)}
                    placeholder="e.g. 07:00 - 22:00 or 24/7"
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                </div>
              </div>

              {/* Col 2: Infrastructure Capabilities Toggles */}
              <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
                  Verified Infrastructure Toggles
                </span>

                {/* Clean Water Toggle */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 cursor-pointer">
                  <span className="flex items-center space-x-2 font-bold text-slate-800">
                    <Droplet className={`w-4 h-4 ${editCleanWater ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>Clean Potable Water Verified</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editCleanWater}
                    onChange={(e) => setEditCleanWater(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>

                {/* Cooking Fuel Toggle */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 cursor-pointer">
                  <span className="flex items-center space-x-2 font-bold text-slate-800">
                    <Flame className={`w-4 h-4 ${editCookingFuel ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>Active Kitchen / Cooking Fuel</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editCookingFuel}
                    onChange={(e) => setEditCookingFuel(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>

                {/* Refrigeration Toggle */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 cursor-pointer">
                  <span className="flex items-center space-x-2 font-bold text-slate-800">
                    <Snowflake className={`w-4 h-4 ${editRefrigeration ? 'text-cyan-600' : 'text-slate-400'}`} />
                    <span>2°C–8°C Cold Chain Refrigeration</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editRefrigeration}
                    onChange={(e) => setEditRefrigeration(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Col 3: Accepted Aid Categories */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
                  Accepted Aid Categories
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  {(['COOKED_MEALS', 'BABY_FORMULA', 'RAW_RATIONS', 'COLD_CHAIN_MEDS', 'PACKAGED_FOOD'] as AidCategory[]).map((cat) => (
                    <label key={cat} className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={editCategories.includes(cat)}
                        onChange={() => handleToggleCategory(cat)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span>{cat.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="font-bold text-slate-700 block mb-1">Intake Restrictions / Notes:</label>
                  <textarea
                    rows={2}
                    value={editRestrictions}
                    onChange={(e) => setEditRestrictions(e.target.value)}
                    placeholder="e.g. No beef; vegetarian priority; infants priority."
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0C382E] text-xs"
                  />
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* MODE 2: ALL RECIPIENT FACILITIES OVERVIEW REGISTRY   */}
      {/* ==================================================== */}
      {viewMode === 'ALL_SHELTERS' && (
        <div className="space-y-6">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-[#E5F940] text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Citywide Network
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">Recipient Shelters & Camp Grid</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Authorized Municipal Shelters & Camps
              </h2>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{shelters.length} Verified Facilities Online</span>
            </div>
          </div>

          {/* Grid of Shelter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
            {shelters.map((shelter) => {
              const freeSpace = Math.max(0, shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity));
              const occPct = Math.round(((shelter.currentOccupancy + shelter.committedCapacity) / shelter.maxCapacity) * 100);

              return (
                <div
                  key={shelter.id}
                  className={`rounded-3xl p-6 border transition-all space-y-4 ${
                    shelter.id === currentShelter.id
                      ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500 shadow-sm'
                      : 'bg-white/90 border-slate-200/80 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        shelter.status === 'ACCEPTING'
                          ? 'bg-emerald-100 text-emerald-800'
                          : shelter.status === 'CAPACITY_REACHED'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}>
                        {shelter.status.replace('_', ' ')}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                        {shelter.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{shelter.locationName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {freeSpace} Units Free
                      </span>
                      <span className="text-[10px] block text-slate-400">
                        Cap: {shelter.maxCapacity}
                      </span>
                    </div>
                  </div>

                  {/* Meter */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${occPct >= 95 ? 'bg-red-500' : 'bg-emerald-600'}`}
                      style={{ width: `${Math.min(100, occPct)}%` }}
                    />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
                    <span className={`px-2 py-0.5 rounded-md ${shelter.hasCleanWater ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-slate-100 text-slate-400'}`}>
                      Water: {shelter.hasCleanWater ? '✓ Clean' : '✕ None'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md ${shelter.hasCookingFuel ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-400'}`}>
                      Kitchen: {shelter.hasCookingFuel ? '✓ Active' : '✕ None'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md ${shelter.hasRefrigeration ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-slate-100 text-slate-400'}`}>
                      Cold Chain: {shelter.hasRefrigeration ? '✓ Available' : '✕ None'}
                    </span>
                  </div>

                  {/* Switch to this shelter button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Contact: {shelter.contactPerson} ({shelter.contactPhone})
                    </span>

                    <button
                      onClick={() => {
                        handleSelectShelter(shelter.id);
                        setViewMode('SHELTER_APP');
                        showBanner('INFO', `Switched active organization console to ${shelter.name}`);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition"
                    >
                      Manage This Shelter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: REPORT TEMPORARY CLOSURE MODAL             */}
      {/* ==================================================== */}
      {showClosureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Report Temporary Shelter Closure</h3>
            </div>
            
            <p className="text-xs text-slate-600">
              Declaring temporary closure will instantly notify the Relief Coordinator and immediately trigger automatic rerouting of all in-transit cargo to backup facilities.
            </p>

            <div className="space-y-1.5 text-xs font-bold text-slate-700">
              <label>Closure Reason:</label>
              <select
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-xs bg-slate-50"
              >
                <option value="Scheduled structural maintenance & sanitization">Scheduled sanitization & pest control</option>
                <option value="Severe water pipeline rupture">Water pipeline rupture / flooding</option>
                <option value="Temporary night-time curfew">Night-time curfew / lock gate</option>
                <option value="Staff emergency shortage">Staff emergency shortage</option>
                <option value="Other emergency contingency">Other emergency contingency</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowClosureModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReportClosure}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                Confirm Closure & Reroute Inbound
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: CONFIRM DELIVERY & RECORD DISCREPANCY       */}
      {/* ==================================================== */}
      {confirmingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-emerald-600">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Shelter Intake & Handover Verification</h3>
            </div>
            
            <p className="text-xs text-slate-600">
              Verify actual units received. Any quantity discrepancies or damage will be recorded in the audit trail.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Payload</span>
                  <span className="font-mono text-base font-black text-slate-800">{confirmingTask.quantity} units</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Courier</span>
                  <span className="font-bold text-slate-800 line-clamp-1">
                    {volunteers.find(v => v.id === confirmingTask.riderId)?.name || 'Courier'}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Actual Quantity Received (Units) <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="number"
                  min="0"
                  max={confirmingTask.quantity + 20}
                  value={receivedQuantity}
                  onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              {Number(receivedQuantity) !== confirmingTask.quantity && (
                <div className="space-y-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-950">
                  <label className="font-bold text-[11px] block">
                    Discrepancy Reason (Shortage of {confirmingTask.quantity - Number(receivedQuantity)} units):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2 boxes damaged in transit / leakage"
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Recipient Supervisor Name <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Sunita Devi (Camp Supervisor)"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Inspection Notes (Optional):</label>
                <input
                  type="text"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="e.g. Temperature checked hot 68°C, container intact."
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Intake Photo Proof (Optional):</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setProofPhotoPreview('/sanjeevani-logo.jpg')}
                    className="flex-1 py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600 font-bold flex items-center justify-center space-x-1.5 transition text-xs"
                  >
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>{proofPhotoPreview ? 'Proof Captured ✓' : 'Simulate Handover Photo'}</span>
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
                onClick={() => setConfirmingTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceiptSubmit}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Handover & Update Inventory</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
