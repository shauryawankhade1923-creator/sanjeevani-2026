import { Donation, Shelter, Volunteer, LogEvent, PlatformUser, PlatformConfig } from '../types';

export const getFreshInitialDonations = (): Donation[] => [
  {
    id: 'don-01',
    donorName: 'The Grand Regal Banquet Hall',
    donorPhone: '+91 98765 43210',
    itemTitle: '180 Cooked Vegetable Pulao & Curry Meals',
    category: 'COOKED_MEALS',
    totalQuantity: 180,
    remainingQuantity: 180,
    pickupLocation: 'Gate 2, Grand Regal Convention Centre, MG Road',
    coordinates: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place Area' },
    preparedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // 75 mins remaining
    storageRequirement: 'Insulated hot carriers, consume within 75 mins',
    specialInstructions: 'Separated into insulated meal trays of 10. Direct gate pickup.',
    status: 'AVAILABLE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-02',
    donorName: 'NutriLife Pediatric Pharmacy',
    donorPhone: '+91 98111 22334',
    itemTitle: 'Infant Nutrition Formula Tins (Stage 1 & 2)',
    category: 'BABY_FORMULA',
    totalQuantity: 30,
    remainingQuantity: 30,
    pickupLocation: 'Health Plaza, Sector 14',
    coordinates: { lat: 28.6250, lng: 77.2180, address: 'Health Plaza Sector 14' },
    preparedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 360 * 60 * 1000).toISOString(),
    storageRequirement: 'Dry cool storage. Strict potable water requirement.',
    specialInstructions: 'Requires verified clean drinking water at destination facility for preparation.',
    status: 'AVAILABLE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-03',
    donorName: 'Agro surplus Cooperative',
    donorPhone: '+91 99222 33445',
    itemTitle: 'Emergency Dry Grain & Lentil Ration Kits',
    category: 'RAW_RATIONS',
    totalQuantity: 50,
    remainingQuantity: 50,
    pickupLocation: 'Wholesale Depot Yard 4',
    coordinates: { lat: 28.6010, lng: 77.2250, address: 'Depot Yard 4' },
    preparedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 720 * 60 * 1000).toISOString(),
    storageRequirement: 'Keep dry. Requires cooking facilities.',
    specialInstructions: 'Must be distributed only to shelters with operating kitchens/stoves.',
    status: 'AVAILABLE',
    createdAt: new Date().toISOString(),
  }
];

