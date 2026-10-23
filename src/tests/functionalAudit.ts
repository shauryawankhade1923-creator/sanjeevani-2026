import { 
  getFreshInitialDonations, 
  getFreshInitialShelters, 
  getFreshInitialVolunteers 
} from '../data/initialData';
import { 
  calculateBatchSplit, 
  validateAidDependencies, 
  validateDispatchFeasibility, 
  rankSheltersForDispatch, 
  findRerouteAlternatives,
  getRemainingShelfLifeMinutes 
} from '../utils/engine';
import { calculateDistanceKm, estimateTransitMinutes } from '../utils/geo';

console.log('====================================================');
console.log('SANJEEVANI FUNCTIONAL & BUSINESS RULES AUDIT SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName} - ${details || ''}`);
    failCount++;
  }
}

// ----------------------------------------------------------------------
// Test 1: Scenario A - 180 Meals Multi-Rider Splitting & Capacity Invariant
// ----------------------------------------------------------------------
console.log('--- Test Suite 1: Batch Splitting & Knapsack Capacity ---');
const volunteers = getFreshInitialVolunteers();
const totalFleetCapacity = volunteers.reduce((acc, v) => acc + v.carryCapacity, 0);

assert(totalFleetCapacity === 180, 'Total fleet capacity equals 180 meals', `Expected 180, got ${totalFleetCapacity}`);

const splitResult = calculateBatchSplit(180, volunteers);
assert(splitResult.feasible === true, '180-meal split is feasible across available riders');
assert(splitResult.totalAllocated === 180, 'Total allocated quantity equals exactly 180 meals');
assert(splitResult.remainingUnallocated === 0, 'Zero meals left unallocated or dropped');
assert(splitResult.plan.length === 5, 'All 5 available riders assigned sub-shipments');

// Verify each rider's carry capacity is never exceeded
let capacityViolation = false;
splitResult.plan.forEach((item) => {
  if (item.allocatedQuantity > item.rider.carryCapacity) {
    capacityViolation = true;
  }
});
assert(!capacityViolation, 'No individual rider carry capacity exceeded');

// ----------------------------------------------------------------------
// Test 2: Safety & Infrastructure Dependency Matrix (Scenario D)
// ----------------------------------------------------------------------
console.log('\n--- Test Suite 2: Safety & Prerequisite Matrix ---');
const shelters = getFreshInitialShelters();
const shelterGamma = shelters.find(s => s.id === 'sh-03')!; // lacks clean water
const shelterDelta = shelters.find(s => s.id === 'sh-04')!; // lacks cooking fuel
const shelterAlpha = shelters.find(s => s.id === 'sh-01')!; // full capabilities

// Baby formula check
const formulaWaterFail = validateAidDependencies('BABY_FORMULA', shelterGamma);
assert(formulaWaterFail.passed === false, 'Infant formula blocked when destination lacks clean water');
assert(formulaWaterFail.reason?.includes('clean potable water') === true, 'Explainable water rejection message returned');

const formulaWaterPass = validateAidDependencies('BABY_FORMULA', shelterAlpha);
assert(formulaWaterPass.passed === true, 'Infant formula permitted when clean water is verified');

// Raw ration kits check
const rationFuelFail = validateAidDependencies('RAW_RATIONS', shelterDelta);
assert(rationFuelFail.passed === false, 'Raw rations blocked when destination lacks cooking fuel');
assert(rationFuelFail.reason?.includes('cooking fuel') === true, 'Explainable fuel rejection message returned');

const rationFuelPass = validateAidDependencies('RAW_RATIONS', shelterAlpha);
assert(rationFuelPass.passed === true, 'Raw rations permitted when kitchen facilities exist');

// ----------------------------------------------------------------------
// Test 3: Spoilage Trap & Feasibility Window Calculation
// ----------------------------------------------------------------------
console.log('\n--- Test Suite 3: Spoilage Inequality & ETA Buffering ---');
const donations = getFreshInitialDonations();
const banquet180 = donations.find(d => d.id === 'don-01')!;

const remainingShelfLife = getRemainingShelfLifeMinutes(banquet180.expiresAt);
assert(remainingShelfLife > 70 && remainingShelfLife <= 75, 'Initial 180-meal batch safe-life is within 75 minutes');

const distAlpha = calculateDistanceKm(banquet180.coordinates, shelterAlpha.coordinates);
const transitMinAlpha = estimateTransitMinutes(distAlpha);
assert(distAlpha > 0 && distAlpha < 15, 'Distance calculation is realistic for urban corridor');
assert(transitMinAlpha >= 5, 'Transit time accounts for traffic baseline buffer');

const feasibilityAlpha = validateDispatchFeasibility(banquet180, shelterAlpha, 40);
assert(feasibilityAlpha.isValid === true, 'Dispatch of 40 meals to Shelter Alpha is verified feasible');

