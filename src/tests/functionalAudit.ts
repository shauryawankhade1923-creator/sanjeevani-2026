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