export const getFreshInitialShelters = (): Shelter[] => [
  {
    id: 'sh-01',
    name: 'Shelter Alpha (Central Community Camp)',
    locationName: 'Paharganj Civic Centre',
    coordinates: { lat: 28.6380, lng: 77.2150, address: 'Paharganj Civic Complex' },
    maxCapacity: 150,
    currentOccupancy: 50,
    committedCapacity: 0,
    acceptsCategories: ['COOKED_MEALS', 'BABY_FORMULA', 'RAW_RATIONS', 'PACKAGED_FOOD'],
    hasCleanWater: true,
    hasCookingFuel: true,
    hasRefrigeration: true,
    status: 'ACCEPTING',
    contactPerson: 'Sunita Devi (Camp Lead)',
    contactPhone: '+91 98450 11223',
  },
  {
    id: 'sh-02',
    name: 'Shelter Beta (North Night Shelter)',
    locationName: 'ISBT North Yard',
    coordinates: { lat: 28.6650, lng: 77.2300, address: 'ISBT North Ground' },
    maxCapacity: 120,
    currentOccupancy: 40,
    committedCapacity: 0,
    acceptsCategories: ['COOKED_MEALS', 'RAW_RATIONS', 'PACKAGED_FOOD', 'BABY_FORMULA'],
    hasCleanWater: true,
    hasCookingFuel: true,
    hasRefrigeration: false,
    status: 'ACCEPTING',
    contactPerson: 'Mohan Lal (Coordinator)',
    contactPhone: '+91 98450 44556',
  },
  {
    id: 'sh-03',
    name: 'Shelter Gamma (South Flood Relief Outpost)',
    locationName: 'Okhla Transit Camp',
    coordinates: { lat: 28.5600, lng: 77.2700, address: 'Okhla Relief Tents' },
    maxCapacity: 60,
    currentOccupancy: 15,
    committedCapacity: 0,
    acceptsCategories: ['COOKED_MEALS', 'RAW_RATIONS', 'PACKAGED_FOOD'],
    hasCleanWater: false, // NO CLEAN WATER: Triggers Baby Formula rejection!
    hasCookingFuel: true,
    hasRefrigeration: false,
    status: 'ACCEPTING',
    contactPerson: 'Dr. A. Verma',
    contactPhone: '+91 98450 77889',
    specialRestrictions: 'Contaminated local pipeline. Tanker water only for basic washing. No potable water source.',
  },
  {
    id: 'sh-04',
    name: 'Shelter Delta (East Transit Dormitory)',
    locationName: 'Laxmi Nagar Shelter Point',
    coordinates: { lat: 28.6300, lng: 77.2780, address: 'Laxmi Nagar Civic Ward' },
    maxCapacity: 90,
    currentOccupancy: 80,
    committedCapacity: 0,
    acceptsCategories: ['COOKED_MEALS', 'PACKAGED_FOOD'],
    hasCleanWater: true,
    hasCookingFuel: false, // NO COOKING FUEL: Triggers Raw Rations rejection!
    hasRefrigeration: false,
    status: 'ACCEPTING',
    contactPerson: 'Karan Mehra',
    contactPhone: '+91 98450 99001',
    specialRestrictions: 'Dry dormitory only. Strict no-stove/no-cylinder fire regulation.',
  },
  {
    id: 'sh-05',
    name: 'Shelter Epsilon (Old City Relief Center)',
    locationName: 'Chandni Chowk Ward 7',
    coordinates: { lat: 28.6540, lng: 77.2320, address: 'Old City Center' },
    maxCapacity: 50,
    currentOccupancy: 50, // FULL (0 available)
    committedCapacity: 0,
    acceptsCategories: ['COOKED_MEALS'],
    hasCleanWater: true,
    hasCookingFuel: true,
    hasRefrigeration: false,
    status: 'CAPACITY_REACHED',
    contactPerson: 'Fatima Sheikh',
    contactPhone: '+91 98450 33442',
    specialRestrictions: 'At 100% capacity. No intake allowed.',
  }
];

export const getFreshInitialVolunteers = (): Volunteer[] => [
  {
    id: 'vol-01',
    name: 'Rajesh Kumar',
    phone: '+91 98101 11222',
    vehicleType: 'SCOOTER',
    carryCapacity: 40,
    zone: 'Central Urban',
    status: 'AVAILABLE',
    responsiveness: 'ACTIVE',
    coordinates: { lat: 28.6180, lng: 77.2110 },
    reliabilityScore: 0.98,
    lastPingTime: new Date().toISOString(),
  },
  {
    id: 'vol-02',
    name: 'Priya Sharma',
    phone: '+91 98101 22333',
    vehicleType: 'MOTORBIKE',
    carryCapacity: 40,
    zone: 'North Urban',
    status: 'AVAILABLE',
    responsiveness: 'ACTIVE',
    coordinates: { lat: 28.6210, lng: 77.2080 },
    reliabilityScore: 0.95,
    lastPingTime: new Date().toISOString(),
  },
  {
    id: 'vol-03',
    name: 'Amit Patel',
    phone: '+91 98101 33444',
    vehicleType: 'SCOOTER',
    carryCapacity: 40,
    zone: 'Central Urban',
    status: 'AVAILABLE',
    responsiveness: 'ACTIVE',
    coordinates: { lat: 28.6110, lng: 77.2150 },
    reliabilityScore: 0.92,
    lastPingTime: new Date().toISOString(),
  },
  {
    id: 'vol-04',
    name: 'Sneha Reddy',
    phone: '+91 98101 44555',
    vehicleType: 'MOTORBIKE',
    carryCapacity: 40,
    zone: 'West Urban',
    status: 'AVAILABLE',
    responsiveness: 'ACTIVE',
    coordinates: { lat: 28.6150, lng: 77.2040 },
    reliabilityScore: 0.97,
    lastPingTime: new Date().toISOString(),
  },
  {
    id: 'vol-05',
    name: 'Vikram Singh',
    phone: '+91 98101 55666',
    vehicleType: 'BICYCLE',
    carryCapacity: 20,
    zone: 'Central Micro-Corridor',
    status: 'AVAILABLE',
    responsiveness: 'ACTIVE',
    coordinates: { lat: 28.6160, lng: 77.2120 },
    reliabilityScore: 0.91,
    lastPingTime: new Date().toISOString(),
  }
];

