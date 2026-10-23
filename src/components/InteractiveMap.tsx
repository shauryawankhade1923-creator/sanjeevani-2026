import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Donation, Shelter, Volunteer, DeliveryTask } from '../types';
import { 
  Building2, 
  Home, 
  Bike, 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Layers,
  Info
} from 'lucide-react';

interface InteractiveMapProps {
  compact?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ compact = false }) => {
  const { donations, shelters, volunteers, tasks } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [mapEngine, setMapEngine] = useState<'leaflet' | 'svg'>('leaflet');
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'DONOR' | 'SHELTER' | 'RIDER' | 'ROUTE';
    data: any;
  } | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current) return;

      try {
        const L = (await import('leaflet')).default;

        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
        }

        const map = L.map(mapContainerRef.current, {
          center: [28.625, 77.225],
          zoom: compact ? 11 : 12,
          zoomControl: false,
        });

        if (!compact) {
          L.control.zoom({ position: 'bottomright' }).addTo(map);
        }

        // Clean OpenStreetMap standard tile layer (100% open-source, no API key required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
        }).addTo(map);

        leafletMapRef.current = map;
        renderLeafletElements(L, map);

        setTimeout(() => {
          if (isMounted && leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.warn('Leaflet tile initialization fallback to SVG canvas:', err);
        if (isMounted) setMapEngine('svg');
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [compact]);

  // Update markers when state changes
  useEffect(() => {
    if (leafletMapRef.current) {
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        renderLeafletElements(L, leafletMapRef.current);
      });
    }
  }, [donations, shelters, volunteers, tasks]);

  const renderLeafletElements = (L: any, map: any) => {
    // Clear old markers & polylines
    markersRef.current.forEach((m) => m.remove());
    polylinesRef.current.forEach((p) => p.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    // 1. Render Donors
    donations.forEach((d) => {
      if (d.status === 'EXPIRED') return;
      const isUrgent = d.remainingQuantity > 0;
      const html = `
        <div style="background-color: #065f46; color: white; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7M5 21V10.85a3 3 0 0 0 2-.85V7M19 21v-10.15a3 3 0 0 1-2-.85V7"/></svg>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-donor-pin', iconSize: [34, 34], iconAnchor: [17, 17] });
      const marker = L.marker([d.coordinates.lat, d.coordinates.lng], { icon })
        .addTo(map)
        .bindTooltip(`<b>${d.donorName}</b><br>${d.remainingQuantity} meals available`, { direction: 'top' });

      marker.on('click', () => setSelectedEntity({ type: 'DONOR', data: d }));
      markersRef.current.push(marker);
    });

    // 2. Render Shelters
    shelters.forEach((s) => {
      const isFullOrClosed = s.status === 'CAPACITY_REACHED' || s.status === 'CLOSED';
      const bgColor = isFullOrClosed ? '#dc2626' : '#0284c7';
      const availableCap = s.maxCapacity - (s.currentOccupancy + s.committedCapacity);

      const html = `
        <div style="background-color: ${bgColor}; color: white; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-shelter-pin', iconSize: [34, 34], iconAnchor: [17, 17] });
      const marker = L.marker([s.coordinates.lat, s.coordinates.lng], { icon })
        .addTo(map)
        .bindTooltip(`<b>${s.name}</b><br>Avail: ${availableCap} / Cap: ${s.maxCapacity}`, { direction: 'top' });

      marker.on('click', () => setSelectedEntity({ type: 'SHELTER', data: s }));
      markersRef.current.push(marker);
    });

    // 3. Render Riders
    volunteers.forEach((v) => {
      const isGhost = v.responsiveness === 'UNRESPONSIVE';
      const isInTransit = v.status === 'IN_TRANSIT';
      const bgColor = isGhost ? '#e11d48' : isInTransit ? '#0d9488' : '#f59e0b';

      const html = `
        <div style="background-color: ${bgColor}; color: white; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-rider-pin', iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = L.marker([v.coordinates.lat, v.coordinates.lng], { icon })
        .addTo(map)
        .bindTooltip(`<b>${v.name}</b> (${v.vehicleType})<br>Cap: ${v.carryCapacity} | Status: ${v.status}`, { direction: 'top' });

      marker.on('click', () => setSelectedEntity({ type: 'RIDER', data: v }));
      markersRef.current.push(marker);
    });

    // 4. Render Active Delivery Routes
    tasks.forEach((task) => {
      if (task.status === 'DELIVERED' || task.status === 'RECLAIMED' || task.status === 'CANCELLED') return;

      const rider = volunteers.find((v) => v.id === task.riderId);
      const shelter = shelters.find((s) => s.id === task.targetShelterId);
      const donation = donations.find((d) => d.id === task.donationId);

      if (rider && shelter) {
        const routeColor = task.isRerouted ? '#8b5cf6' : task.status === 'IN_TRANSIT' ? '#0d9488' : '#f59e0b';
        const polyline = L.polyline(
          [
            [rider.coordinates.lat, rider.coordinates.lng],
            [shelter.coordinates.lat, shelter.coordinates.lng]
          ],
          {
            color: routeColor,
            weight: 3.5,
            dashArray: task.isRerouted ? '8, 8' : undefined,
            opacity: 0.85
          }
        ).addTo(map);

        polyline.bindTooltip(
          `<b>Task #${task.id.slice(-6)}</b>: ${task.quantity} units to ${shelter.name} ${task.isRerouted ? '(DIVERTED)' : ''}`,
          { sticky: true }
        );

        polylinesRef.current.push(polyline);
      }
    });

    // Auto-fit map to show all relevant entities
    const allCoords: [number, number][] = [];
    donations.forEach((d) => {
      if (d.status !== 'EXPIRED') allCoords.push([d.coordinates.lat, d.coordinates.lng]);
    });
    shelters.forEach((s) => allCoords.push([s.coordinates.lat, s.coordinates.lng]));
    volunteers.forEach((v) => allCoords.push([v.coordinates.lat, v.coordinates.lng]));

    if (allCoords.length > 0) {
      try {
        map.fitBounds(allCoords, { 
          padding: compact ? [20, 20] : [45, 45], 
          maxZoom: compact ? 13 : 14 
        });
      } catch (err) {
        // Ignore bounds error
      }
    }
  };

  return (
    <div className={`relative w-full h-full ${compact ? 'min-h-[220px]' : 'min-h-[460px]'} bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col`}>
      {/* Top Map Control Bar (Only shown in full / non-compact mode to avoid overlap) */}
      {!compact && (
        <>
          <div className="absolute top-3 left-3 z-[1000] flex items-center space-x-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-medium text-slate-700">
            <span className="flex items-center text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 mr-1.5 animate-pulse" />
              Live Fleet Radar
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Active Missions: {tasks.filter(t => t.status === 'IN_TRANSIT' || t.status === 'CLAIMED').length}</span>
          </div>

          {/* Legend Badge */}
          <div className="absolute top-3 right-3 z-[1000] hidden sm:flex items-center space-x-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-600">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block" />
              <span>Donor</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
              <span>Shelter</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Rider</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              <span>Diverted Route</span>
            </span>
          </div>
        </>
      )}

      {/* Map View Container */}
      <div ref={mapContainerRef} className={`w-full h-full flex-1 ${compact ? 'min-h-[220px]' : 'min-h-[440px]'}`} />

      {/* Selected Entity Inspector Panel */}
      {selectedEntity && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-[1000] bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-slate-100 text-slate-700 mb-1">
                {selectedEntity.type}
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {selectedEntity.data.name || selectedEntity.data.donorName || selectedEntity.data.itemTitle}
              </h4>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-600 space-y-1">
            {selectedEntity.type === 'DONOR' && (
              <>
                <p><strong>Available:</strong> {selectedEntity.data.remainingQuantity} / {selectedEntity.data.totalQuantity} meals</p>
                <p><strong>Pickup:</strong> {selectedEntity.data.pickupLocation}</p>
                <p><strong>Category:</strong> {selectedEntity.data.category.replace('_', ' ')}</p>
              </>
            )}
            {selectedEntity.type === 'SHELTER' && (
              <>
                <p><strong>Occupancy:</strong> {selectedEntity.data.currentOccupancy} / {selectedEntity.data.maxCapacity} (Committed: {selectedEntity.data.committedCapacity})</p>
                <p><strong>Status:</strong> <span className={selectedEntity.data.status === 'ACCEPTING' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>{selectedEntity.data.status}</span></p>
                <div className="flex space-x-2 pt-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedEntity.data.hasCleanWater ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    {selectedEntity.data.hasCleanWater ? '✓ Clean Water' : '✕ No Potable Water'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedEntity.data.hasCookingFuel ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    {selectedEntity.data.hasCookingFuel ? '✓ Cooking Fuel' : '✕ No Kitchen/Fuel'}
                  </span>
                </div>
              </>
            )}
            {selectedEntity.type === 'RIDER' && (
              <>
                <p><strong>Vehicle:</strong> {selectedEntity.data.vehicleType} | <strong>Capacity:</strong> {selectedEntity.data.carryCapacity} meals</p>
                <p><strong>Status:</strong> {selectedEntity.data.status} | <strong>Responsiveness:</strong> <span className={selectedEntity.data.responsiveness === 'ACTIVE' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>{selectedEntity.data.responsiveness}</span></p>
                <p><strong>Reliability:</strong> {Math.round(selectedEntity.data.reliabilityScore * 100)}%</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
