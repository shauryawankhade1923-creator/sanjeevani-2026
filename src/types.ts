export type AidCategory = 
  | 'COOKED_MEALS'
  | 'BABY_FORMULA'
  | 'RAW_RATIONS'
  | 'COLD_CHAIN_MEDS'
  | 'PACKAGED_FOOD';

export type DonationStatus = 
  | 'AVAILABLE'
  | 'PARTIALLY_RESERVED'
  | 'FULLY_RESERVED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'EXPIRED'
  | 'CANCELLED';

export type RiderStatus = 
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_TRANSIT'
  | 'OFFLINE';

export type RiderResponsiveness = 
  | 'ACTIVE'
  | 'STALLED'
  | 'UNRESPONSIVE';

export type ShelterStatus = 
  | 'ACCEPTING'
  | 'CAPACITY_REACHED'
  | 'CLOSED'
  | 'RESTRICTED';

export type TaskStatus = 
  | 'CLAIMED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DIVERTED'
  | 'DELIVERED'
  | 'RECLAIMED'
  | 'CANCELLED';

export interface Coordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface Donation {
  id: string;
  donorName: string;
  donorPhone: string;
  organizationName?: string;
  organizationType?: 'RESTAURANT' | 'HOTEL' | 'CATERER' | 'COLLEGE_CANTEEN' | 'SUPERMARKET' | 'COMMUNITY_KITCHEN' | 'OTHER';
  itemTitle: string;
  category: AidCategory;
  foodType?: 'VEGETARIAN' | 'NON_VEGETARIAN' | 'VEGAN' | 'DRY_RATION' | 'INFANT_CARE' | 'COLD_MED';
  unit?: 'meals' | 'packs' | 'kg' | 'boxes' | 'units';
  totalQuantity: number;
  remainingQuantity: number;
  pickupLocation: string;
  pickupWindow?: string;
  coordinates: Coordinates;
  preparedAt: string; // ISO string
  expiresAt: string; // ISO string
  storageRequirement: string;
  temperatureRequirement?: 'AMBIENT' | 'HEATED_60C' | 'COLD_2_8C' | 'FROZEN';
  requiresCleanWater?: boolean;
  requiresCooking?: boolean;
  allergenNotes?: string;
  photoUrl?: string;
  specialInstructions: string;
  status: DonationStatus;
  cancelledReason?: string;
  createdAt: string;
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'SCOOTER' | 'MOTORBIKE' | 'BICYCLE' | 'VAN';
  carryCapacity: number; // max units (meals)
  zone: string;
  status: RiderStatus;
  responsiveness: RiderResponsiveness;
  coordinates: Coordinates;
  activeTaskId?: string;
  reliabilityScore: number; // 0.0 to 1.0
  lastPingTime: string;
}

export interface Shelter {
  id: string;
  name: string;
  locationName: string;
  coordinates: Coordinates;
  maxCapacity: number;
  currentOccupancy: number; // current meals or beds in use
  committedCapacity: number; // incoming in-transit shipments
  acceptsCategories: AidCategory[];
  hasCleanWater: boolean;
  hasCookingFuel: boolean;
  hasRefrigeration: boolean;
  status: ShelterStatus;
  contactPerson: string;
  contactPhone: string;
  specialRestrictions?: string;
}

export interface DeliveryTask {
  id: string;
  donationId: string;
  riderId: string;
  originalShelterId: string;
  targetShelterId: string;
  quantity: number;
  status: TaskStatus;
  reservedAt: string;
  claimExpiresAt: string; // deadline before ghost reclaim
  pickedUpAt?: string;
  deliveredAt?: string;
  isRerouted: boolean;
  rerouteReason?: string;
  estimatedTransitMinutes: number;
}

export type EventSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface LogEvent {
  id: string;
  timestamp: string;
  severity: EventSeverity;
  category: 'DONATION' | 'DISPATCH' | 'GHOST_WATCH' | 'REROUTE' | 'SAFETY' | 'SYSTEM';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  failures: string[];
  warnings: string[];
}

export interface DispatchScoreBreakdown {
  shelterId: string;
  shelterName: string;
  isEligible: boolean;
  ineligibilityReasons: string[];
  distanceKm: number;
  transitEtaMinutes: number;
  feasibleWithinExpiry: boolean;
  remainingShelfLifeMinutes: number;
  urgencyScore: number;
  compositeScore: number;
  explanation: string;
}