export const getFreshInitialLogEvents = (): LogEvent[] => [
  {
    id: 'ev-01',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    severity: 'INFO',
    category: 'SYSTEM',
    title: 'Platform Initialized',
    message: 'Sanjeevani Civic Logistics coordination engine online. 5 shelters and 5 volunteer riders synchronized.',
  },
  {
    id: 'ev-02',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    severity: 'WARNING',
    category: 'DONATION',
    title: 'Perishable Surplus Ingested',
    message: 'The Grand Regal Banquet registered 180 cooked meals. Expiry deadline set to 75 minutes. Accelerated watchdog active.',
  }
];

export const getFreshInitialUsers = (): PlatformUser[] => [
  {
    id: 'usr-01',
    name: 'Dr. Meera Nambiar',
    email: 'meera.nambiar@sanjeevani.org',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    organization: 'Sanjeevani Central Secretariat',
    phone: '+91 98111 00001',
    registeredAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'usr-02',
    name: 'Aditya Verma',
    email: 'aditya.v@sanjeevani.org',
    role: 'RELIEF_COORDINATOR',
    status: 'ACTIVE',
    organization: 'Delhi Crisis Response Cell',
    phone: '+91 98111 00002',
    registeredAt: '2026-01-12T09:30:00.000Z'
  },
  {
    id: 'usr-03',
    name: 'Chef Alok Singhania',
    email: 'alok.s@grandregal.com',
    role: 'DONOR_COORDINATOR',
    status: 'ACTIVE',
    organization: 'The Grand Regal Banquet Hall',
    phone: '+91 98765 43210',
    registeredAt: '2026-02-01T11:15:00.000Z'
  },
  {
    id: 'usr-04',
    name: 'Ramesh Kumar',
    email: 'ramesh.k@fieldcourier.org',
    role: 'FIELD_COURIER',
    status: 'ACTIVE',
    organization: 'Delhi Volunteer Courier Squad',
    phone: '+91 98101 23456',
    registeredAt: '2026-02-14T14:20:00.000Z'
  },
  {
    id: 'usr-05',
    name: 'Rajesh Kumar',
    email: 'rajesh.k@delhicamps.gov.in',
    role: 'SHELTER_SUPERVISOR',
    status: 'ACTIVE',
    organization: 'Shelter Alpha (Central Community Camp)',
    phone: '+91 98200 11223',
    registeredAt: '2026-02-18T16:45:00.000Z'
  },
  {
    id: 'usr-06',
    name: 'Sunita Devi',
    email: 'sunita.d@kashmerekitchen.org',
    role: 'SHELTER_SUPERVISOR',
    status: 'ACTIVE',
    organization: 'Shelter Beta (Kashmere Gate Community Kitchen)',
    phone: '+91 98300 22334',
    registeredAt: '2026-03-01T10:00:00.000Z'
  }
];

export const getFreshInitialConfig = (): PlatformConfig => ({
  claimTtlSeconds: 30, // accelerated 30s claim watchdog for demonstration
  expiryWarningMinutes: 60,
  expiryCriticalMinutes: 30,
  enforceSafetyDependencies: true,
  supportedCategories: ['COOKED_MEALS', 'BABY_FORMULA', 'RAW_RATIONS', 'COLD_CHAIN_MEDS', 'PACKAGED_FOOD'],
  maxRiderPayloadCap: 50
});

// Fallback constants
export const INITIAL_DONATIONS = getFreshInitialDonations();
export const INITIAL_SHELTERS = getFreshInitialShelters();
export const INITIAL_VOLUNTEERS = getFreshInitialVolunteers();
export const INITIAL_LOG_EVENTS = getFreshInitialLogEvents();
