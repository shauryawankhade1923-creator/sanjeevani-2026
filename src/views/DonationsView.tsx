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
  Package
} from 'lucide-react';
import { AidCategory } from '../types';
import { getRemainingShelfLifeMinutes } from '../utils/engine';

export const DonationsView: React.FC = () => {
  const { donations, createDonation, quickCreate180Meals, setActiveTab } = useApp();
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('+91 ');
  const [itemTitle, setItemTitle] = useState('');
  const [category, setCategory] = useState<AidCategory>('COOKED_MEALS');
  const [quantity, setQuantity] = useState(50);
  const [pickupLocation, setPickupLocation] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(90);
  const [storageRequirement, setStorageRequirement] = useState('Insulated container');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !itemTitle.trim() || !pickupLocation.trim()) {
      setFormError('Please fill in all required fields (Donor, Item Title, Pickup Location).');
      return;
    }

    if (quantity <= 0) {
      setFormError('Quantity must be greater than zero.');
      return;
    }

    if (expiryMinutes <= 0) {
      setFormError('Remaining shelf life must be positive.');
      return;
    }

    createDonation({
      donorName,
      donorPhone,
      itemTitle,
      category,
      totalQuantity: quantity,
      pickupLocation,
      coordinates: { lat: 28.6200 + (Math.random() - 0.5) * 0.05, lng: 77.2100 + (Math.random() - 0.5) * 0.05 },
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
      storageRequirement,
      specialInstructions: specialInstructions || 'Standard civic aid handover protocol.'
    });

    // Reset & close
    setShowModal(false);
    setDonorName('');
    setItemTitle('');
    setPickupLocation('');
    setFormError('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Surplus Food & Fragile Aid Ingestion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of perishable batches with active shelf-life decay and storage constraints.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => quickCreate180Meals()}
            className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition"
          >
            <Flame className="w-4 h-4 text-amber-200" />
            <span>+ 180 Meals Crisis Batch</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Donation</span>
          </button>
        </div>
      </div>

      {/* Donations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {donations.map((d) => {
          const remMin = getRemainingShelfLifeMinutes(d.expiresAt);
          const isExpired = remMin <= 0;
          const isCritical = remMin > 0 && remMin <= 30;
          const isWarning = remMin > 30 && remMin <= 75;

          const categoryBadges: Record<AidCategory, { label: string; color: string }> = {
            COOKED_MEALS: { label: 'Cooked Meals', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            BABY_FORMULA: { label: 'Infant Formula', color: 'bg-sky-100 text-sky-800 border-sky-200' },
            RAW_RATIONS: { label: 'Raw Rations', color: 'bg-amber-100 text-amber-800 border-amber-200' },
            COLD_CHAIN_MEDS: { label: 'Cold-Chain Meds', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
            PACKAGED_FOOD: { label: 'Packaged Food', color: 'bg-slate-100 text-slate-800 border-slate-200' },
          };

          const statusStyles = {
            AVAILABLE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            PARTIALLY_RESERVED: 'bg-amber-50 text-amber-800 border-amber-200',
            FULLY_RESERVED: 'bg-sky-50 text-sky-800 border-sky-200',
            IN_TRANSIT: 'bg-indigo-50 text-indigo-800 border-indigo-200',
            DELIVERED: 'bg-teal-50 text-teal-800 border-teal-200',
            EXPIRED: 'bg-red-50 text-red-800 border-red-200'
          };

          return (
            <div
              key={d.id}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isCritical ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadges[d.category].color}`}>
                    {categoryBadges[d.category].label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[d.status]}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {d.itemTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {d.donorName} &bull; <span className="font-mono text-slate-400">{d.donorPhone}</span>
                </p>

                {/* Remaining shelf-life urgency card */}
                <div className={`mt-3 p-3 rounded-lg flex items-center justify-between text-xs ${
                  isExpired 
                    ? 'bg-red-50 text-red-900 border border-red-200' 
                    : isCritical 
                    ? 'bg-red-50 text-red-900 border border-red-200 animate-pulse-subtle' 
                    : isWarning 
                    ? 'bg-amber-50 text-amber-900 border border-amber-200' 
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 shrink-0 text-current" />
                    <div>
                      <p className="font-bold">
                        {isExpired ? 'SAFE SHELF-LIFE EXPIRED' : `${remMin} Minutes Left`}
                      </p>
                      <p className="text-[10px] opacity-80 font-mono">
                        Expires: {new Date(d.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {isCritical && !isExpired && (
                    <span className="text-[10px] font-extrabold uppercase bg-red-200 text-red-900 px-1.5 py-0.5 rounded">
                      Urgent
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Available / Total:</span>
                    <span className="font-bold font-mono text-slate-900">
                      {d.remainingQuantity} / {d.totalQuantity} units
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Pickup:</span>
                    <span className="text-right text-slate-700 max-w-[180px] truncate" title={d.pickupLocation}>
                      {d.pickupLocation}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Storage:</span>
                    <span className="text-right text-slate-700 max-w-[180px] truncate" title={d.storageRequirement}>
                      {d.storageRequirement}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: #{d.id.slice(-6)}
                </span>
                
                {isExpired ? (
                  <span className="text-xs font-bold text-red-600 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Locked from Dispatch</span>
                  </span>
                ) : d.remainingQuantity > 0 ? (
                  <button
                    onClick={() => setActiveTab('dispatch')}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-lg shadow-sm transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Engine</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-teal-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fully Committed</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Register New Surplus Aid Batch
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Donor Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Hotel Royal Orchid, Mess Hall 3"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Aid Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AidCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                  >
                    <option value="COOKED_MEALS">Cooked Meals (Prepared Food)</option>
                    <option value="BABY_FORMULA">Infant Nutrition Formula</option>
                    <option value="RAW_RATIONS">Raw Ration Kits (Rice/Lentils)</option>
                    <option value="COLD_CHAIN_MEDS">Cold-Chain Medicine</option>
                    <option value="PACKAGED_FOOD">Dry Packaged Food</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Title & Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 80 Trays of Steamed Rice & Dal Makhani"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity (Meals / Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remaining Shelf Life (Minutes) *</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pickup Location / Gate Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gate 3, Back Kitchen Entrance, MG Road"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Storage & Handling Requirements</label>
                <input
                  type="text"
                  value={storageRequirement}
                  onChange={(e) => setStorageRequirement(e.target.value)}
                  placeholder="e.g., Insulated hot bags, requires refrigeration, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg shadow-sm"
                >
                  Confirm & Ingest Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
