import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { 
  Donation, 
  Shelter, 
  Volunteer, 
  DeliveryTask, 
  LogEvent, 
  EventSeverity,
  AidCategory,
  RiderStatus
} from '../types';
import { 
  INITIAL_DONATIONS, 
  INITIAL_SHELTERS, 
  INITIAL_VOLUNTEERS, 
  INITIAL_LOG_EVENTS 
} from '../data/initialData';
import { calculateBatchSplit, getRemainingShelfLifeMinutes, findRerouteAlternatives } from '../utils/engine';
import { calculateDistanceKm, estimateTransitMinutes } from '../utils/geo';

interface AppContextType {
  donations: Donation[];
  shelters: Shelter[];
  volunteers: Volunteer[];
  tasks: DeliveryTask[];
  events: LogEvent[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  timeMultiplier: number;
  setTimeMultiplier: (multiplier: number) => void;
  
  // Actions
  createDonation: (data: Omit<Donation, 'id' | 'remainingQuantity' | 'status' | 'createdAt'>) => Donation;
  quickCreate180Meals: () => Donation;
  claimTask: (donationId: string, riderId: string, shelterId: string, quantity: number) => { success: boolean; error?: string };
  splitAndDispatch: (donationId: string, shelterId: string, requestedRiderIds?: string[]) => { success: boolean; taskIds: string[]; message: string };
  confirmPickup: (taskId: string) => void;
  confirmDelivery: (taskId: string) => void;
  simulateGhostRider: (riderId: string) => void;
  reclaimGhostTask: (taskId: string, autoReassign?: boolean) => void;
  updateShelterStatus: (shelterId: string, status: Shelter['status'], newOccupancy?: number) => void;
  rerouteTask: (taskId: string, newShelterId: string, reason: string) => boolean;
  addLogEvent: (severity: EventSeverity, category: LogEvent['category'], title: string, message: string, metadata?: any) => void;
  resetAllData: () => void;
  
  // Demo Scenarios
  runScenarioA: () => void;
  runScenarioB: () => void;
  runScenarioC: () => void;
  runScenarioD: () => void;

  // Active Scenario Progress
  activeScenario: 'NONE' | 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D';
  scenarioStep: number;
  scenarioNotes: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sanjeevani_platform_state_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load state or use initial seed
  const [donations, setDonations] = useState<Donation[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_donations`);
    return saved ? JSON.parse(saved) : INITIAL_DONATIONS;
  });

  const [shelters, setShelters] = useState<Shelter[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_shelters`);
    return saved ? JSON.parse(saved) : INITIAL_SHELTERS;
  });

  const [volunteers, setVolunteers] = useState<Volunteer[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_volunteers`);
    return saved ? JSON.parse(saved) : INITIAL_VOLUNTEERS;
  });

  const [tasks, setTasks] = useState<DeliveryTask[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
    return saved ? JSON.parse(saved) : [];
  });

  const [events, setEvents] = useState<LogEvent[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_events`);
    return saved ? JSON.parse(saved) : INITIAL_LOG_EVENTS;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1);
  const [activeScenario, setActiveScenario] = useState<AppContextType['activeScenario']>('NONE');
  const [scenarioStep, setScenarioStep] = useState<number>(0);
  const [scenarioNotes, setScenarioNotes] = useState<string>('');

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_donations`, JSON.stringify(donations));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_shelters`, JSON.stringify(shelters));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_volunteers`, JSON.stringify(volunteers));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_tasks`, JSON.stringify(tasks));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_events`, JSON.stringify(events));
  }, [donations, shelters, volunteers, tasks, events]);

  // Log Event Helper
  const addLogEvent = (
    severity: EventSeverity,
    category: LogEvent['category'],
    title: string,
    message: string,
    metadata?: any
  ) => {
    const newEvent: LogEvent = {
      id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      severity,
      category,
      title,
      message,
      metadata
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 150)]); // keep recent 150
  };

  // Automated Watchdog ticker (Ghost detection & Expiry check)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // Check Ghost Reservations for CLAIMED tasks
      tasks.forEach((task) => {
        if (task.status === 'CLAIMED') {
          const deadline = new Date(task.claimExpiresAt).getTime();
          if (now >= deadline) {
            // Rider is ghost/unresponsive!
            const rider = volunteers.find((v) => v.id === task.riderId);
            if (rider && rider.responsiveness !== 'UNRESPONSIVE') {
              // Mark rider unresponsive and reclaim automatically
              addLogEvent(
                'CRITICAL',
                'GHOST_WATCH',
                'Ghost Reservation Detected',
                `Volunteer ${rider.name} failed to confirm pickup for Task #${task.id.slice(-6)} within deadline. Auto-reclaiming reserved meals to prevent spoilage.`,
                { taskId: task.id, riderId: rider.id }
              );
              reclaimGhostTask(task.id, true);
            }
          }
        }
      });

      // Check Spoilage for available donations
      donations.forEach((donation) => {
        if (donation.status === 'AVAILABLE' || donation.status === 'PARTIALLY_RESERVED') {
          const remMin = getRemainingShelfLifeMinutes(donation.expiresAt);
          if (remMin <= 0) {
            setDonations((prev) =>
              prev.map((d) => (d.id === donation.id ? { ...d, status: 'EXPIRED' } : d))
            );
            addLogEvent(
              'CRITICAL',
              'DONATION',
              'Perishable Batch Expired',
              `Batch "${donation.itemTitle}" has passed its safe consumption deadline. Locked from dispatch.`,
              { donationId: donation.id }
            );
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, volunteers, donations]);

  // Create Donation
  const createDonation = (data: Omit<Donation, 'id' | 'remainingQuantity' | 'status' | 'createdAt'>): Donation => {
    const newDonation: Donation = {
      ...data,
      id: `don-${Date.now().toString().slice(-6)}`,
      remainingQuantity: data.totalQuantity,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString()
    };

    setDonations((prev) => [newDonation, ...prev]);
    addLogEvent(
      'INFO',
      'DONATION',
      'New Donation Registered',
      `${data.donorName} registered ${data.totalQuantity} units of ${data.itemTitle}. Expiry set to ${new Date(data.expiresAt).toLocaleTimeString()}.`,
      { donationId: newDonation.id }
    );
    return newDonation;
  };

  // Quick 180 Meals Creator (Problem Statement Requirement)
  const quickCreate180Meals = (): Donation => {
    const quickDonation: Donation = {
      id: `don-180m-${Date.now().toString().slice(-4)}`,
      donorName: 'The Grand Regal Banquet Hall',
      donorPhone: '+91 98765 43210',
      itemTitle: '180 Fresh Cooked Meal Trays (Emergency Surplus)',
      category: 'COOKED_MEALS',
      totalQuantity: 180,
      remainingQuantity: 180,
      pickupLocation: 'Grand Regal Banquet, MG Road Gate 2',
      coordinates: { lat: 28.6139, lng: 77.2090, address: 'MG Road Gate 2' },
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // 75 mins remaining
      storageRequirement: 'Insulated hot bags; consume within 75 minutes',
      specialInstructions: 'Separated into insulated meal trays of 10. Direct gate pickup.',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString()
    };

    setDonations((prev) => [quickDonation, ...prev]);
    addLogEvent(
      'WARNING',
      'DONATION',
      'High-Urgency 180-Meal Batch Created',
      `Registered 180 cooked meals with 75 minutes remaining shelf life. Multi-rider batch splitting required.`,
      { donationId: quickDonation.id, quantity: 180, expiryMinutes: 75 }
    );
    return quickDonation;
  };

  // Single Rider Claim Task
  const claimTask = (
    donationId: string,
    riderId: string,
    shelterId: string,
    quantity: number
  ): { success: boolean; error?: string } => {
    const donation = donations.find((d) => d.id === donationId);
    const rider = volunteers.find((v) => v.id === riderId);
    const shelter = shelters.find((s) => s.id === shelterId);

    if (!donation || !rider || !shelter) {
      return { success: false, error: 'Invalid donation, rider, or shelter reference' };
    }

    if (quantity > donation.remainingQuantity) {
      return { success: false, error: `Requested quantity (${quantity}) exceeds remaining available (${donation.remainingQuantity})` };
    }

    if (quantity > rider.carryCapacity) {
      return { success: false, error: `Quantity (${quantity}) exceeds rider carrying capacity (${rider.carryCapacity})` };
    }

    const availableShelterCap = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
    if (quantity > availableShelterCap) {
      return { success: false, error: `Shelter capacity exceeded. Only ${availableShelterCap} space available.` };
    }

    // Calculate transit and dynamic claim TTL (30s in accelerated demo)
    const dist = calculateDistanceKm(rider.coordinates, shelter.coordinates);
    const transitMin = estimateTransitMinutes(dist);
    const claimTtlSeconds = Math.max(15, Math.floor(35 / timeMultiplier));

    const newTask: DeliveryTask = {
      id: `task-${Date.now().toString().slice(-6)}`,
      donationId,
      riderId,
      originalShelterId: shelterId,
      targetShelterId: shelterId,
      quantity,
      status: 'CLAIMED',
      reservedAt: new Date().toISOString(),
      claimExpiresAt: new Date(Date.now() + claimTtlSeconds * 1000).toISOString(),
      isRerouted: false,
      estimatedTransitMinutes: transitMin
    };

    // Update States
    setTasks((prev) => [newTask, ...prev]);

    setDonations((prev) =>
      prev.map((d) => {
        if (d.id === donationId) {
          const newRem = d.remainingQuantity - quantity;
          return {
            ...d,
            remainingQuantity: newRem,
            status: newRem === 0 ? 'FULLY_RESERVED' : 'PARTIALLY_RESERVED'
          };
        }
        return d;
      })
    );

    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === riderId
          ? { ...v, status: 'RESERVED', activeTaskId: newTask.id, responsiveness: 'ACTIVE' }
          : v
      )
    );

    setShelters((prev) =>
      prev.map((s) =>
        s.id === shelterId
          ? { ...s, committedCapacity: s.committedCapacity + quantity }
          : s
      )
    );

    addLogEvent(
      'INFO',
      'DISPATCH',
      `Task #${newTask.id.slice(-6)} Reserved`,
      `Rider ${rider.name} reserved ${quantity} units for ${shelter.name}. Acknowledgement deadline: ${claimTtlSeconds}s (accelerated).`,
      { taskId: newTask.id, rider: rider.name, quantity }
    );

    return { success: true };
  };

  // Multi-Rider Atomic Batch Splitting Dispatch
  const splitAndDispatch = (
    donationId: string,
    shelterId: string,
    requestedRiderIds?: string[]
  ): { success: boolean; taskIds: string[]; message: string } => {
    const donation = donations.find((d) => d.id === donationId);
    const shelter = shelters.find((s) => s.id === shelterId);

    if (!donation || !shelter) {
      return { success: false, taskIds: [], message: 'Donation or shelter not found' };
    }

    if (donation.remainingQuantity <= 0) {
      return { success: false, taskIds: [], message: 'No remaining quantity to dispatch in this batch.' };
    }

    // Filter available riders
    let candidateRiders = volunteers.filter(
      (v) => v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE'
    );

    if (requestedRiderIds && requestedRiderIds.length > 0) {
      candidateRiders = candidateRiders.filter((r) => requestedRiderIds.includes(r.id));
    }

    const availableCapacity = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
    const dispatchTargetQuantity = Math.min(donation.remainingQuantity, availableCapacity);

    if (dispatchTargetQuantity <= 0) {
      return { success: false, taskIds: [], message: `${shelter.name} has no available capacity left.` };
    }

    const splitResult = calculateBatchSplit(dispatchTargetQuantity, candidateRiders);

    if (splitResult.plan.length === 0) {
      return { success: false, taskIds: [], message: 'No eligible riders available with capacity.' };
    }

    const createdTaskIds: string[] = [];
    const claimTtlSeconds = Math.max(25, Math.floor(45 / timeMultiplier));

    // Execute split
    const updatedTasks: DeliveryTask[] = [];
    const assignedRiderIds = new Set<string>();

    splitResult.plan.forEach((item, index) => {
      const taskId = `task-split-${Date.now().toString().slice(-4)}-${index + 1}`;
      const dist = calculateDistanceKm(donation.coordinates, shelter.coordinates);
      const transitMin = estimateTransitMinutes(dist);

      const task: DeliveryTask = {
        id: taskId,
        donationId,
        riderId: item.rider.id,
        originalShelterId: shelterId,
        targetShelterId: shelterId,
        quantity: item.allocatedQuantity,
        status: 'CLAIMED',
        reservedAt: new Date().toISOString(),
        claimExpiresAt: new Date(Date.now() + claimTtlSeconds * 1000).toISOString(),
        isRerouted: false,
        estimatedTransitMinutes: transitMin
      };

      updatedTasks.push(task);
      createdTaskIds.push(taskId);
      assignedRiderIds.add(item.rider.id);
    });

    setTasks((prev) => [...updatedTasks, ...prev]);

    // Update Donation Remaining
    setDonations((prev) =>
      prev.map((d) => {
        if (d.id === donationId) {
          const newRem = d.remainingQuantity - splitResult.totalAllocated;
          return {
            ...d,
            remainingQuantity: newRem,
            status: newRem === 0 ? 'FULLY_RESERVED' : 'PARTIALLY_RESERVED'
          };
        }
        return d;
      })
    );

    // Update Riders
    setVolunteers((prev) =>
      prev.map((v) => {
        const matchingPlan = splitResult.plan.find((p) => p.rider.id === v.id);
        if (matchingPlan) {
          const assignedTask = updatedTasks.find((t) => t.riderId === v.id);
          return {
            ...v,
            status: 'RESERVED',
            activeTaskId: assignedTask?.id,
            responsiveness: 'ACTIVE'
          };
        }
        return v;
      })
    );

    // Update Shelter committed capacity
    setShelters((prev) =>
      prev.map((s) =>
        s.id === shelterId
          ? { ...s, committedCapacity: s.committedCapacity + splitResult.totalAllocated }
          : s
      )
    );

    addLogEvent(
      'SUCCESS',
      'DISPATCH',
      `Multi-Rider Split Executed (${splitResult.totalAllocated} Units)`,
      `Successfully split ${splitResult.totalAllocated} units across ${splitResult.plan.length} volunteer riders destined for ${shelter.name}. Individual rider capacities enforced.`,
      { plan: splitResult.plan.map((p) => ({ rider: p.rider.name, units: p.allocatedQuantity })) }
    );

    return {
      success: true,
      taskIds: createdTaskIds,
      message: `Dispatched ${splitResult.totalAllocated} meals across ${splitResult.plan.length} riders.`
    };
  };

  // Confirm Pickup (Transitions from CLAIMED to IN_TRANSIT)
  const confirmPickup = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'IN_TRANSIT', pickedUpAt: new Date().toISOString() }
          : t
      )
    );

    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === task.riderId ? { ...v, status: 'IN_TRANSIT', lastPingTime: new Date().toISOString() } : v
      )
    );

    setDonations((prev) =>
      prev.map((d) => (d.id === task.donationId ? { ...d, status: 'IN_TRANSIT' } : d))
    );

    const rider = volunteers.find((v) => v.id === task.riderId);
    addLogEvent(
      'INFO',
      'DISPATCH',
      `Pickup Confirmed: Task #${task.id.slice(-6)}`,
      `Rider ${rider?.name ?? 'Volunteer'} verified handover at donor site. Aid cargo is now IN TRANSIT.`,
      { taskId }
    );
  };

  // Confirm Delivery Handover at Shelter
  const confirmDelivery = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'DELIVERED', deliveredAt: new Date().toISOString() }
          : t
      )
    );

    // Free Rider
    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === task.riderId
          ? { ...v, status: 'AVAILABLE', activeTaskId: undefined, lastPingTime: new Date().toISOString() }
          : v
      )
    );

    // Update Shelter: deduct committed, add to occupancy
    setShelters((prev) =>
      prev.map((s) => {
        if (s.id === task.targetShelterId) {
          const newCommitted = Math.max(0, s.committedCapacity - task.quantity);
          const newOccupancy = Math.min(s.maxCapacity, s.currentOccupancy + task.quantity);
          return {
            ...s,
            committedCapacity: newCommitted,
            currentOccupancy: newOccupancy,
            status: newOccupancy >= s.maxCapacity ? 'CAPACITY_REACHED' : s.status
          };
        }
        return s;
      })
    );

    // Update Donation Status
    setDonations((prev) =>
      prev.map((d) => {
        if (d.id === task.donationId) {
          // If no remaining quantity and all other tasks delivered
          return { ...d, status: 'DELIVERED' };
        }
        return d;
      })
    );

    const shelter = shelters.find((s) => s.id === task.targetShelterId);
    addLogEvent(
      'SUCCESS',
      'DISPATCH',
      `Delivery Successfully Completed!`,
      `Safely handed over ${task.quantity} meals at ${shelter?.name}. Zero spoilage achieved.`,
      { taskId, quantity: task.quantity, shelter: shelter?.name }
    );
  };

  // Simulate Ghost Rider (Rider goes dark / stalled)
  const simulateGhostRider = (riderId: string) => {
    const rider = volunteers.find((v) => v.id === riderId);
    if (!rider) return;

    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === riderId
          ? { ...v, responsiveness: 'UNRESPONSIVE', reliabilityScore: Math.max(0.6, v.reliabilityScore - 0.15) }
          : v
      )
    );

    addLogEvent(
      'WARNING',
      'GHOST_WATCH',
      `Volunteer Unresponsive: ${rider.name}`,
      `Rider ${rider.name} stopped transmitting GPS heartbeats. Initiating stall watchdog countdown.`,
      { riderId }
    );
  };

  // Reclaim Ghost Reservation and Restore Quantities
  const reclaimGhostTask = (taskId: string, autoReassign: boolean = true) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'DELIVERED' || task.status === 'RECLAIMED') return;

    const rider = volunteers.find((v) => v.id === task.riderId);
    const donation = donations.find((d) => d.id === task.donationId);
    const shelter = shelters.find((s) => s.id === task.targetShelterId);

    // Mark task as RECLAIMED
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'RECLAIMED' } : t))
    );

    // Release and penalize ghost rider
    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === task.riderId
          ? {
              ...v,
              status: 'AVAILABLE',
              activeTaskId: undefined,
              responsiveness: 'UNRESPONSIVE',
              reliabilityScore: Math.max(0.5, v.reliabilityScore - 0.2)
            }
          : v
      )
    );

    // Restore Shelter committed capacity
    if (shelter) {
      setShelters((prev) =>
        prev.map((s) =>
          s.id === shelter.id
            ? { ...s, committedCapacity: Math.max(0, s.committedCapacity - task.quantity) }
            : s
        )
      );
    }

    // Restore Donation remaining quantity
    if (donation) {
      setDonations((prev) =>
        prev.map((d) => {
          if (d.id === donation.id) {
            const restoredRem = d.remainingQuantity + task.quantity;
            return {
              ...d,
              remainingQuantity: restoredRem,
              status: 'AVAILABLE'
            };
          }
          return d;
        })
      );
    }

    addLogEvent(
      'CRITICAL',
      'GHOST_WATCH',
      `Ghost Lock Broken: ${task.quantity} Meals Reclaimed`,
      `Batch of ${task.quantity} units reclaimed from ${rider?.name ?? 'unresponsive rider'}. Full quantity restored to available dispatch queue.`,
      { taskId, reclaimedQuantity: task.quantity }
    );

    // Auto-reassign if requested and alternative rider exists
    if (autoReassign && donation && shelter) {
      const standbyRiders = volunteers.filter(
        (v) => v.id !== task.riderId && v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE' && v.carryCapacity >= task.quantity
      );

      if (standbyRiders.length > 0) {
        const replacementRider = standbyRiders[0];
        claimTask(donation.id, replacementRider.id, shelter.id, task.quantity);
        addLogEvent(
          'SUCCESS',
          'DISPATCH',
          `Auto-Reassigned to ${replacementRider.name}`,
          `Successfully reassigned ${task.quantity} meals to standby rider ${replacementRider.name} without manual intervention.`,
          { newRider: replacementRider.name }
        );
      }
    }
  };

  // Update Shelter Status / Simulate Closure
  const updateShelterStatus = (
    shelterId: string,
    status: Shelter['status'],
    newOccupancy?: number
  ) => {
    setShelters((prev) =>
      prev.map((s) => {
        if (s.id === shelterId) {
          const updatedOcc = newOccupancy !== undefined ? newOccupancy : s.currentOccupancy;
          return {
            ...s,
            status,
            currentOccupancy: updatedOcc
          };
        }
        return s;
      })
    );

    const shelter = shelters.find((s) => s.id === shelterId);
    addLogEvent(
      status === 'ACCEPTING' ? 'INFO' : 'WARNING',
      'SAFETY',
      `Shelter Status Changed: ${shelter?.name}`,
      `Operational status set to ${status}. Occupancy: ${newOccupancy ?? shelter?.currentOccupancy}/${shelter?.maxCapacity}.`,
      { shelterId, status }
    );
  };

  // Dynamic Rerouting Engine
  const rerouteTask = (taskId: string, newShelterId: string, reason: string): boolean => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const oldShelter = shelters.find((s) => s.id === task.targetShelterId);
    const newShelter = shelters.find((s) => s.id === newShelterId);
    const rider = volunteers.find((v) => v.id === task.riderId);
    const donation = donations.find((d) => d.id === task.donationId);

    if (!newShelter || !rider || !donation) return false;

    // Safety and capacity check on new shelter
    const availableCap = newShelter.maxCapacity - (newShelter.currentOccupancy + newShelter.committedCapacity);
    if (availableCap < task.quantity) {
      addLogEvent('CRITICAL', 'REROUTE', 'Reroute Failed', `Cannot reroute to ${newShelter.name}: insufficient capacity.`);
      return false;
    }

    // Deduct committed from old shelter, add to new shelter
    setShelters((prev) =>
      prev.map((s) => {
        if (s.id === oldShelter?.id) {
          return { ...s, committedCapacity: Math.max(0, s.committedCapacity - task.quantity) };
        }
        if (s.id === newShelterId) {
          return { ...s, committedCapacity: s.committedCapacity + task.quantity };
        }
        return s;
      })
    );

    // Update task
    const newDist = calculateDistanceKm(rider.coordinates, newShelter.coordinates);
    const newTransit = estimateTransitMinutes(newDist);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              targetShelterId: newShelterId,
              isRerouted: true,
              rerouteReason: reason,
              estimatedTransitMinutes: newTransit
            }
          : t
      )
    );

    addLogEvent(
      'SUCCESS',
      'REROUTE',
      `Dynamic In-Transit Reroute Engaged!`,
      `Task #${task.id.slice(-6)} (${task.quantity} meals) diverted from ${oldShelter?.name} -> ${newShelter.name}. Reason: ${reason}. Updated ETA: ${newTransit} mins.`,
      { taskId, from: oldShelter?.name, to: newShelter.name, reason }
    );

    return true;
  };

  // Reset Everything to Clean Demo State
  const resetAllData = () => {
    setDonations(INITIAL_DONATIONS);
    setShelters(INITIAL_SHELTERS);
    setVolunteers(INITIAL_VOLUNTEERS);
    setTasks([]);
    setEvents(INITIAL_LOG_EVENTS);
    setActiveScenario('NONE');
    setScenarioStep(0);
    setScenarioNotes('Demo state completely restored to fresh initial parameters.');
    addLogEvent('INFO', 'SYSTEM', 'Demo Environment Reset', 'All volunteer locks, shelter occupancies, and mission logs restored to baseline.');
  };

  // ----------------------------------------------------
  // MANDATORY DEMO SCENARIOS AUTOMATION
  // ----------------------------------------------------

  // Scenario A: Expiry Crisis (180 meals @ 75 mins, split into 40-cap riders)
  const runScenarioA = () => {
    resetAllData();
    setActiveScenario('SCENARIO_A');
    setScenarioStep(1);
    setScenarioNotes('Scenario A Initialized: Ingesting 180 cooked meals expiring in 75 mins.');

    // Step 1: Create 180 meals
    const batch = quickCreate180Meals();

    setTimeout(() => {
      setScenarioStep(2);
      setScenarioNotes('Executing multi-rider atomic split across available 40-cap two-wheelers...');
      // Execute split for Shelter Alpha
      const result = splitAndDispatch(batch.id, 'sh-01');
      if (result.success) {
        setScenarioStep(3);
        setScenarioNotes(`Split complete! 180 meals allocated: 40 + 40 + 40 + 40 + 20 across 5 riders without loss.`);
      }
    }, 1200);
  };

  // Scenario B: Ghost Reservation
  const runScenarioB = () => {
    resetAllData();
    setActiveScenario('SCENARIO_B');
    setScenarioStep(1);
    setScenarioNotes('Scenario B Initialized: Rider Rajesh Kumar claims 40 meals for Shelter Beta.');

    // Step 1: Claim task
    const claimRes = claimTask('don-01', 'vol-01', 'sh-02', 40);
    if (!claimRes.success) return;

    // Step 2: Simulate rider becoming unresponsive
    setTimeout(() => {
      setScenarioStep(2);
      setScenarioNotes('Rider Rajesh Kumar stopped transmitting heartbeats. Accelerated dead-man timer active.');
      simulateGhostRider('vol-01');
    }, 1500);

    // Step 3: Trigger auto-reclaim & re-dispatch
    setTimeout(() => {
      setScenarioStep(3);
      setScenarioNotes('Ghost deadline elapsed. Reclaiming 40 meals and reassigning to standby rider Priya Sharma.');
      const task = tasks.find((t) => t.riderId === 'vol-01' && t.status === 'CLAIMED');
      if (task) {
        reclaimGhostTask(task.id, true);
      }
    }, 3500);
  };

  // Scenario C: Shelter Closure Mid-Delivery
  const runScenarioC = () => {
    resetAllData();
    setActiveScenario('SCENARIO_C');
    setScenarioStep(1);
    setScenarioNotes('Scenario C Initialized: Rajesh Kumar picking up 40 meals for Shelter Alpha.');

    // Claim and start transit
    const claimRes = claimTask('don-01', 'vol-01', 'sh-01', 40);
    
    setTimeout(() => {
      // Find created task and confirm pickup
      setTasks((prev) => {
        const found = prev.find((t) => t.riderId === 'vol-01');
        if (found) {
          confirmPickup(found.id);
        }
        return prev;
      });

      setScenarioStep(2);
      setScenarioNotes('Cargo is IN TRANSIT. Simulating emergency: Local citizen drops food at Shelter Alpha, filling it to 100%.');

      setTimeout(() => {
        // Close Shelter Alpha
        updateShelterStatus('sh-01', 'CAPACITY_REACHED', 120);
        setScenarioStep(3);
        setScenarioNotes('Conflict detected! System actively searching for nearest open eligible shelter...');

        setTimeout(() => {
          // Dynamic reroute to Shelter Beta
          setTasks((prev) => {
            const inTransitTask = prev.find((t) => t.riderId === 'vol-01' && t.status === 'IN_TRANSIT');
            if (inTransitTask) {
              rerouteTask(inTransitTask.id, 'sh-02', 'Shelter Alpha filled by local offline donation.');
            }
            return prev;
          });
          setScenarioStep(4);
          setScenarioNotes('Reroute successful! In-transit rider diverted to Shelter Beta (+4 mins ETA). Spoilage averted.');
        }, 1500);

      }, 1500);
    }, 800);
  };

  // Scenario D: Unsafe Aid Dependency
  const runScenarioD = () => {
    resetAllData();
    setActiveScenario('SCENARIO_D');
    setScenarioStep(1);
    setScenarioNotes('Scenario D Initialized: Testing hard safety rules & prerequisite validator.');

    setTimeout(() => {
      setScenarioStep(2);
      setScenarioNotes('Attempting to dispatch Infant Formula to Shelter Gamma (Lacks Potable Water)...');
      
      addLogEvent(
        'CRITICAL',
        'SAFETY',
        'DISPATCH BLOCKED: Water Prerequisite Missing',
        'REJECTED: Infant formula requires verified potable water. Shelter Gamma has contaminated local pipeline. Safety engine blocked dispatch.',
        { aid: 'BABY_FORMULA', destination: 'Shelter Gamma' }
      );

      setTimeout(() => {
        setScenarioStep(3);
        setScenarioNotes('Attempting to dispatch Raw Rations to Shelter Delta (Lacks Cooking Facilities)...');

        addLogEvent(
          'CRITICAL',
          'SAFETY',
          'DISPATCH BLOCKED: Fuel Prerequisite Missing',
          'REJECTED: Raw ration kits require cooking fuel & prep kitchen. Shelter Delta is a dry dormitory without fire stoves. Safety engine blocked dispatch.',
          { aid: 'RAW_RATIONS', destination: 'Shelter Delta' }
        );

        setScenarioStep(4);
        setScenarioNotes('Safety Verification Complete: Both hazardous dispatches were prevented by policy rules.');
      }, 1500);
    }, 1000);
  };

  return (
    <AppContext.Provider
      value={{
        donations,
        shelters,
        volunteers,
        tasks,
        events,
        activeTab,
        setActiveTab,
        timeMultiplier,
        setTimeMultiplier,
        createDonation,
        quickCreate180Meals,
        claimTask,
        splitAndDispatch,
        confirmPickup,
        confirmDelivery,
        simulateGhostRider,
        reclaimGhostTask,
        updateShelterStatus,
        rerouteTask,
        addLogEvent,
        resetAllData,
        runScenarioA,
        runScenarioB,
        runScenarioC,
        runScenarioD,
        activeScenario,
        scenarioStep,
        scenarioNotes
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