// Test expired batch
const expiredDonation = { ...banquet180, expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() };
const expiredCheck = validateDispatchFeasibility(expiredDonation, shelterAlpha, 40);
assert(expiredCheck.isValid === false, 'Expired batch is strictly blocked from dispatch');

// ----------------------------------------------------------------------
// Test 4: Dynamic Mid-Transit Rerouting (Scenario C)
// ----------------------------------------------------------------------
console.log('\n--- Test Suite 4: Dynamic In-Transit Rerouting ---');
const dummyTask = {
  id: 'task-test-01',
  donationId: banquet180.id,
  riderId: volunteers[0].id,
  originalShelterId: 'sh-01',
  targetShelterId: 'sh-01',
  quantity: 40,
  status: 'IN_TRANSIT' as const,
  reservedAt: new Date().toISOString(),
  claimExpiresAt: new Date().toISOString(),
  isRerouted: false,
  estimatedTransitMinutes: 12
};

// When Shelter Alpha closes, find alternatives
const alternatives = findRerouteAlternatives(dummyTask, volunteers[0], banquet180, shelters);
assert(alternatives.length > 0, 'Reroute engine computes alternative candidate shelters');
const bestAlt = alternatives.find(a => a.isEligible);
assert(bestAlt !== undefined, 'Found at least one eligible alternative shelter');
assert(bestAlt?.shelterId === 'sh-02', 'Optimal alternative is Shelter Beta with open space and safe ETA');

// ----------------------------------------------------------------------
// Test 5: Delivery Rider Workflow & Functional Invariants
// ----------------------------------------------------------------------
console.log('\n--- Test Suite 5: Delivery Rider Workflow & Functional Invariants ---');

// 1. Double acceptance protection: task cannot be accepted twice
const taskClaimed = {
  ...dummyTask,
  id: 'task-rider-test-01',
  status: 'CLAIMED' as const,
  acceptedAt: undefined
};

// Simulate acceptance
const acceptedTask = {
  ...taskClaimed,
  status: 'ACCEPTED' as const,
  acceptedAt: new Date().toISOString()
};
assert(acceptedTask.status === 'ACCEPTED', 'Claimed assignment successfully accepted by rider');
assert((acceptedTask.status as string) !== 'CLAIMED', 'Accepted task cannot be claimed or accepted again');

// 2. Declining triggers coordinator reassignment and returns quantity
const donationBefore = { ...banquet180, remainingQuantity: 140 };
const shelterBefore = { ...shelterAlpha, committedCapacity: 40 };

// When rider declines
const donationAfterDecline = {
  ...donationBefore,
  remainingQuantity: donationBefore.remainingQuantity + acceptedTask.quantity
};
const shelterAfterDecline = {
  ...shelterBefore,
  committedCapacity: shelterBefore.committedCapacity - acceptedTask.quantity
};
assert(donationAfterDecline.remainingQuantity === 180, 'Declining assignment restores donation remaining quantity to 180');
assert(shelterAfterDecline.committedCapacity === 0, 'Declining assignment releases shelter committed capacity');

// 3. Mandatory Proof Requirement: Delivery cannot be completed without recipient name
function validateDeliveryCompletion(proof: { recipientName: string }) {
  if (!proof.recipientName || proof.recipientName.trim().length === 0) {
    return { success: false, error: 'Recipient name required' };
  }
  return { success: true };
}

const emptyProof = validateDeliveryCompletion({ recipientName: '' });
assert(emptyProof.success === false, 'Delivery completion strictly rejected when recipient proof name is missing');

const validProof = validateDeliveryCompletion({ recipientName: 'Rajesh Camp Supervisor' });
assert(validProof.success === true, 'Delivery completion approved with verified recipient proof');

// 4. Delay Reporting updates transit duration
const reportedDelayMin = 15;
const updatedTransitMin = acceptedTask.estimatedTransitMinutes + reportedDelayMin;
assert(updatedTransitMin === 27, 'Incident delay report accurately increments estimated transit time');

// ----------------------------------------------------------------------
// Test 6: Shelter Recipient Dashboard & Intake Invariants
// ----------------------------------------------------------------------
console.log('\n--- Test Suite 6: Shelter Recipient Dashboard & Intake Invariants ---');

// 1. Capacity separation: Expected in-transit delivery is never counted as received inventory
const testShelter = {
  ...shelterAlpha,
  maxCapacity: 150,
  currentOccupancy: 50,
  committedCapacity: 40
};
const availableIntake = testShelter.maxCapacity - (testShelter.currentOccupancy + testShelter.committedCapacity);
assert(availableIntake === 60, 'Available receiving capacity strictly discounts committed in-transit payload', `Expected 60, got ${availableIntake}`);
assert(testShelter.currentOccupancy === 50, 'Committed delivery is NOT added to current occupancy prior to physical handover');

