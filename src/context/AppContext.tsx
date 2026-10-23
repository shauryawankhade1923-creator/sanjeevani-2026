import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { 
  Donation, 
  Shelter, 
  Volunteer, 
  DeliveryTask, 
  LogEvent, 
  EventSeverity,
  AidCategory,
  RiderStatus,
  DelayReport,
  PlatformUser,
  PlatformConfig,
  UserRole,
  UserStatus
} from '../types';
import { 
  getFreshInitialDonations, 
  getFreshInitialShelters, 
  getFreshInitialVolunteers, 
  getFreshInitialLogEvents,
  getFreshInitialUsers,
  getFreshInitialConfig
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
  selectedDonationId: string;
  setSelectedDonationId: (id: string) => void;
  timeMultiplier: number;
  setTimeMultiplier: (multiplier: number) => void;
  
  // Rider Session & Workflow
  currentRiderId: string;
  setCurrentRiderId: (id: string) => void;
  updateRiderDutyStatus: (riderId: string, status: 'AVAILABLE' | 'OFFLINE') => { success: boolean; message: string };
  acceptAssignment: (taskId: string, riderId: string) => { success: boolean; message: string };
  declineAssignment: (taskId: string, riderId: string, reason?: string) => { success: boolean; message: string };
  confirmArrivalAtPickup: (taskId: string) => { success: boolean; message: string };
  reportDelayOrProblem: (taskId: string, delay: { reason: DelayReport['reason']; notes: string; estimatedDelayMinutes: number }) => { success: boolean; message: string };
  confirmArrivalAtDestination: (taskId: string) => { success: boolean; message: string };
  completeDeliveryWithProof: (taskId: string, proof: { recipientName: string; notes?: string; photoUrl?: string }) => { success: boolean; message: string };

  // Shelter Dashboard & Recipient Organization
  currentShelterId: string;
  setCurrentShelterId: (id: string) => void;
  updateShelterSettings: (shelterId: string, settings: Partial<Shelter>) => { success: boolean; message: string };
  reportShelterStatusChange: (shelterId: string, status: Shelter['status'], reason?: string) => { success: boolean; message: string };
  confirmShelterDeliveryReceipt: (taskId: string, proof: { receivedQuantity: number; discrepancyReason?: string; recipientName: string; notes?: string; photoUrl?: string }) => { success: boolean; message: string };

  // Admin & Operational Governance
  users: PlatformUser[];
  config: PlatformConfig;
  addUser: (userData: Omit<PlatformUser, 'id' | 'registeredAt'>) => { success: boolean; message: string };
  updateUserStatus: (userId: string, status: UserStatus) => { success: boolean; message: string };
  updateUserRole: (userId: string, role: UserRole) => { success: boolean; message: string };
  deleteUser: (userId: string) => { success: boolean; message: string };
  updatePlatformConfig: (newConfig: Partial<PlatformConfig>) => { success: boolean; message: string };

  // Actions
  createDonation: (data: Omit<Donation, 'id' | 'remainingQuantity' | 'status' | 'createdAt'>) => Donation;
  updateDonation: (donationId: string, updates: Partial<Donation>) => { success: boolean; message: string };
  cancelDonation: (donationId: string, reason?: string) => { success: boolean; message: string };
  quickCreate180Meals: () => Donation;
  claimTask: (donationId: string, riderId: string, shelterId: string, quantity: number) => { success: boolean; error?: string };
  splitAndDispatch: (donationId: string, shelterId: string, requestedRiderIds?: string[]) => { success: boolean; taskIds: string[]; message: string };
  smartMultiShelterDispatch: (donationId: string) => { success: boolean; taskIds: string[]; message: string };
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
  runScenarioShelterFull: () => void;

  // Active Scenario Progress
  activeScenario: 'NONE' | 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D';
  scenarioStep: number;
  scenarioNotes: string;
  
  // Active Reroute Conflict Alert (if a shelter closes mid-transit)
  pendingRerouteTask: DeliveryTask | null;
  dismissPendingReroute: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sanjeevani_platform_state_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load state or use fresh dynamic seed
  const [donations, setDonations] = useState<Donation[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_donations`);
      if (saved) {
        const parsed: Donation[] = JSON.parse(saved);
        // If saved donations have all expired, re-seed with fresh baseline
        const hasActive = parsed.some(d => getRemainingShelfLifeMinutes(d.expiresAt) > 0);
        if (hasActive) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved donations:', e);
    }
    return getFreshInitialDonations();
  });

  const [shelters, setShelters] = useState<Shelter[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_shelters`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved shelters:', e);
    }
    return getFreshInitialShelters();
  });

  const [volunteers, setVolunteers] = useState<Volunteer[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_volunteers`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved volunteers:', e);
    }
    return getFreshInitialVolunteers();
  });

  const [tasks, setTasks] = useState<DeliveryTask[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved tasks:', e);
    }
    return [];
  });

  const [events, setEvents] = useState<LogEvent[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_events`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved events:', e);
    }
    return getFreshInitialLogEvents();
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedDonationId, setSelectedDonationId] = useState<string>('don-01');
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1);
  const [activeScenario, setActiveScenario] = useState<AppContextType['activeScenario']>('NONE');
  const [scenarioStep, setScenarioStep] = useState<number>(0);
  const [scenarioNotes, setScenarioNotes] = useState<string>('');
  const [pendingRerouteTask, setPendingRerouteTask] = useState<DeliveryTask | null>(null);
  const [currentRiderId, setCurrentRiderId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_currentRiderId`);
      if (saved) return saved;
    } catch (e) {}
    return 'vol-01'; // Default: Ramesh Kumar
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_currentRiderId`, currentRiderId);
    } catch (e) {}
  }, [currentRiderId]);

  const [currentShelterId, setCurrentShelterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_currentShelterId`);
      if (saved) return saved;
    } catch (e) {}
    return 'sh-01'; // Default: Shelter Alpha
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_currentShelterId`, currentShelterId);
    } catch (e) {}
  }, [currentShelterId]);

  const [users, setUsers] = useState<PlatformUser[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_users`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getFreshInitialUsers();
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_users`, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  const [config, setConfig] = useState<PlatformConfig>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_config`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getFreshInitialConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_config`, JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  // References to eliminate React closure staleness in timeouts and intervals
  const donationsRef = useRef(donations);
  const sheltersRef = useRef(shelters);
  const volunteersRef = useRef(volunteers);
  const tasksRef = useRef(tasks);
  const scenarioTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => { donationsRef.current = donations; }, [donations]);
  useEffect(() => { sheltersRef.current = shelters; }, [shelters]);
  useEffect(() => { volunteersRef.current = volunteers; }, [volunteers]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_donations`, JSON.stringify(donations));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_shelters`, JSON.stringify(shelters));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_volunteers`, JSON.stringify(volunteers));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_tasks`, JSON.stringify(tasks));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_events`, JSON.stringify(events));
    } catch (e) {
      console.warn('Error saving to localStorage:', e);
    }
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
    setEvents((prev) => [newEvent, ...prev.slice(0, 150)]);
  };

  // Automated Watchdog ticker (Ghost detection & Expiry check)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentTasks = tasksRef.current;
      const currentVolunteers = volunteersRef.current;
      const currentDonations = donationsRef.current;

      // 1. Check Ghost Reservations for CLAIMED tasks
      currentTasks.forEach((task) => {
        if (task.status === 'CLAIMED') {
          const deadline = new Date(task.claimExpiresAt).getTime();
          if (now >= deadline) {
            const rider = currentVolunteers.find((v) => v.id === task.riderId);
            if (rider && rider.status === 'RESERVED') {
              addLogEvent(
                'CRITICAL',
                'GHOST_WATCH',
                'Ghost Reservation Timeout Detected',
                `Volunteer ${rider.name} failed to confirm pickup for Task #${task.id.slice(-6)} within deadline. Auto-reclaiming reserved payload to prevent spoilage.`,
                { taskId: task.id, riderId: rider.id }
              );
              reclaimGhostTask(task.id, true);
            }
          }
        }
      });

      // 2. Check Spoilage for available donations
      currentDonations.forEach((donation) => {
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
              `Batch "${donation.itemTitle}" has crossed its safe consumption deadline. Locked from dispatch to enforce health standards.`,
              { donationId: donation.id }
            );
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeMultiplier]);

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
    setSelectedDonationId(newDonation.id);

    addLogEvent(
      'INFO',
      'DONATION',
      'New Donation Registered',
      `${data.donorName} registered ${data.totalQuantity} units of ${data.itemTitle}. Expiry set to ${new Date(data.expiresAt).toLocaleTimeString()}.`,
      { donationId: newDonation.id }
    );
    return newDonation;
  };

  // Update Donation (Allowed only prior to transit / delivery)
  const updateDonation = (donationId: string, updates: Partial<Donation>): { success: boolean; message: string } => {
    const d = donationsRef.current.find(item => item.id === donationId);
    if (!d) return { success: false, message: 'Donation not found in records.' };

    if (d.status === 'IN_TRANSIT' || d.status === 'DELIVERED') {
      return { 
        success: false, 
        message: `Modification blocked: Donation is currently in ${d.status.toLowerCase()} status. Core payload and routing are locked.` 
      };
    }

    setDonations((prev) => prev.map((item) => {
      if (item.id === donationId) {
        return { ...item, ...updates };
      }
      return item;
    }));

    addLogEvent(
      'INFO',
      'DONATION',
      'Donation Record Updated',
      `Donor modified parameters for batch #${donationId.slice(-6)} (${d.itemTitle}).`,
      { donationId, updates }
    );

    return { success: true, message: 'Donation parameters successfully updated.' };
  };

  // Cancel Donation (Guards against silently dumping in-transit cargo)
  const cancelDonation = (donationId: string, reason?: string): { success: boolean; message: string } => {
    const d = donationsRef.current.find(item => item.id === donationId);
    if (!d) return { success: false, message: 'Donation not found.' };

    // Strict validation: Prevent removing cargo already in transit
    const relatedTasks = tasksRef.current.filter((t) => t.donationId === donationId);
    const inTransitTask = relatedTasks.find((t) => t.status === 'IN_TRANSIT' || t.status === 'PICKED_UP');
    
    if (inTransitTask || d.status === 'IN_TRANSIT') {
      return { 
        success: false, 
        message: 'Security Violation: Shipment is actively in transit with a field courier. Immediate cancellation blocked to prevent aid abandonment. Please notify municipal operations.' 
      };
    }
    
    if (d.status === 'DELIVERED') {
      return { success: false, message: 'Donation has already been fulfilled and delivered to beneficiaries.' };
    }

    // Release any reserved/claimed tasks and free up couriers & committed shelter space
    const claimedTasks = relatedTasks.filter((t) => t.status === 'CLAIMED');
    if (claimedTasks.length > 0) {
      const riderIdsToRelease = claimedTasks.map((t) => t.riderId);
      
      setVolunteers((prev) => prev.map((v) => {
        if (riderIdsToRelease.includes(v.id)) {
          return { ...v, status: 'AVAILABLE', activeTaskId: undefined };
        }
        return v;
      }));

      claimedTasks.forEach((t) => {
        setShelters((prev) => prev.map((s) => {
          if (s.id === t.targetShelterId) {
            return { ...s, committedCapacity: Math.max(0, s.committedCapacity - t.quantity) };
          }
          return s;
        }));
      });

      setTasks((prev) => prev.map((t) => {
        if (t.donationId === donationId && t.status === 'CLAIMED') {
          return { ...t, status: 'CANCELLED' };
        }
        return t;
      }));
    }

    setDonations((prev) => prev.map((item) => {
      if (item.id === donationId) {
        return { 
          ...item, 
          status: 'CANCELLED', 
          remainingQuantity: 0,
          cancelledReason: reason || 'Donor retracted donation before courier departure.' 
        };
      }
      return item;
    }));

    addLogEvent(
      'WARNING',
      'DONATION',
      'Donation Cancelled by Donor',
      `Donation #${donationId.slice(-6)} retracted. Any pre-departure courier reservations have been safely released. Reason: ${reason || 'Donor cancellation.'}`,
      { donationId, reason }
    );

    return { success: true, message: 'Donation successfully cancelled. Courier reservations released.' };
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
      storageRequirement: 'Insulated hot carriers; consume within 75 minutes',
      specialInstructions: 'Separated into insulated meal trays of 10. Direct gate pickup.',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString()
    };

    setDonations((prev) => [quickDonation, ...prev]);
    setSelectedDonationId(quickDonation.id);

    addLogEvent(
      'WARNING',
      'DONATION',
      'High-Urgency 180-Meal Batch Created',
      `Registered 180 cooked meals with 75 minutes remaining safe shelf life. Multi-rider batch splitting armed.`,
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
    const currentDonations = donationsRef.current;
    const currentVolunteers = volunteersRef.current;
    const currentShelters = sheltersRef.current;

    const donation = currentDonations.find((d) => d.id === donationId);
    const rider = currentVolunteers.find((v) => v.id === riderId);
    const shelter = currentShelters.find((s) => s.id === shelterId);

    if (!donation || !rider || !shelter) {
      return { success: false, error: 'Invalid donation, rider, or shelter reference' };
    }

    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }

    if (quantity > donation.remainingQuantity) {
      return { success: false, error: `Requested quantity (${quantity}) exceeds remaining available (${donation.remainingQuantity})` };
    }

    if (quantity > rider.carryCapacity) {
      return { success: false, error: `Quantity (${quantity}) exceeds rider carrying capacity (${rider.carryCapacity})` };
    }

    if (rider.status !== 'AVAILABLE') {
      return { success: false, error: `Rider ${rider.name} is already assigned to an active delivery.` };
    }

    const availableShelterCap = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
    if (quantity > availableShelterCap) {
      return { success: false, error: `Shelter capacity exceeded. Only ${availableShelterCap} space available.` };
    }

    // Dynamic claim TTL (30s accelerated)
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

  // Multi-Rider Atomic Batch Splitting Dispatch for a selected shelter
  const splitAndDispatch = (
    donationId: string,
    shelterId: string,
    requestedRiderIds?: string[]
  ): { success: boolean; taskIds: string[]; message: string } => {
    const currentDonations = donationsRef.current;
    const currentShelters = sheltersRef.current;
    const currentVolunteers = volunteersRef.current;

    const donation = currentDonations.find((d) => d.id === donationId);
    const shelter = currentShelters.find((s) => s.id === shelterId);

    if (!donation || !shelter) {
      return { success: false, taskIds: [], message: 'Donation or shelter not found' };
    }

    if (donation.remainingQuantity <= 0) {
      return { success: false, taskIds: [], message: 'No remaining quantity to dispatch in this batch.' };
    }

    let candidateRiders = currentVolunteers.filter(
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
      return { success: false, taskIds: [], message: 'No eligible riders available with free carrying capacity.' };
    }

    const createdTaskIds: string[] = [];
    const claimTtlSeconds = Math.max(25, Math.floor(45 / timeMultiplier));
    const newTasks: DeliveryTask[] = [];

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

      newTasks.push(task);
      createdTaskIds.push(taskId);
    });

    setTasks((prev) => [...newTasks, ...prev]);

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

    setVolunteers((prev) =>
      prev.map((v) => {
        const assignedTask = newTasks.find((t) => t.riderId === v.id);
        if (assignedTask) {
          return {
            ...v,
            status: 'RESERVED',
            activeTaskId: assignedTask.id,
            responsiveness: 'ACTIVE'
          };
        }
        return v;
      })
    );

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
      message: `Dispatched ${splitResult.totalAllocated} meals across ${splitResult.plan.length} riders to ${shelter.name}.`
    };
  };

  // Smart Multi-Shelter & Fleet Dispatch (Dispatches all 180 units across shelters and riders)
  const smartMultiShelterDispatch = (donationId: string): { success: boolean; taskIds: string[]; message: string } => {
    const donation = donationsRef.current.find((d) => d.id === donationId);
    if (!donation || donation.remainingQuantity <= 0) {
      return { success: false, taskIds: [], message: 'No remaining quantity to dispatch in this batch.' };
    }

    const availableRiders = [...volunteersRef.current.filter(v => v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE')];
    const eligibleShelters = [...sheltersRef.current.filter(s => s.status === 'ACCEPTING')];

    let remainingToDispatch = donation.remainingQuantity;
    const allCreatedTasks: DeliveryTask[] = [];
    const claimTtlSeconds = Math.max(30, Math.floor(45 / timeMultiplier));

    // Shelter Alpha (target: up to 100) & Shelter Beta (target: up to 80)
    for (const shelter of eligibleShelters) {
      if (remainingToDispatch <= 0 || availableRiders.length === 0) break;

      const shelterAvailableSpace = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
      if (shelterAvailableSpace <= 0) continue;

      const targetForShelter = Math.min(remainingToDispatch, shelterAvailableSpace);
      const split = calculateBatchSplit(targetForShelter, availableRiders);

      if (split.plan.length > 0) {
        split.plan.forEach((item, idx) => {
          const taskId = `task-smart-${Date.now().toString().slice(-4)}-${allCreatedTasks.length + 1}`;
          const dist = calculateDistanceKm(donation.coordinates, shelter.coordinates);
          const transitMin = estimateTransitMinutes(dist);

          const task: DeliveryTask = {
            id: taskId,
            donationId,
            riderId: item.rider.id,
            originalShelterId: shelter.id,
            targetShelterId: shelter.id,
            quantity: item.allocatedQuantity,
            status: 'CLAIMED',
            reservedAt: new Date().toISOString(),
            claimExpiresAt: new Date(Date.now() + claimTtlSeconds * 1000).toISOString(),
            isRerouted: false,
            estimatedTransitMinutes: transitMin
          };

          allCreatedTasks.push(task);
          // Remove used rider from available pool
          const rIndex = availableRiders.findIndex(r => r.id === item.rider.id);
          if (rIndex >= 0) availableRiders.splice(rIndex, 1);
        });

        remainingToDispatch -= split.totalAllocated;
      }
    }

    if (allCreatedTasks.length === 0) {
      return { success: false, taskIds: [], message: 'No compatible capacity found across shelters and fleet.' };
    }

    const totalAllocated = allCreatedTasks.reduce((acc, t) => acc + t.quantity, 0);

    setTasks((prev) => [...allCreatedTasks, ...prev]);

    setDonations((prev) =>
      prev.map((d) => {
        if (d.id === donationId) {
          const newRem = Math.max(0, d.remainingQuantity - totalAllocated);
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
      prev.map((v) => {
        const assignedTask = allCreatedTasks.find((t) => t.riderId === v.id);
        if (assignedTask) {
          return { ...v, status: 'RESERVED', activeTaskId: assignedTask.id, responsiveness: 'ACTIVE' };
        }
        return v;
      })
    );

    setShelters((prev) =>
      prev.map((s) => {
        const allocatedToShelter = allCreatedTasks
          .filter((t) => t.targetShelterId === s.id)
          .reduce((acc, t) => acc + t.quantity, 0);
        if (allocatedToShelter > 0) {
          return { ...s, committedCapacity: s.committedCapacity + allocatedToShelter };
        }
        return s;
      })
    );

    addLogEvent(
      'SUCCESS',
      'DISPATCH',
      `Smart Multi-Shelter Knapsack Dispatch (${totalAllocated} Units)`,
      `Successfully allocated ${totalAllocated} units across ${allCreatedTasks.length} riders to multiple verified shelters without loss or capacity violation.`,
      { taskCount: allCreatedTasks.length, totalAllocated }
    );

    return {
      success: true,
      taskIds: allCreatedTasks.map(t => t.id),
      message: `Successfully dispatched ${totalAllocated} meals across ${allCreatedTasks.length} riders.`
    };
  };

  // Courier Duty Status Toggle
  const updateRiderDutyStatus = (riderId: string, status: 'AVAILABLE' | 'OFFLINE'): { success: boolean; message: string } => {
    const rider = volunteersRef.current.find(v => v.id === riderId);
    if (!rider) return { success: false, message: 'Courier not found in registry.' };

    if (status === 'OFFLINE') {
      const activeTask = tasksRef.current.find(
        t => t.riderId === riderId && (t.status === 'CLAIMED' || t.status === 'ACCEPTED' || t.status === 'ARRIVED_PICKUP' || t.status === 'IN_TRANSIT' || t.status === 'ARRIVED_DESTINATION')
      );
      if (activeTask) {
        return {
          success: false,
          message: 'Cannot go OFFLINE while an active assignment or delivery is in progress. Please complete or reassign your delivery first.'
        };
      }
    }

    setVolunteers(prev =>
      prev.map(v => v.id === riderId ? { 
        ...v, 
        status, 
        responsiveness: status === 'AVAILABLE' ? 'ACTIVE' : v.responsiveness, 
        lastPingTime: new Date().toISOString() 
      } : v)
    );

    addLogEvent(
      'INFO',
      'SYSTEM',
      `Courier Duty Status Changed`,
      `Courier ${rider.name} marked duty status as ${status === 'AVAILABLE' ? 'ONLINE (Ready for Dispatches)' : 'OFFLINE (Unavailable)'}.`,
      { riderId, status }
    );

    return {
      success: true,
      message: `Duty status updated to ${status === 'AVAILABLE' ? 'ONLINE' : 'OFFLINE'}.`
    };
  };

  // Courier Accept Assignment
  const acceptAssignment = (taskId: string, riderId: string): { success: boolean; message: string } => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Assignment not found.' };

    if (task.riderId !== riderId) {
      return { success: false, message: 'Unauthorized: This assignment is reserved for another courier.' };
    }

    if (task.status !== 'CLAIMED') {
      return { success: false, message: `Task is already ${task.status}. Cannot accept again.` };
    }

    const rider = volunteersRef.current.find(v => v.id === riderId);
    const donation = donationsRef.current.find(d => d.id === task.donationId);

    // Provide 20-minute operational window for pickup upon explicit acceptance
    const claimExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'ACCEPTED',
              acceptedAt: new Date().toISOString(),
              claimExpiresAt
            }
          : t
      )
    );

    setVolunteers(prev =>
      prev.map(v =>
        v.id === riderId
          ? { ...v, status: 'RESERVED', activeTaskId: taskId, responsiveness: 'ACTIVE', lastPingTime: new Date().toISOString() }
          : v
      )
    );

    addLogEvent(
      'INFO',
      'DISPATCH',
      `Assignment Accepted by Courier`,
      `Courier ${rider?.name ?? riderId} accepted Task #${task.id.slice(-6)} (${task.quantity} meals from ${donation?.donorName ?? 'Donor'}). Proceeding to collection.`,
      { taskId, riderId }
    );

    return { success: true, message: 'Assignment accepted! Please proceed to pickup location.' };
  };

  // Courier Decline Assignment (Triggers Coordinator Reassignment Workflow)
  const declineAssignment = (taskId: string, riderId: string, reason?: string): { success: boolean; message: string } => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Assignment not found.' };

    if (task.riderId !== riderId) {
      return { success: false, message: 'Unauthorized: This assignment does not belong to you.' };
    }

    if (task.status !== 'CLAIMED' && task.status !== 'ACCEPTED') {
      return { success: false, message: `Cannot decline a delivery that is already ${task.status}.` };
    }

    const rider = volunteersRef.current.find(v => v.id === riderId);

    // Release donation reservation
    setDonations(prev =>
      prev.map(d => {
        if (d.id === task.donationId) {
          const newRem = d.remainingQuantity + task.quantity;
          return {
            ...d,
            remainingQuantity: newRem,
            status: newRem === d.totalQuantity ? 'AVAILABLE' : 'PARTIALLY_RESERVED'
          };
        }
        return d;
      })
    );

    // Release committed shelter capacity
    setShelters(prev =>
      prev.map(s => {
        if (s.id === task.targetShelterId) {
          return {
            ...s,
            committedCapacity: Math.max(0, s.committedCapacity - task.quantity)
          };
        }
        return s;
      })
    );

    // Cancel task
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'CANCELLED',
              rerouteReason: `Declined by courier: ${reason || 'Courier declined assignment'}`
            }
          : t
      )
    );

    // Free rider
    setVolunteers(prev =>
      prev.map(v =>
        v.id === riderId
          ? { ...v, status: 'AVAILABLE', activeTaskId: undefined }
          : v
      )
    );

    addLogEvent(
      'WARNING',
      'DISPATCH',
      `Assignment Declined by Courier`,
      `Courier ${rider?.name ?? riderId} declined Task #${task.id.slice(-6)} (${task.quantity} meals). Released back to coordinator urgent queue. Reason: ${reason || 'Courier unavailable'}.`,
      { taskId, riderId, reason }
    );

    return {
      success: true,
      message: 'Assignment declined. Payload released back to coordinator queue for reassignment.'
    };
  };

  // Courier Confirm Arrival at Pickup
  const confirmArrivalAtPickup = (taskId: string): { success: boolean; message: string } => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Assignment not found.' };

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'ARRIVED_PICKUP',
              arrivedPickupAt: new Date().toISOString()
            }
          : t
      )
    );

    setVolunteers(prev =>
      prev.map(v =>
        v.id === task.riderId ? { ...v, lastPingTime: new Date().toISOString(), responsiveness: 'ACTIVE' } : v
      )
    );

    addLogEvent(
      'INFO',
      'DISPATCH',
      `Courier Arrived at Pickup`,
      `Courier reached pickup location for Task #${task.id.slice(-6)}. Ready for handover verification.`,
      { taskId }
    );

    return { success: true, message: 'Arrival at donor pickup logged. Please verify handover and cargo condition.' };
  };

  // Confirm Pickup Handover & Departure
  const confirmPickup = (taskId: string) => {
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { 
              ...t, 
              status: 'IN_TRANSIT', 
              pickedUpAt: t.pickedUpAt || new Date().toISOString(),
              inTransitAt: new Date().toISOString() 
            }
          : t
      )
    );

    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === task.riderId ? { ...v, status: 'IN_TRANSIT', lastPingTime: new Date().toISOString(), responsiveness: 'ACTIVE' } : v
      )
    );

    setDonations((prev) =>
      prev.map((d) => (d.id === task.donationId ? { ...d, status: 'IN_TRANSIT' } : d))
    );

    const rider = volunteersRef.current.find((v) => v.id === task.riderId);
    addLogEvent(
      'INFO',
      'DISPATCH',
      `Pickup Confirmed: Task #${task.id.slice(-6)}`,
      `Courier ${rider?.name ?? 'Volunteer'} verified handover at donor site. Aid cargo (${task.quantity} units) is now IN TRANSIT.`,
      { taskId }
    );
  };

  // Courier Report Delay or Operational Problem
  const reportDelayOrProblem = (
    taskId: string,
    delay: { reason: DelayReport['reason']; notes: string; estimatedDelayMinutes: number }
  ): { success: boolean; message: string } => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Assignment not found.' };

    const delayReport: DelayReport = {
      reason: delay.reason,
      notes: delay.notes,
      reportedAt: new Date().toISOString(),
      estimatedDelayMinutes: delay.estimatedDelayMinutes
    };

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              delayReport,
              estimatedTransitMinutes: t.estimatedTransitMinutes + delay.estimatedDelayMinutes
            }
          : t
      )
    );

    const rider = volunteersRef.current.find(v => v.id === task.riderId);
    const reasonLabels = {
      TRAFFIC: 'Traffic / Congestion',
      VEHICLE_BREAKDOWN: 'Vehicle Breakdown',
      PICKUP_UNAVAILABLE: 'Donor Unreachable / Pickup Failure',
      DESTINATION_UNAVAILABLE: 'Shelter Unreachable / Closed',
      BAD_WEATHER: 'Inclement Weather',
      OTHER: 'Field Impediment'
    };
    const label = reasonLabels[delay.reason] || delay.reason;

    const severity: EventSeverity = (delay.reason === 'DESTINATION_UNAVAILABLE' || delay.reason === 'VEHICLE_BREAKDOWN' || delay.reason === 'PICKUP_UNAVAILABLE')
      ? 'CRITICAL'
      : 'WARNING';

    addLogEvent(
      severity,
      'DISPATCH',
      `Courier Incident Report: ${label}`,
      `Courier ${rider?.name ?? 'Rider'} reported ${label} on Task #${task.id.slice(-6)} (+${delay.estimatedDelayMinutes}m delay). Notes: "${delay.notes}". Relief coordinator alerted.`,
      { taskId, delayReport }
    );

    return {
      success: true,
      message: `Incident reported (+${delay.estimatedDelayMinutes} mins). Relief coordinator has been notified.`
    };
  };

  // Courier Confirm Arrival at Destination
  const confirmArrivalAtDestination = (taskId: string): { success: boolean; message: string } => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Assignment not found.' };

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'ARRIVED_DESTINATION',
              arrivedDestinationAt: new Date().toISOString()
            }
          : t
      )
    );

    setVolunteers(prev =>
      prev.map(v =>
        v.id === task.riderId ? { ...v, lastPingTime: new Date().toISOString(), responsiveness: 'ACTIVE' } : v
      )
    );

    addLogEvent(
      'INFO',
      'DISPATCH',
      `Courier Arrived at Destination Shelter`,
      `Courier reached destination shelter for Task #${task.id.slice(-6)}. Ready for receiver verification and proof submission.`,
      { taskId }
    );

    return { success: true, message: 'Arrived at shelter! Please obtain receiver signoff and submit delivery proof.' };
  };

  // Complete Delivery with Proof Verification
  const completeDeliveryWithProof = (
    taskId: string,
    proof: { recipientName: string; notes?: string; photoUrl?: string }
  ): { success: boolean; message: string } => {
    if (!proof.recipientName || proof.recipientName.trim().length === 0) {
      return { success: false, message: 'Shelter representative or receiver name is mandatory to complete delivery.' };
    }

    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Assignment not found.' };

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'DELIVERED',
              deliveredAt: new Date().toISOString(),
              proofRecipientName: proof.recipientName.trim(),
              proofNotes: proof.notes?.trim(),
              proofPhotoUrl: proof.photoUrl
            }
          : t
      )
    );

    setVolunteers(prev =>
      prev.map(v =>
        v.id === task.riderId
          ? { ...v, status: 'AVAILABLE', activeTaskId: undefined, lastPingTime: new Date().toISOString(), responsiveness: 'ACTIVE' }
          : v
      )
    );

    setShelters(prev =>
      prev.map(s => {
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

    setDonations(prev =>
      prev.map(d => {
        if (d.id === task.donationId) {
          return { ...d, status: 'DELIVERED' };
        }
        return d;
      })
    );

    const shelter = sheltersRef.current.find(s => s.id === task.targetShelterId);
    const rider = volunteersRef.current.find(v => v.id === task.riderId);

    addLogEvent(
      'SUCCESS',
      'DISPATCH',
      `Delivery Proof Verified & Handover Complete`,
      `Courier ${rider?.name ?? 'Rider'} delivered ${task.quantity} units to ${shelter?.name ?? 'Shelter'}. Received by ${proof.recipientName}. Zero spoilage recorded!`,
      { taskId, quantity: task.quantity, recipientName: proof.recipientName, shelter: shelter?.name }
    );

    return {
      success: true,
      message: `Delivery completed successfully! Handover verified by ${proof.recipientName}.`
    };
  };

  // Confirm Delivery Handover
  const confirmDelivery = (taskId: string) => {
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'DELIVERED', deliveredAt: new Date().toISOString() }
          : t
      )
    );

    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === task.riderId
          ? { ...v, status: 'AVAILABLE', activeTaskId: undefined, lastPingTime: new Date().toISOString() }
          : v
      )
    );

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

    // If all tasks for this donation are delivered and 0 remaining
    setDonations((prev) =>
      prev.map((d) => {
        if (d.id === task.donationId) {
          return { ...d, status: 'DELIVERED' };
        }
        return d;
      })
    );

    const shelter = sheltersRef.current.find((s) => s.id === task.targetShelterId);
    addLogEvent(
      'SUCCESS',
      'DISPATCH',
      `Delivery Successfully Completed!`,
      `Safely handed over ${task.quantity} meals at ${shelter?.name}. Zero spoilage recorded.`,
      { taskId, quantity: task.quantity, shelter: shelter?.name }
    );
  };

  // Simulate Ghost Rider
  const simulateGhostRider = (riderId: string) => {
    const rider = volunteersRef.current.find((v) => v.id === riderId);
    if (!rider) return;

    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === riderId
          ? { ...v, responsiveness: 'UNRESPONSIVE', reliabilityScore: Math.max(0.6, v.reliabilityScore - 0.15) }
          : v
      )
    );

    // Accelerate the claim deadline on their active task so the watchdog expires immediately or in a few seconds
    const activeTask = tasksRef.current.find((t) => t.riderId === riderId && t.status === 'CLAIMED');
    if (activeTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTask.id
            ? { ...t, claimExpiresAt: new Date(Date.now() + 3000).toISOString() }
            : t
        )
      );
    }

    addLogEvent(
      'WARNING',
      'GHOST_WATCH',
      `Volunteer Unresponsive: ${rider.name}`,
      `Rider ${rider.name} stopped transmitting GPS heartbeats. Accelerated dead-man stall watchdog active (auto-reclaim in 3s).`,
      { riderId }
    );
  };

  // Reclaim Ghost Task with full state consistency
  const reclaimGhostTask = (taskId: string, autoReassign: boolean = true) => {
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task || task.status === 'DELIVERED' || task.status === 'RECLAIMED') return;

    const rider = volunteersRef.current.find((v) => v.id === task.riderId);
    const donation = donationsRef.current.find((d) => d.id === task.donationId);
    const shelter = sheltersRef.current.find((s) => s.id === task.targetShelterId);

    // 1. Mark task as RECLAIMED
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'RECLAIMED' } : t))
    );

    // 2. Release & penalize rider
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

    // 3. Release Shelter committed capacity
    if (shelter) {
      setShelters((prev) =>
        prev.map((s) =>
          s.id === shelter.id
            ? { ...s, committedCapacity: Math.max(0, s.committedCapacity - task.quantity) }
            : s
        )
      );
    }

    // 4. Restore Donation remaining quantity
    let restoredQuantity = task.quantity;
    if (donation) {
      setDonations((prev) =>
        prev.map((d) => {
          if (d.id === donation.id) {
            const newRem = d.remainingQuantity + task.quantity;
            return {
              ...d,
              remainingQuantity: newRem,
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

    // 5. Auto-reassign to standby rider if requested
    if (autoReassign && donation && shelter) {
      const currentStandbyRiders = volunteersRef.current.filter(
        (v) => v.id !== task.riderId && v.status === 'AVAILABLE' && v.responsiveness === 'ACTIVE' && v.carryCapacity >= task.quantity
      );

      if (currentStandbyRiders.length > 0) {
        const replacementRider = currentStandbyRiders[0];
        const claimTtl = Math.max(25, Math.floor(45 / timeMultiplier));
        const reassignedTaskId = `task-reassign-${Date.now().toString().slice(-4)}`;

        const reassignedTask: DeliveryTask = {
          id: reassignedTaskId,
          donationId: donation.id,
          riderId: replacementRider.id,
          originalShelterId: shelter.id,
          targetShelterId: shelter.id,
          quantity: task.quantity,
          status: 'CLAIMED',
          reservedAt: new Date().toISOString(),
          claimExpiresAt: new Date(Date.now() + claimTtl * 1000).toISOString(),
          isRerouted: false,
          estimatedTransitMinutes: estimateTransitMinutes(calculateDistanceKm(replacementRider.coordinates, shelter.coordinates))
        };

        setTasks((prev) => [reassignedTask, ...prev]);

        setDonations((prev) =>
          prev.map((d) =>
            d.id === donation.id
              ? { ...d, remainingQuantity: Math.max(0, d.remainingQuantity - task.quantity), status: 'PARTIALLY_RESERVED' }
              : d
          )
        );

        setVolunteers((prev) =>
          prev.map((v) =>
            v.id === replacementRider.id
              ? { ...v, status: 'RESERVED', activeTaskId: reassignedTaskId, responsiveness: 'ACTIVE' }
              : v
          )
        );

        setShelters((prev) =>
          prev.map((s) =>
            s.id === shelter.id
              ? { ...s, committedCapacity: s.committedCapacity + task.quantity }
              : s
          )
        );

        addLogEvent(
          'SUCCESS',
          'DISPATCH',
          `Auto-Reassigned to ${replacementRider.name}`,
          `Successfully reassigned ${task.quantity} meals to standby rider ${replacementRider.name} without manual administrator delay.`,
          { newRider: replacementRider.name, taskId: reassignedTaskId }
        );
      }
    }
  };

  // Update Shelter Status & Detect Mid-Transit Conflict
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

    const shelter = sheltersRef.current.find((s) => s.id === shelterId);
    addLogEvent(
      status === 'ACCEPTING' ? 'INFO' : 'WARNING',
      'SAFETY',
      `Shelter Status Changed: ${shelter?.name}`,
      `Operational status set to ${status}. Occupancy: ${newOccupancy ?? shelter?.currentOccupancy}/${shelter?.maxCapacity}.`,
      { shelterId, status }
    );

    // Check if any in-transit delivery is heading to this now-closed/full shelter
    if (status === 'CLOSED' || status === 'CAPACITY_REACHED') {
      const inTransitTasks = tasksRef.current.filter(
        (t) => t.targetShelterId === shelterId && t.status === 'IN_TRANSIT'
      );

      if (inTransitTasks.length > 0) {
        const affectedTask = inTransitTasks[0];
        setPendingRerouteTask(affectedTask);
        addLogEvent(
          'CRITICAL',
          'REROUTE',
          'IN-TRANSIT CONFLICT DETECTED!',
          `Task #${affectedTask.id.slice(-6)} (${affectedTask.quantity} meals) is currently IN TRANSIT to ${shelter?.name}, which is now ${status}. Immediate rerouting required!`,
          { taskId: affectedTask.id, shelter: shelter?.name }
        );
      }
    }
  };

  const dismissPendingReroute = () => {
    setPendingRerouteTask(null);
  };

  // Shelter Settings Update
  const updateShelterSettings = (shelterId: string, settings: Partial<Shelter>): { success: boolean; message: string } => {
    const shelter = sheltersRef.current.find(s => s.id === shelterId);
    if (!shelter) return { success: false, message: 'Shelter not found.' };

    setShelters(prev =>
      prev.map(s => {
        if (s.id === shelterId) {
          const updated = { ...s, ...settings };
          if (updated.currentOccupancy > updated.maxCapacity) {
            updated.currentOccupancy = updated.maxCapacity;
          }
          return updated;
        }
        return s;
      })
    );

    addLogEvent(
      'INFO',
      'SHELTER',
      `Facility Settings Updated: ${shelter.name}`,
      `Infrastructure parameters updated: Max Cap: ${settings.maxCapacity ?? shelter.maxCapacity}, Water: ${settings.hasCleanWater !== undefined ? settings.hasCleanWater : shelter.hasCleanWater}, Kitchen: ${settings.hasCookingFuel !== undefined ? settings.hasCookingFuel : shelter.hasCookingFuel}, Refrig: ${settings.hasRefrigeration !== undefined ? settings.hasRefrigeration : shelter.hasRefrigeration}.`,
      { shelterId, updates: settings }
    );

    return { success: true, message: 'Organization facility settings saved successfully.' };
  };

  // Report Shelter Status Change (Temporary Closure, Full Capacity, or Resumed)
  const reportShelterStatusChange = (shelterId: string, status: Shelter['status'], reason?: string): { success: boolean; message: string } => {
    const shelter = sheltersRef.current.find(s => s.id === shelterId);
    if (!shelter) return { success: false, message: 'Shelter not found.' };

    setShelters(prev =>
      prev.map(s => s.id === shelterId ? { ...s, status } : s)
    );

    // If status is CLOSED or CAPACITY_REACHED, find in-transit tasks targeting this shelter
    if (status === 'CLOSED' || status === 'CAPACITY_REACHED') {
      const endangeredTasks = tasksRef.current.filter(
        t => t.targetShelterId === shelterId && (t.status === 'IN_TRANSIT' || t.status === 'CLAIMED' || t.status === 'ACCEPTED' || t.status === 'ARRIVED_PICKUP')
      );

      if (endangeredTasks.length > 0) {
        setPendingRerouteTask(endangeredTasks[0]);
      }

      addLogEvent(
        'CRITICAL',
        'SHELTER',
        `Shelter Status Reported: ${status} (${shelter.name})`,
        `Shelter coordinator declared ${status}. Reason: "${reason || 'Operational contingency'}". Coordinator intervention triggered for incoming aid batches.`,
        { shelterId, status, reason }
      );

      return {
        success: true,
        message: `Shelter marked ${status}. Coordinator alerted and incoming cargo rerouting armed.`
      };
    }

    addLogEvent(
      'INFO',
      'SHELTER',
      `Shelter Status Resumed: ${status} (${shelter.name})`,
      `Shelter resumed ${status} intake status. Ready for incoming aid dispatches.`,
      { shelterId, status }
    );

    return {
      success: true,
      message: `Operating status updated to ${status}.`
    };
  };

  // Shelter Confirms Delivery Receipt with Discrepancy Recording
  const confirmShelterDeliveryReceipt = (
    taskId: string,
    proof: {
      receivedQuantity: number;
      discrepancyReason?: string;
      recipientName: string;
      notes?: string;
      photoUrl?: string;
    }
  ): { success: boolean; message: string } => {
    if (!proof.recipientName || proof.recipientName.trim().length === 0) {
      return { success: false, message: 'Receiver / Supervisor name is mandatory to confirm delivery.' };
    }

    if (proof.receivedQuantity < 0) {
      return { success: false, message: 'Received quantity cannot be negative.' };
    }

    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Delivery task not found.' };

    const expectedQuantity = task.quantity;
    const actualQuantity = Number(proof.receivedQuantity);
    const hasDiscrepancy = actualQuantity !== expectedQuantity;

    // 1. Update task
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'DELIVERED',
              deliveredAt: new Date().toISOString(),
              actualQuantityReceived: actualQuantity,
              discrepancyReason: hasDiscrepancy ? (proof.discrepancyReason || 'Quantity discrepancy recorded at receiver intake') : undefined,
              proofRecipientName: proof.recipientName.trim(),
              proofNotes: proof.notes?.trim(),
              proofPhotoUrl: proof.photoUrl
            }
          : t
      )
    );

    // 2. Free rider
    setVolunteers(prev =>
      prev.map(v =>
        v.id === task.riderId
          ? { ...v, status: 'AVAILABLE', activeTaskId: undefined, lastPingTime: new Date().toISOString(), responsiveness: 'ACTIVE' }
          : v
      )
    );

    // 3. Update shelter inventory strictly with actual received quantity
    setShelters(prev =>
      prev.map(s => {
        if (s.id === task.targetShelterId) {
          const newCommitted = Math.max(0, s.committedCapacity - expectedQuantity);
          const newOccupancy = Math.min(s.maxCapacity, s.currentOccupancy + actualQuantity);
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

    // 4. Update donation status if all tasks are delivered
    setDonations(prev =>
      prev.map(d => {
        if (d.id === task.donationId) {
          return { ...d, status: 'DELIVERED' };
        }
        return d;
      })
    );

    const shelter = sheltersRef.current.find(s => s.id === task.targetShelterId);
    const donation = donationsRef.current.find(d => d.id === task.donationId);

    if (hasDiscrepancy) {
      addLogEvent(
        'WARNING',
        'DISPATCH',
        `Discrepancy Flagged at Receiver Intake (${shelter?.name})`,
        `Expected ${expectedQuantity} units of ${donation?.itemTitle || 'cargo'}, but received ${actualQuantity} units. Shortage: ${expectedQuantity - actualQuantity} units. Reason: "${proof.discrepancyReason || 'Transport damage'}". Signoff: ${proof.recipientName}.`,
        { taskId, expected: expectedQuantity, actual: actualQuantity, reason: proof.discrepancyReason }
      );

      return {
        success: true,
        message: `Delivery confirmed with discrepancy flagged (${actualQuantity}/${expectedQuantity} units). Inventory updated.`
      };
    }

    addLogEvent(
      'SUCCESS',
      'DISPATCH',
      `Aid Handover Verified: ${shelter?.name}`,
      `Successfully received and verified full batch of ${actualQuantity} units of ${donation?.itemTitle || 'Aid Cargo'}. Signoff: ${proof.recipientName}. Added to shelter inventory.`,
      { taskId, quantity: actualQuantity, shelter: shelter?.name }
    );

    return {
      success: true,
      message: `Successfully confirmed receipt of ${actualQuantity} units. Inventory and capacity updated.`
    };
  };

  // Dynamic Rerouting Engine
  const rerouteTask = (taskId: string, newShelterId: string, reason: string): boolean => {
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task) return false;

    const oldShelter = sheltersRef.current.find((s) => s.id === task.targetShelterId);
    const newShelter = sheltersRef.current.find((s) => s.id === newShelterId);
    const rider = volunteersRef.current.find((v) => v.id === task.riderId);
    const donation = donationsRef.current.find((d) => d.id === task.donationId);

    if (!newShelter || !rider || !donation) return false;

    const availableCap = newShelter.maxCapacity - (newShelter.currentOccupancy + newShelter.committedCapacity);
    if (availableCap < task.quantity) {
      addLogEvent('CRITICAL', 'REROUTE', 'Reroute Failed', `Cannot reroute to ${newShelter.name}: insufficient space (${availableCap} free / ${task.quantity} needed).`);
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

    setPendingRerouteTask(null);

    addLogEvent(
      'SUCCESS',
      'REROUTE',
      `Dynamic In-Transit Reroute Engaged!`,
      `Task #${task.id.slice(-6)} (${task.quantity} meals) diverted from ${oldShelter?.name} -> ${newShelter.name}. Reason: ${reason}. Updated ETA: ${newTransit} mins.`,
      { taskId, from: oldShelter?.name, to: newShelter.name, reason }
    );

    return true;
  };

  // Admin User & Governance Actions
  const addUser = (userData: Omit<PlatformUser, 'id' | 'registeredAt'>): { success: boolean; message: string } => {
    if (!userData.name || !userData.email) {
      return { success: false, message: 'Name and email are mandatory fields.' };
    }

    const newUser: PlatformUser = {
      ...userData,
      id: `usr-${Date.now().toString().slice(-4)}`,
      registeredAt: new Date().toISOString()
    };

    setUsers(prev => [newUser, ...prev]);

    addLogEvent(
      'INFO',
      'SYSTEM',
      `New Platform User Registered`,
      `Administrator provisioned account for ${userData.name} (${userData.role}) at ${userData.organization}.`,
      { userId: newUser.id, role: userData.role }
    );

    return { success: true, message: `User ${userData.name} created successfully.` };
  };

  const updateUserStatus = (userId: string, status: UserStatus): { success: boolean; message: string } => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));

    addLogEvent(
      'WARNING',
      'SYSTEM',
      `User Account Status Modified`,
      `User ${user.name} (${user.email}) status changed to ${status}.`,
      { userId, status }
    );

    return { success: true, message: `Account status updated to ${status}.` };
  };

  const updateUserRole = (userId: string, role: UserRole): { success: boolean; message: string } => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));

    addLogEvent(
      'WARNING',
      'SYSTEM',
      `User Role Permissions Modified`,
      `User ${user.name} role changed to ${role} by Administrator.`,
      { userId, role }
    );

    return { success: true, message: `Role updated to ${role}.` };
  };

  const deleteUser = (userId: string): { success: boolean; message: string } => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    if (user.role === 'SUPER_ADMIN' && users.filter(u => u.role === 'SUPER_ADMIN').length <= 1) {
      return { success: false, message: 'Cannot delete the only Super Administrator account.' };
    }

    setUsers(prev => prev.filter(u => u.id !== userId));

    addLogEvent(
      'WARNING',
      'SYSTEM',
      `User Account Revoked`,
      `Account for ${user.name} (${user.email}) deleted by Administrator.`,
      { userId }
    );

    return { success: true, message: `User account deleted.` };
  };

  const updatePlatformConfig = (newConfig: Partial<PlatformConfig>): { success: boolean; message: string } => {
    setConfig(prev => ({ ...prev, ...newConfig }));

    addLogEvent(
      'INFO',
      'SYSTEM',
      `Platform Configuration Updated`,
      `System operational parameters modified (Watchdog TTL: ${newConfig.claimTtlSeconds ?? config.claimTtlSeconds}s, Safety Matrix: ${newConfig.enforceSafetyDependencies !== undefined ? newConfig.enforceSafetyDependencies : config.enforceSafetyDependencies}).`,
      { updates: newConfig }
    );

    return { success: true, message: 'Platform system parameters saved successfully.' };
  };

  // Reset Everything Cleanly
  const resetAllData = () => {
    // Clear any pending timeouts
    scenarioTimeoutsRef.current.forEach(clearTimeout);
    scenarioTimeoutsRef.current = [];

    const freshDonations = getFreshInitialDonations();
    const freshShelters = getFreshInitialShelters();
    const freshVolunteers = getFreshInitialVolunteers();
    const freshEvents = getFreshInitialLogEvents();
    const freshUsers = getFreshInitialUsers();
    const freshConfig = getFreshInitialConfig();

    setDonations(freshDonations);
    setShelters(freshShelters);
    setVolunteers(freshVolunteers);
    setTasks([]);
    setEvents(freshEvents);
    setUsers(freshUsers);
    setConfig(freshConfig);
    setSelectedDonationId(freshDonations[0].id);
    setActiveScenario('NONE');
    setScenarioStep(0);
    setScenarioNotes('Demo state completely restored to fresh initial parameters.');
    setPendingRerouteTask(null);

    addLogEvent('INFO', 'SYSTEM', 'Demo Environment Reset', 'All volunteer locks, shelter commitments, and simulation states restored to fresh baseline.');
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

    const batch = quickCreate180Meals();

    const t1 = setTimeout(() => {
      setScenarioStep(2);
      setScenarioNotes('Executing multi-rider atomic split across available 40-cap two-wheelers and verified shelters...');
      
      // Execute multi-shelter split
      const result = smartMultiShelterDispatch(batch.id);
      if (result.success) {
        setScenarioStep(3);
        setScenarioNotes(`Split complete! 180 meals allocated: 40 + 40 + 20 (Shelter Alpha) + 40 + 40 (Shelter Beta) across 5 riders without loss.`);
      }
    }, 1200);

    scenarioTimeoutsRef.current.push(t1);
  };

  // Scenario B: Ghost Reservation
  const runScenarioB = () => {
    resetAllData();
    setActiveScenario('SCENARIO_B');
    setScenarioStep(1);
    setScenarioNotes('Scenario B Initialized: Rider Rajesh Kumar claims 40 meals for Shelter Beta.');

    const claimRes = claimTask('don-01', 'vol-01', 'sh-02', 40);
    if (!claimRes.success) return;

    const t1 = setTimeout(() => {
      setScenarioStep(2);
      setScenarioNotes('Rider Rajesh Kumar stopped transmitting heartbeats. Accelerated dead-man stall watchdog active.');
      simulateGhostRider('vol-01');

      const t2 = setTimeout(() => {
        setScenarioStep(3);
        setScenarioNotes('Ghost deadline elapsed. Reclaiming 40 meals and reassigning to standby rider Priya Sharma.');
        
        const currentTasks = tasksRef.current;
        const task = currentTasks.find((t) => t.riderId === 'vol-01' && t.status === 'CLAIMED');
        if (task) {
          reclaimGhostTask(task.id, true);
        }
      }, 3200);

      scenarioTimeoutsRef.current.push(t2);
    }, 1200);

    scenarioTimeoutsRef.current.push(t1);
  };

  // Scenario C: Shelter Closure Mid-Delivery
  const runScenarioC = () => {
    resetAllData();
    setActiveScenario('SCENARIO_C');
    setScenarioStep(1);
    setScenarioNotes('Scenario C Initialized: Rajesh Kumar picking up 40 meals for Shelter Alpha.');

    const claimRes = claimTask('don-01', 'vol-01', 'sh-01', 40);

    const t1 = setTimeout(() => {
      // Find created task and confirm pickup
      const currentTasks = tasksRef.current;
      const found = currentTasks.find((t) => t.riderId === 'vol-01');
      if (found) {
        confirmPickup(found.id);
      }

      setScenarioStep(2);
      setScenarioNotes('Cargo is IN TRANSIT. Simulating emergency: Local citizen drops food at Shelter Alpha, filling it to 100%.');

      const t2 = setTimeout(() => {
        // Close Shelter Alpha
        updateShelterStatus('sh-01', 'CAPACITY_REACHED', 150);
        setScenarioStep(3);
        setScenarioNotes('Conflict detected! System actively searching for nearest open eligible shelter...');

        const t3 = setTimeout(() => {
          // Dynamic reroute to Shelter Beta
          const inTransitTask = tasksRef.current.find((t) => t.riderId === 'vol-01' && t.status === 'IN_TRANSIT');
          if (inTransitTask) {
            rerouteTask(inTransitTask.id, 'sh-02', 'Shelter Alpha filled by local offline donation.');
          }
          setScenarioStep(4);
          setScenarioNotes('Reroute successful! In-transit rider diverted to Shelter Beta (+4 mins ETA). Spoilage averted.');
        }, 1500);

        scenarioTimeoutsRef.current.push(t3);
      }, 1500);

      scenarioTimeoutsRef.current.push(t2);
    }, 800);

    scenarioTimeoutsRef.current.push(t1);
  };

  // Scenario D: Unsafe Aid Dependency
  const runScenarioD = () => {
    resetAllData();
    setActiveScenario('SCENARIO_D');
    setScenarioStep(1);
    setScenarioNotes('Scenario D Initialized: Testing hard safety rules & prerequisite validator.');

    const t1 = setTimeout(() => {
      setScenarioStep(2);
      setScenarioNotes('Attempting to dispatch Infant Formula to Shelter Gamma (Lacks Potable Water)...');
      
      addLogEvent(
        'CRITICAL',
        'SAFETY',
        'DISPATCH BLOCKED: Water Prerequisite Missing',
        'REJECTED: Infant formula requires verified potable water. Shelter Gamma has contaminated local pipeline. Safety engine blocked dispatch.',
        { aid: 'BABY_FORMULA', destination: 'Shelter Gamma' }
      );

      const t2 = setTimeout(() => {
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
        setScenarioNotes('Safety Verification Complete: Both hazardous dispatches were prevented by policy rules without changing any shelter or donation quantities.');
      }, 1500);

      scenarioTimeoutsRef.current.push(t2);
    }, 1000);

    scenarioTimeoutsRef.current.push(t1);
  };

  // Scenario: Shelter Becomes Full (Capacity Saturation & Dynamic Spillover)
  const runScenarioShelterFull = () => {
    resetAllData();
    setActiveScenario('SCENARIO_C');
    setScenarioStep(1);
    setScenarioNotes('Scenario Initialized: Shelter Alpha reaches 100% capacity (150/150). System shifts to backup shelters.');

    updateShelterStatus('sh-01', 'CAPACITY_REACHED', 150);
    
    addLogEvent(
      'WARNING',
      'SHELTER',
      'Shelter Alpha Capacity Saturated',
      'Occupancy reached 150/150 meals. All incoming surplus diverted to secondary recipient (Shelter Beta).'
    );
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
        currentRiderId,
        setCurrentRiderId,
        updateRiderDutyStatus,
        acceptAssignment,
        declineAssignment,
        confirmArrivalAtPickup,
        reportDelayOrProblem,
        confirmArrivalAtDestination,
        completeDeliveryWithProof,
        currentShelterId,
        setCurrentShelterId,
        updateShelterSettings,
        reportShelterStatusChange,
        confirmShelterDeliveryReceipt,
        users,
        config,
        addUser,
        updateUserStatus,
        updateUserRole,
        deleteUser,
        updatePlatformConfig,
        selectedDonationId,
        setSelectedDonationId,
        timeMultiplier,
        setTimeMultiplier,
        createDonation,
        updateDonation,
        cancelDonation,
        quickCreate180Meals,
        claimTask,
        splitAndDispatch,
        smartMultiShelterDispatch,
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
        runScenarioShelterFull,
        activeScenario,
        scenarioStep,
        scenarioNotes,
        pendingRerouteTask,
        dismissPendingReroute
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
