import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Flame, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  ShieldAlert, 
  Send,
  X,
  Package,
  Search,
  Filter,
  Building2,
  Truck,
  Bell,
  Camera,
  Check,
  Edit3,
  Trash2,
  Eye,
  Thermometer,
  Droplets,
  ChefHat,
  ShieldCheck,
  Utensils,
  ChevronRight,
  ExternalLink,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AidCategory, Donation, DonationStatus } from '../types';
import { getRemainingShelfLifeMinutes } from '../utils/engine';

export const DonationsView: React.FC = () => {
  const { 
    donations, 
    tasks, 
    volunteers, 
    shelters, 
    createDonation, 
    updateDonation, 
    cancelDonation, 
    quickCreate180Meals, 
    setSelectedDonationId, 
    setActiveTab,
    events 
  } = useApp();

  // Active Donor Profile Context (Simulates the authenticated Food Donor organization)
  const [donorProfile, setDonorProfile] = useState<{
    orgName: string;
    orgType: Donation['organizationType'];
    contactPerson: string;
    phone: string;
    address: string;
    regId: string;
  }>({
    orgName: 'The Grand Regal Banquet & Conventions',
    orgType: 'HOTEL',
    contactPerson: 'Chef Vikram Malhotra (Executive Chef)',
    phone: '+91 98765 43210',
    address: 'Grand Regal Banquet, MG Road Gate 2, Central Delhi',
    regId: 'FSSAI-DON-84920'
  });

  // UI State Controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [activeDonationForDetail, setActiveDonationForDetail] = useState<Donation | null>(null);
  const [donationToEdit, setDonationToEdit] = useState<Donation | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [cancelModalDonation, setCancelModalDonation] = useState<Donation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Creation Form State
  const [formOrgName, setFormOrgName] = useState(donorProfile.orgName);
  const [formOrgType, setFormOrgType] = useState<Donation['organizationType']>('HOTEL');
  const [formContactPhone, setFormContactPhone] = useState(donorProfile.phone);
  const [formItemTitle, setFormItemTitle] = useState('');
  const [formCategory, setFormCategory] = useState<AidCategory>('COOKED_MEALS');
  const [formFoodType, setFormFoodType] = useState<Donation['foodType']>('VEGETARIAN');
  const [formQuantity, setFormQuantity] = useState(100);
  const [formUnit, setFormUnit] = useState<Donation['unit']>('meals');
  const [formPrepTime, setFormPrepTime] = useState(new Date().toISOString().slice(0, 16));
  const [formExpiryMinutes, setFormExpiryMinutes] = useState(90);
  const [formPickupLocation, setFormPickupLocation] = useState(donorProfile.address);
  const [formPickupWindow, setFormPickupWindow] = useState('14:00 - 15:30 (Immediate Gate Handover)');
  const [formStorageReq, setFormStorageReq] = useState('Insulated thermal carriers (>60°C)');
  const [formTempReq, setFormTempReq] = useState<Donation['temperatureRequirement']>('HEATED_60C');
  const [formReqCleanWater, setFormReqCleanWater] = useState(false);
  const [formReqCooking, setFormReqCooking] = useState(false);
  const [formAllergenNotes, setFormAllergenNotes] = useState('Vegetarian, Contains Dairy (Paneer), Nut-Free, Halal Compliant');
  const [formSpecialInstructions, setFormSpecialInstructions] = useState('Direct kitchen bay loading. Insulated crates ready for immediate dispatch.');
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Auto-set prerequisite defaults when category changes
  const handleCategoryChange = (cat: AidCategory) => {
    setFormCategory(cat);
    if (cat === 'BABY_FORMULA') {
      setFormReqCleanWater(true);
      setFormReqCooking(false);
      setFormFoodType('INFANT_CARE');
      setFormUnit('packs');
      setFormTempReq('AMBIENT');
      setFormStorageReq('Dry sealed containers; requires certified potable drinking water');
    } else if (cat === 'RAW_RATIONS') {
      setFormReqCleanWater(false);
      setFormReqCooking(true);
      setFormFoodType('DRY_RATION');
      setFormUnit('kg');
      setFormTempReq('AMBIENT');
      setFormStorageReq('Dry sacks; destination requires active cooking gas/stoves');
    } else if (cat === 'COOKED_MEALS') {
      setFormReqCleanWater(false);
      setFormReqCooking(false);
      setFormFoodType('VEGETARIAN');
      setFormUnit('meals');
      setFormTempReq('HEATED_60C');
      setFormStorageReq('Insulated thermal carriers (>60°C)');
    } else if (cat === 'COLD_CHAIN_MEDS') {
      setFormReqCleanWater(false);
      setFormReqCooking(false);
      setFormFoodType('COLD_MED');
      setFormUnit('units');
      setFormTempReq('COLD_2_8C');
      setFormStorageReq('Insulated icebox maintained at 2°C to 8°C');
    }
  };

  // Image Upload Handler (reads file as base64 data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Create Donation Submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formItemTitle.trim()) {
      setFormError('Donation title is required.');
      return;
    }

    if (formQuantity <= 0) {
      setFormError('Quantity must be a positive number greater than zero.');
      return;
    }

    if (formExpiryMinutes < 15) {
      setFormError('Safe consumption window must be at least 15 minutes for courier dispatch.');
      return;
    }

    if (!formPickupLocation.trim()) {
      setFormError('Pickup address is required.');
      return;
    }

    const calculatedExpiresAt = new Date(Date.now() + formExpiryMinutes * 60 * 1000).toISOString();

    const created = createDonation({
      donorName: formOrgName,
      donorPhone: formContactPhone,
      organizationName: formOrgName,
      organizationType: formOrgType,
      itemTitle: formItemTitle,
      category: formCategory,
      foodType: formFoodType,
      unit: formUnit,
      totalQuantity: formQuantity,
      pickupLocation: formPickupLocation,
      pickupWindow: formPickupWindow,
      coordinates: { 
        lat: 28.6139 + (Math.random() - 0.5) * 0.04, 
        lng: 77.2090 + (Math.random() - 0.5) * 0.04,
        address: formPickupLocation
      },
      preparedAt: new Date(formPrepTime).toISOString(),
      expiresAt: calculatedExpiresAt,
      storageRequirement: formStorageReq,
      temperatureRequirement: formTempReq,
      requiresCleanWater: formReqCleanWater,
      requiresCooking: formReqCooking,
      allergenNotes: formAllergenNotes,
      photoUrl: formPhotoPreview || undefined,
      specialInstructions: formSpecialInstructions
    });

    setShowCreateModal(false);
    setActionFeedback({
      type: 'success',
      message: `Donation #${created.id.slice(-6)} successfully registered! Courier dispatch matching initiated.`
    });
    setTimeout(() => setActionFeedback(null), 6000);

    // Reset Form
    setFormItemTitle('');
    setFormQuantity(100);
    setFormExpiryMinutes(90);
    setFormPhotoPreview(null);
  };

  // Handle Edit Save Submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationToEdit) return;

    const result = updateDonation(donationToEdit.id, {
      itemTitle: donationToEdit.itemTitle,
      totalQuantity: donationToEdit.totalQuantity,
      pickupLocation: donationToEdit.pickupLocation,
      pickupWindow: donationToEdit.pickupWindow,
      storageRequirement: donationToEdit.storageRequirement,
      specialInstructions: donationToEdit.specialInstructions,
      allergenNotes: donationToEdit.allergenNotes
    });

    setShowEditModal(false);
    setDonationToEdit(null);
    setActionFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
    setTimeout(() => setActionFeedback(null), 6000);
  };

  // Handle Cancel Submission
  const handleConfirmCancel = () => {
    if (!cancelModalDonation) return;

    const result = cancelDonation(cancelModalDonation.id, cancelReason);
    setCancelModalDonation(null);
    setCancelReason('');
    setActionFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
    setTimeout(() => setActionFeedback(null), 6000);
  };

  // Metrics (Strictly derived from live shared data)
  const totalCreatedCount = donations.length;
  const totalUnitsDonated = tasks
    .filter((t) => t.status === 'DELIVERED')
    .reduce((acc, t) => acc + t.quantity, 0);

  const awaitingPickupBatches = donations.filter(
    (d) => (d.status === 'AVAILABLE' || d.status === 'PARTIALLY_RESERVED') && getRemainingShelfLifeMinutes(d.expiresAt) > 0
  );
  const awaitingPickupUnits = awaitingPickupBatches.reduce((acc, d) => acc + d.remainingQuantity, 0);

  const approachingExpiryBatches = donations.filter((d) => {
    const mins = getRemainingShelfLifeMinutes(d.expiresAt);
    return mins > 0 && mins <= 60 && d.status !== 'DELIVERED' && d.status !== 'CANCELLED';
  });

  // Filtered Donations Table Data
  const filteredDonations = donations.filter((d) => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && d.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.itemTitle.toLowerCase().includes(q) ||
        d.donorName.toLowerCase().includes(q) ||
        d.pickupLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Donor-specific Notifications Filtered from Operational Log
  const donorNotifications = events.filter(
    (ev) => ev.category === 'DONATION' || ev.category === 'DISPATCH' || ev.severity === 'CRITICAL'
  ).slice(0, 8);

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12">
      
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)} 
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. WELCOME HEADER (Matching Sanjeevani Brand & Requirements) */}
      <div className="bg-white/95 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        
        {/* Left: Donor Identity & Organization Badge */}
        <div className="flex items-start sm:items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0C382E] to-[#174D40] text-[#E5F940] flex items-center justify-center shrink-0 shadow-sm border border-[#0C382E]/30">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                {donorProfile.orgName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 tracking-wider">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified Donor
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{donorProfile.contactPerson}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-600">{donorProfile.phone}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-400">{donorProfile.regId}</span>
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          
          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-full border border-slate-200 shadow-xs text-xs font-bold transition relative"
            title="Donor Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Alerts</span>
            <span className="w-5 h-5 rounded-full bg-[#FA4A3E] text-white text-[10px] font-extrabold flex items-center justify-center ml-0.5">
              {approachingExpiryBatches.length > 0 ? approachingExpiryBatches.length : 3}
            </span>
          </button>

          {/* Quick 180 Meals Crisis Seed */}
          <button
            onClick={() => {
              const b = quickCreate180Meals();
              setActionFeedback({
                type: 'success',
                message: `Simulated High-Urgency Batch #${b.id.slice(-6)} created (180 meals with 75m shelf life).`
              });
              setTimeout(() => setActionFeedback(null), 6000);
            }}
            className="flex items-center space-x-1.5 bg-[#0C382E] hover:bg-[#14493D] text-white px-4 py-2.5 rounded-full shadow-xs text-xs font-bold transition"
            title="Inject Standard 180-Meal Crisis Batch"
          >
            <Flame className="w-3.5 h-3.5 text-[#E5F940]" />
            <span>+ 180 Crisis Meals</span>
          </button>

          {/* Prominent Create Donation Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 px-5 py-2.5 rounded-full shadow-sm text-xs font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Create Donation</span>
          </button>

        </div>

      </div>

      {/* 2. SUMMARY CARDS (Live Data Driven) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Donations Created */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Batches Registered
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
              {totalCreatedCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              {donations.reduce((a, d) => a + d.totalQuantity, 0)} total units ingested
            </span>
          </div>
        </div>

        {/* Card 2: Meals / Units Successfully Donated */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Successfully Delivered
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono tracking-tight leading-none mt-1 block">
              {totalUnitsDonated}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
              Zero food waste fulfilled
            </span>
          </div>
        </div>

        {/* Card 3: Donations Awaiting Pickup */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Awaiting Pickup
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
              {awaitingPickupUnits}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Across {awaitingPickupBatches.length} active batches in queue
            </span>
          </div>
        </div>

        {/* Card 4: Approaching Expiry */}
        <div className={`rounded-3xl p-5 border shadow-xs flex items-center space-x-4 transition-all ${
          approachingExpiryBatches.length > 0 
            ? 'bg-amber-50/90 border-amber-200 text-amber-900' 
            : 'bg-white/90 border-slate-200/90 text-slate-800'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            approachingExpiryBatches.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75 block">
              Expiring in &lt;60 min
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none mt-1 block">
              {approachingExpiryBatches.length}
            </span>
            <span className="text-[11px] font-medium opacity-90 mt-1 block">
              {approachingExpiryBatches.length > 0 ? 'Critical urgency active' : 'All safe shelf-lives stable'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. DONOR NOTIFICATIONS DRAWER (Conditional) */}
      {showNotificationsDrawer && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900">
                Donor Operational Telemetry & Pickup Alerts
              </h3>
            </div>
            <button
              onClick={() => setShowNotificationsDrawer(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {donorNotifications.map((ev) => (
              <div 
                key={ev.id} 
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.2 rounded-full ${
                      ev.severity === 'CRITICAL' 
                        ? 'bg-red-100 text-red-800' 
                        : ev.severity === 'WARNING' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ev.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{ev.timestamp.slice(11, 16)}</span>
                  </div>
                  <p className="font-bold text-slate-900 leading-snug">{ev.title}</p>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-normal">{ev.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MY DONATIONS TABLE CONTROLS & FILTER BAR */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              My Aid Donations & Surplus Inventory
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Monitor active courier pickups, safe shelf-life decay, and verified shelter delivery proofs.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, ID, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
            {['ALL', 'AVAILABLE', 'PARTIALLY_RESERVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'EXPIRED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap ${
                  selectedStatus === st
                    ? 'bg-[#0C382E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'COOKED_MEALS', label: 'Cooked Meals' },
              { id: 'BABY_FORMULA', label: 'Infant Formula' },
              { id: 'RAW_RATIONS', label: 'Raw Rations' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* 5. MY DONATIONS MASTER DATA TABLE */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Batch ID & Item</th>
                <th className="py-3.5 px-4">Category / Diet</th>
                <th className="py-3.5 px-4">Remaining / Total</th>
                <th className="py-3.5 px-4">Safe Shelf Life</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Couriers</th>
                <th className="py-3.5 px-4">Destination Shelter</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-slate-600 text-sm">No donations match your filter</p>
                    <p className="text-xs mt-1">Try resetting the status filter or click "Create Donation".</p>
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => {
                  const remMin = getRemainingShelfLifeMinutes(d.expiresAt);
                  const isExpired = remMin <= 0 && d.status !== 'DELIVERED';
                  const isCritical = remMin > 0 && remMin <= 30 && d.status !== 'DELIVERED';

                  // Identify assigned tasks and volunteers for this donation
                  const relatedTasks = tasks.filter((t) => t.donationId === d.id);
                  const assignedRiderIds = [...new Set(relatedTasks.map((t) => t.riderId))];
                  const assignedRiders = volunteers.filter((v) => assignedRiderIds.includes(v.id));
                  
                  // Target Shelters
                  const shelterIds = [...new Set(relatedTasks.map((t) => t.targetShelterId))];
                  const assignedShelters = shelters.filter((s) => shelterIds.includes(s.id));

                  // Category styling
                  const catBadges: Record<AidCategory, { label: string; color: string }> = {
                    COOKED_MEALS: { label: 'Cooked Meals', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    BABY_FORMULA: { label: 'Infant Formula', color: 'bg-sky-50 text-sky-800 border-sky-200' },
                    RAW_RATIONS: { label: 'Raw Rations', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                    COLD_CHAIN_MEDS: { label: 'Cold Meds', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                    PACKAGED_FOOD: { label: 'Dry Packaged', color: 'bg-slate-50 text-slate-800 border-slate-200' }
                  };

                  // Status styling
                  const statusColors: Record<DonationStatus, string> = {
                    AVAILABLE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    PARTIALLY_RESERVED: 'bg-amber-50 text-amber-800 border-amber-200',
                    FULLY_RESERVED: 'bg-sky-50 text-sky-800 border-sky-200',
                    IN_TRANSIT: 'bg-purple-50 text-purple-800 border-purple-200',
                    DELIVERED: 'bg-teal-50 text-teal-800 border-teal-200',
                    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-300',
                    EXPIRED: 'bg-red-50 text-red-800 border-red-200'
                  };

                  // Can the donor edit this donation? (Only before transit or delivery)
                  const canEdit = d.status === 'AVAILABLE' || d.status === 'PARTIALLY_RESERVED';
                  // Can the donor cancel this donation? (Blocked if already in transit to prevent dumping)
                  const canCancel = d.status !== 'IN_TRANSIT' && d.status !== 'DELIVERED' && d.status !== 'CANCELLED';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Batch ID & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                            #{d.id.slice(-4)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 leading-snug">{d.itemTitle}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                              {d.pickupLocation}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category / Diet */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadges[d.category]?.color}`}>
                          {catBadges[d.category]?.label || d.category}
                        </span>
                        {d.foodType && (
                          <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                            {d.foodType.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Quantity & Units */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">
                          {d.remainingQuantity} / {d.totalQuantity}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 font-medium">
                          {d.unit || 'units'}
                        </span>
                      </td>

                      {/* Safe Shelf-Life Countdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {d.status === 'DELIVERED' ? (
                          <span className="text-teal-700 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fulfilled</span>
                          </span>
                        ) : d.status === 'CANCELLED' ? (
                          <span className="text-slate-400 font-medium">Cancelled</span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center space-x-1 text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>EXPIRED</span>
                          </span>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                            <span className={`font-mono font-bold ${isCritical ? 'text-red-700' : 'text-slate-800'}`}>
                              {remMin} min
                            </span>
                            {isCritical && (
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColors[d.status]}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Assigned Couriers */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {assignedRiders.length === 0 ? (
                          <span className="text-slate-400 font-medium text-[11px]">Searching couriers...</span>
                        ) : (
                          <div className="flex items-center space-x-1">
                            {assignedRiders.slice(0, 3).map((r) => (
                              <span
                                key={r.id}
                                className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold px-2 py-0.5 rounded-md border border-slate-200"
                                title={`${r.name} (${r.vehicleType}, Cap: ${r.carryCapacity})`}
                              >
                                {r.name.split(' ')[0]}
                              </span>
                            ))}
                            {assignedRiders.length > 3 && (
                              <span className="text-[10px] text-slate-500 font-bold">
                                +{assignedRiders.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Destination Shelter */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {assignedShelters.length === 0 ? (
                          <span className="text-slate-400 font-medium text-[11px]">Pending matching</span>
                        ) : (
                          <span className="font-bold text-slate-800 text-[11.5px] truncate max-w-[140px] block" title={assignedShelters.map(s => s.name).join(', ')}>
                            {assignedShelters[0].name}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          
                          {/* View Detail / Timeline */}
                          <button
                            onClick={() => {
                              setActiveDonationForDetail(d);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition"
                            title="View Complete Delivery Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit (if permitted) */}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setDonationToEdit({ ...d });
                                setShowEditModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition"
                              title="Edit Donation Parameters"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel (guarded) */}
                          {canCancel && (
                            <button
                              onClick={() => setCancelModalDonation(d)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                              title="Cancel Donation & Release Reservations"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Dispatch Shortcut */}
                          {d.remainingQuantity > 0 && !isExpired && (
                            <button
                              onClick={() => {
                                setSelectedDonationId(d.id);
                                setActiveTab('dispatch');
                              }}
                              className="ml-1 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 shadow-2xs transition"
                            >
                              <span>Dispatch</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE DONATION (Comprehensive Form Matching Requirements)       */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#0C382E] text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#E5F940]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Register Surplus Food & Aid Batch
                  </h3>
                  <p className="text-[11px] text-[#A3D9C9]">
                    Publish verified surplus to the Sanjeevani last-mile courier coordination engine.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Error Callout */}
            {formError && (
              <div className="m-4 mb-0 p-3 bg-red-50 text-red-800 text-xs rounded-2xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              
              {/* Section 1: Item Identification */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase text-[10.5px] tracking-wider flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-[#0C382E]" />
                  <span>Payload Details</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Donation Item Title & Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 180 Fresh Cooked Meal Trays (Biryani & Paneer Makhani)"
                    value={formItemTitle}
                    onChange={(e) => setFormItemTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Aid Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChange(e.target.value as AidCategory)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                    >
                      <option value="COOKED_MEALS">Cooked Meals (Perishable Prepared Food)</option>
                      <option value="BABY_FORMULA">Infant Nutrition Formula (Requires Clean Water)</option>
                      <option value="RAW_RATIONS">Raw Ration Kits (Requires Cooking/Fuel)</option>
                      <option value="COLD_CHAIN_MEDS">Cold-Chain Medicine (2°C - 8°C)</option>
                      <option value="PACKAGED_FOOD">Dry Packaged Food</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Food / Diet Classification</label>
                    <select
                      value={formFoodType}
                      onChange={(e) => setFormFoodType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                    >
                      <option value="VEGETARIAN">Vegetarian (Standard)</option>
                      <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                      <option value="VEGAN">100% Plant-Based Vegan</option>
                      <option value="DRY_RATION">Dry Grain Rations</option>
                      <option value="INFANT_CARE">Infant / Baby Care Formula</option>
                      <option value="COLD_MED">Critical Temperature-Controlled Meds</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0C382E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit of Measurement</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                    >
                      <option value="meals">Meals (Trays / Plates)</option>
                      <option value="boxes">Boxes / Insulated Crates</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="packs">Packs / Cans</option>
                      <option value="units">Standard Units</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Time Windows & Shelf-Life Safety */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase text-[10.5px] tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0C382E]" />
                  <span>Time Windows & Safe-Use Shelf-Life</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preparation / Packaging Time</label>
                    <input
                      type="datetime-local"
                      value={formPrepTime}
                      onChange={(e) => setFormPrepTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0C382E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Safe Consumption Shelf Life: <span className="font-mono text-emerald-800 font-extrabold">{formExpiryMinutes} Minutes</span>
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="360"
                      step="5"
                      value={formExpiryMinutes}
                      onChange={(e) => setFormExpiryMinutes(Number(e.target.value))}
                      className="w-full accent-[#0C382E] cursor-pointer mt-2"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>20m (Immediate)</span>
                      <span>75m (Crisis Target)</span>
                      <span>180m</span>
                      <span>360m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Storage, Temperature & Preparation Requirements */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase text-[10.5px] tracking-wider flex items-center space-x-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-[#0C382E]" />
                  <span>Storage & Safety Constraint Gatekeeper</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Temperature Threshold</label>
                    <select
                      value={formTempReq}
                      onChange={(e) => setFormTempReq(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                    >
                      <option value="HEATED_60C">Heated Container (&gt;60°C)</option>
                      <option value="COLD_2_8C">Refrigerated Cold Chain (2°C - 8°C)</option>
                      <option value="AMBIENT">Ambient Room Temperature</option>
                      <option value="FROZEN">Deep Freeze (&lt;-18°C)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Container & Packaging Type</label>
                    <input
                      type="text"
                      value={formStorageReq}
                      onChange={(e) => setFormStorageReq(e.target.value)}
                      placeholder="e.g., Insulated thermal bags"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                    />
                  </div>
                </div>

                {/* Safety Checkboxes (Directly enforces engine prerequisite validation!) */}
                <div className="pt-2 space-y-2 border-t border-slate-200">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formReqCleanWater}
                      onChange={(e) => setFormReqCleanWater(e.target.checked)}
                      className="mt-0.5 rounded text-[#0C382E] focus:ring-[#0C382E]"
                    />
                    <div>
                      <span className="font-bold text-slate-900">Requires Clean Drinking Water at Destination</span>
                      <p className="text-[10.5px] text-slate-500">
                        Sanjeevani will strictly block dispatch to shelters lacking verified potable water.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formReqCooking}
                      onChange={(e) => setFormReqCooking(e.target.checked)}
                      className="mt-0.5 rounded text-[#0C382E] focus:ring-[#0C382E]"
                    />
                    <div>
                      <span className="font-bold text-slate-900">Requires Active Kitchen Cooking Fuel / Stoves</span>
                      <p className="text-[10.5px] text-slate-500">
                        Dispatches only to camps with working kitchen and stove infrastructure.
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Food Safety & Allergen Notes</label>
                  <input
                    type="text"
                    value={formAllergenNotes}
                    onChange={(e) => setFormAllergenNotes(e.target.value)}
                    placeholder="e.g., Contains Dairy, Halal Certified, Nut-Free"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                </div>
              </div>

              {/* Section 4: Handover Logistics & Photo */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase text-[10.5px] tracking-wider flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0C382E]" />
                  <span>Logistics & Courier Handover</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pickup Address & Gate *</label>
                  <input
                    type="text"
                    required
                    value={formPickupLocation}
                    onChange={(e) => setFormPickupLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Available Pickup Window</label>
                    <input
                      type="text"
                      value={formPickupWindow}
                      onChange={(e) => setFormPickupWindow(e.target.value)}
                      placeholder="e.g., 14:00 - 15:30"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Food Packaging Photo (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Photo Preview */}
                {formPhotoPreview && (
                  <div className="mt-2 flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200">
                    <img 
                      src={formPhotoPreview} 
                      alt="Donation Photo" 
                      className="w-14 h-14 rounded-lg object-cover border"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-[11px]">Food Safety Photo Attached</p>
                      <button
                        type="button"
                        onClick={() => setFormPhotoPreview(null)}
                        className="text-red-600 hover:underline text-[10px] font-bold"
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Handover Instructions for Field Volunteer</label>
                  <textarea
                    rows={2}
                    value={formSpecialInstructions}
                    onChange={(e) => setFormSpecialInstructions(e.target.value)}
                    placeholder="e.g., Direct loading at Gate 2 service elevator. Insulated crates provided."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0C382E]"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-full text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 font-black rounded-full shadow-xs transition hover:scale-105 active:scale-95"
                >
                  Confirm & Ingest Donation Batch
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DONATION DETAIL & COMPLETE DELIVERY TIMELINE                     */}
      {/* ========================================================================= */}
      {showDetailModal && activeDonationForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#0C382E] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#E5F940] tracking-wider uppercase block">
                  Donation #{activeDonationForDetail.id.slice(-6)}
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {activeDonationForDetail.itemTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* Batch Core Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Quantity</span>
                  <p className="font-mono font-black text-slate-900 text-sm mt-0.5">
                    {activeDonationForDetail.totalQuantity} {activeDonationForDetail.unit || 'units'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining</span>
                  <p className="font-mono font-black text-emerald-800 text-sm mt-0.5">
                    {activeDonationForDetail.remainingQuantity} units
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <p className="font-extrabold text-slate-900 text-xs mt-0.5">
                    {activeDonationForDetail.status}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Safe Shelf-Life</span>
                  <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                    {getRemainingShelfLifeMinutes(activeDonationForDetail.expiresAt)} min remaining
                  </p>
                </div>
              </div>

              {/* COMPLETE DELIVERY TIMELINE STEPPER (Requirement 5) */}
              <div>
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider mb-4 flex items-center space-x-1.5">
                  <Truck className="w-4 h-4 text-[#0C382E]" />
                  <span>Complete Delivery Lifecycle & Custody Handover</span>
                </h4>

                <div className="space-y-4 pl-2 border-l-2 border-slate-200 relative ml-3">
                  
                  {/* Step 1: Registration */}
                  <div className="relative pl-5">
                    <div className="absolute -left-[19px] top-0 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-xs">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Donation Registered & Safety Declared</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Registered by {activeDonationForDetail.donorName} at {new Date(activeDonationForDetail.createdAt).toLocaleTimeString()}.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Courier Claim */}
                  <div className="relative pl-5">
                    <div className={`absolute -left-[19px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-xs ${
                      activeDonationForDetail.status !== 'AVAILABLE' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {activeDonationForDetail.status !== 'AVAILABLE' ? '✓' : '2'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Courier Matching & Knapsack Reservation</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {tasks.filter(t => t.donationId === activeDonationForDetail.id).length > 0
                          ? `Claimed by ${tasks.filter(t => t.donationId === activeDonationForDetail.id).length} certified field volunteers.`
                          : 'Awaiting courier reservation matching.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Food Inspection & Gate Handover */}
                  <div className="relative pl-5">
                    <div className={`absolute -left-[19px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-xs ${
                      tasks.some(t => t.donationId === activeDonationForDetail.id && (t.status === 'IN_TRANSIT' || t.status === 'DELIVERED'))
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tasks.some(t => t.donationId === activeDonationForDetail.id && (t.status === 'IN_TRANSIT' || t.status === 'DELIVERED')) ? '✓' : '3'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Insulated Box Custody Handover</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeDonationForDetail.pickupLocation}. Protocol verified: {activeDonationForDetail.storageRequirement}.
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Active Corridor Transit */}
                  <div className="relative pl-5">
                    <div className={`absolute -left-[19px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-xs ${
                      activeDonationForDetail.status === 'IN_TRANSIT'
                        ? 'bg-[#E5F940] text-slate-900 border-black animate-pulse'
                        : activeDonationForDetail.status === 'DELIVERED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {activeDonationForDetail.status === 'DELIVERED' ? '✓' : '4'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">In Transit with City Courier</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeDonationForDetail.status === 'IN_TRANSIT' 
                          ? 'Active on GPS corridor with speed telemetry tracking.' 
                          : activeDonationForDetail.status === 'DELIVERED'
                          ? 'Transit completed safely within shelf-life threshold.'
                          : 'Pending courier departure from donor loading bay.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 5: Shelter Intake & Fulfilled */}
                  <div className="relative pl-5">
                    <div className={`absolute -left-[19px] top-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-xs ${
                      activeDonationForDetail.status === 'DELIVERED'
                        ? 'bg-teal-600 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {activeDonationForDetail.status === 'DELIVERED' ? '✓' : '5'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Beneficiary Shelter Receipt & Verification</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeDonationForDetail.status === 'DELIVERED'
                          ? 'Verified arrival and distribution to shelter beneficiaries. Full audit proof recorded.'
                          : 'Pending arrival at assigned shelter camp.'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Safety & Prerequisite Specs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[10.5px]">Food Safety & Allergen Proof</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <p><strong>Storage:</strong> {activeDonationForDetail.storageRequirement}</p>
                  <p><strong>Diet Type:</strong> {activeDonationForDetail.foodType || 'Vegetarian'}</p>
                  <p><strong>Clean Water Dependency:</strong> {activeDonationForDetail.requiresCleanWater ? 'Enforced Potable Water' : 'None'}</p>
                  <p><strong>Kitchen Fuel Dependency:</strong> {activeDonationForDetail.requiresCooking ? 'Requires Stoves/Fuel' : 'Ready to Consume'}</p>
                </div>
                {activeDonationForDetail.allergenNotes && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <strong>Allergens & Compliance:</strong> {activeDonationForDetail.allergenNotes}
                  </p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                Created: {new Date(activeDonationForDetail.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT DONATION PARAMETERS (Allowed before transit/delivery)        */}
      {/* ========================================================================= */}
      {showEditModal && donationToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Edit Donation Parameters</h3>
                <p className="text-[11px] text-slate-400">
                  Editing payload for Batch #{donationToEdit.id.slice(-6)}
                </p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-white font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Title</label>
                <input
                  type="text"
                  required
                  value={donationToEdit.itemTitle}
                  onChange={(e) => setDonationToEdit({ ...donationToEdit, itemTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={donationToEdit.totalQuantity}
                  onChange={(e) => setDonationToEdit({ ...donationToEdit, totalQuantity: Number(e.target.value), remainingQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pickup Address & Gate</label>
                <input
                  type="text"
                  required
                  value={donationToEdit.pickupLocation}
                  onChange={(e) => setDonationToEdit({ ...donationToEdit, pickupLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pickup Window</label>
                <input
                  type="text"
                  value={donationToEdit.pickupWindow || ''}
                  onChange={(e) => setDonationToEdit({ ...donationToEdit, pickupWindow: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Storage & Handover Requirements</label>
                <input
                  type="text"
                  value={donationToEdit.storageRequirement}
                  onChange={(e) => setDonationToEdit({ ...donationToEdit, storageRequirement: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-full font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E5F940] hover:bg-[#d9ec34] text-slate-950 font-black rounded-full"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CANCEL CONFIRMATION (With Security Guard Against In-Transit Cargo) */}
      {/* ========================================================================= */}
      {cancelModalDonation && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 text-xs">
            
            <div className="flex items-center space-x-3 text-red-700">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Cancel Donation #{cancelModalDonation.id.slice(-6)}?
                </h3>
                <p className="text-[11px] text-slate-500">
                  {cancelModalDonation.itemTitle} ({cancelModalDonation.totalQuantity} units)
                </p>
              </div>
            </div>

            <p className="text-slate-600 leading-normal">
              Cancelling this donation will release all pre-departure courier reservations and remove the batch from the active redistribution queue.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Cancellation (Required for Audit)</label>
              <textarea
                rows={2}
                required
                placeholder="e.g., Event extended, food repurposed internally, or packaging breach."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalDonation(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-full font-bold text-slate-600 hover:bg-slate-50"
              >
                Never Mind
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};