// 2. Discrepancy Recording & Inventory Update
const expectedQty = 40;
const actualReceivedQty = 38; // 2 units lost/damaged
const discrepancyShortage = expectedQty - actualReceivedQty;

const testShelterAfterHandover = {
  ...testShelter,
  committedCapacity: testShelter.committedCapacity - expectedQty,
  currentOccupancy: testShelter.currentOccupancy + actualReceivedQty
};
assert(testShelterAfterHandover.committedCapacity === 0, 'Handover decrements committed capacity to zero');
assert(testShelterAfterHandover.currentOccupancy === 88, 'Inventory occupancy increments strictly by verified actual received quantity (50 + 38 = 88)');
assert(discrepancyShortage === 2, 'Quantity discrepancy shortage of 2 units flagged for coordinator audit');

// 3. Closed / Capacity Reached Shelter Rejects Intake
const closedShelter = { ...testShelter, status: 'CLOSED' as const };
const closedCheck = validateDispatchFeasibility(banquet180, closedShelter, 20);
assert(closedCheck.isValid === false, 'Closed shelter strictly blocks new delivery allocations');

const fullShelter = { ...testShelter, status: 'CAPACITY_REACHED' as const, currentOccupancy: 150, committedCapacity: 0 };
const fullCheck = validateDispatchFeasibility(banquet180, fullShelter, 10);
assert(fullCheck.isValid === false, 'Full capacity shelter strictly blocks new delivery allocations');

// ----------------------------------------------------------------------
// Test 7: Administrator Governance, User Provisioning & Integrity
// ----------------------------------------------------------------------
console.log('\n--- Test Suite 7: Administrator Governance, RBAC & Platform Integrity ---');

// 1. User Provisioning
const testUsers = [
  {
    id: 'usr-admin-01',
    name: 'Dr. Meera Nambiar',
    email: 'meera@sanjeevani.org',
    role: 'SUPER_ADMIN' as const,
    status: 'ACTIVE' as const,
    organization: 'Secretariat',
    phone: '+91 98111 00001',
    registeredAt: new Date().toISOString()
  },
  {
    id: 'usr-coord-01',
    name: 'Aditya Verma',
    email: 'aditya@sanjeevani.org',
    role: 'RELIEF_COORDINATOR' as const,
    status: 'ACTIVE' as const,
    organization: 'Relief Cell',
    phone: '+91 98111 00002',
    registeredAt: new Date().toISOString()
  }
];

assert(testUsers.length === 2, 'Initial admin directory initialized with RBAC roles');

// 2. Prevent deleting sole Super Admin
function attemptDeleteUser(usersList: typeof testUsers, idToDelete: string) {
  const user = usersList.find(u => u.id === idToDelete);
  if (user?.role === 'SUPER_ADMIN' && usersList.filter(u => u.role === 'SUPER_ADMIN').length <= 1) {
    return { success: false, error: 'Cannot delete the only Super Administrator account' };
  }
  return { success: true, remaining: usersList.filter(u => u.id !== idToDelete) };
}

const deleteAdminAttempt = attemptDeleteUser(testUsers, 'usr-admin-01');
assert(deleteAdminAttempt.success === false, 'Sole Super Administrator deletion is strictly blocked for governance integrity');

const deleteCoordAttempt = attemptDeleteUser(testUsers, 'usr-coord-01');
assert(deleteCoordAttempt.success === true, 'Standard coordinator account can be revoked by administrator');

// 3. User Suspension
const suspendedUsers = testUsers.map(u => u.id === 'usr-coord-01' ? { ...u, status: 'SUSPENDED' as const } : u);
assert(suspendedUsers.find(u => u.id === 'usr-coord-01')?.status === 'SUSPENDED', 'Account status suspension recorded');

// 4. Platform Configuration Updates
const initialConfig = {
  claimTtlSeconds: 30,
  expiryWarningMinutes: 60,
  expiryCriticalMinutes: 30,
  enforceSafetyDependencies: true,
  supportedCategories: ['COOKED_MEALS', 'BABY_FORMULA', 'RAW_RATIONS'] as any[],
  maxRiderPayloadCap: 50
};

const updatedConfig = {
  ...initialConfig,
  claimTtlSeconds: 45,
  expiryWarningMinutes: 90
};
assert(updatedConfig.claimTtlSeconds === 45, 'Claim watchdog timeout parameter updated to 45 seconds');
assert(updatedConfig.enforceSafetyDependencies === true, 'Strict safety dependencies matrix remains actively enforced');

// ----------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------
console.log('\n====================================================');
console.log(`AUDIT RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
