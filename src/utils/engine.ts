import { 
  Donation, 
  Shelter, 
  Volunteer, 
  DeliveryTask, 
  DispatchScoreBreakdown, 
  ValidationResult,
  AidCategory 
} from '../types';
import { calculateDistanceKm, estimateTransitMinutes } from './geo';

/**
 * Returns remaining shelf life in minutes (can be negative if expired)
 */
export function getRemainingShelfLifeMinutes(expiresAtIso: string, now: Date = new Date()): number {
  const expiryTime = new Date(expiresAtIso).getTime();
  const diffMs = expiryTime - now.getTime();
  return Math.floor(diffMs / 60000);
}

/**
 * Validates aid category dependencies and shelter capabilities
 */
export function validateAidDependencies(category: AidCategory, shelter: Shelter): { passed: boolean; reason?: string } {
  // 1. Infant formula requires clean water
  if (category === 'BABY_FORMULA' && !shelter.hasCleanWater) {
    return {
      passed: false,
      reason: `REJECTED: Infant formula requires verified clean potable water for safe reconstitution. ${shelter.name} reports clean water is currently unavailable.`
    };
  }

  // 2. Raw ration kits require cooking facilities and fuel
  if (category === 'RAW_RATIONS' && !shelter.hasCookingFuel) {
    return {
      passed: false,
      reason: `REJECTED: Raw ration kits require cooking fuel & operational kitchen. ${shelter.name} does not have cooking facilities.`
    };
  }

  // 3. Cold chain medicines require active refrigeration
  if (category === 'COLD_CHAIN_MEDS' && !shelter.hasRefrigeration) {
    return {
      passed: false,
      reason: `REJECTED: Cold-chain medical supplies require 2°C–8°C refrigeration. ${shelter.name} lacks functional refrigeration.`
    };
  }

  // 4. Shelter category whitelist
  if (!shelter.acceptsCategories.includes(category)) {
    return {
      passed: false,
      reason: `REJECTED: ${shelter.name} does not accept ${category.replace('_', ' ')} based on municipal intake policy.`
    };
  }

  return { passed: true };
}

/**
 * Validates whether a specific dispatch to a shelter is safe and feasible
 */
export function validateDispatchFeasibility(
  donation: Donation,
  shelter: Shelter,
  requestedQuantity: number,
  now: Date = new Date()
): ValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  // Expiry check
  const remainingMinutes = getRemainingShelfLifeMinutes(donation.expiresAt, now);
  if (remainingMinutes <= 0) {
    failures.push(`CRITICAL: Aid batch has already expired (${Math.abs(remainingMinutes)} mins ago). Spoilage safety policy strictly prohibits dispatch.`);
    return { isValid: false, failures, warnings };
  }

  // Shelter operational status
  if (shelter.status === 'CLOSED') {
    failures.push(`Shelter ${shelter.name} is currently CLOSED and cannot accept deliveries.`);
  } else if (shelter.status === 'CAPACITY_REACHED') {
    failures.push(`Shelter ${shelter.name} has declared MAXIMUM CAPACITY (0 intake available).`);
  }

  // Capacity check
  const availableCapacity = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
  if (availableCapacity <= 0) {
    failures.push(`Shelter ${shelter.name} has 0 remaining capacity.`);
  } else if (availableCapacity < requestedQuantity) {
    failures.push(
      `Insufficient capacity at ${shelter.name}: Requested ${requestedQuantity} units, but only ${availableCapacity} remaining available.`
    );
  }

  // Dependency check
  const depCheck = validateAidDependencies(donation.category, shelter);
  if (!depCheck.passed && depCheck.reason) {
    failures.push(depCheck.reason);
  }

  // Distance & Transit Feasibility
  const distanceKm = calculateDistanceKm(donation.coordinates, shelter.coordinates);
  const transitMinutes = estimateTransitMinutes(distanceKm);
  const prepTimeMinutes = 5;
  const safetyBufferMinutes = Math.max(8, Math.ceil(transitMinutes * 0.25));
  const totalRequiredTime = transitMinutes + prepTimeMinutes + safetyBufferMinutes;

  if (totalRequiredTime > remainingMinutes) {
    failures.push(
      `SPOILAGE RISK: Transit + Handover + Safety Buffer requires ${totalRequiredTime} mins, but only ${remainingMinutes} mins of shelf-life remain. Aid would arrive spoiled.`
    );
  } else if (remainingMinutes - totalRequiredTime < 15) {
    warnings.push(`Tight delivery window: Estimated arrival has only ${remainingMinutes - totalRequiredTime} mins margin before expiration.`);
  }

  return {
    isValid: failures.length === 0,
    failures,
    warnings
  };
}

/**
 * Scores and ranks all shelters for an aid donation based on explainable factors
 */
export function rankSheltersForDispatch(
  donation: Donation,
  shelters: Shelter[],
  requestedQuantity: number = 0,
  now: Date = new Date()
): DispatchScoreBreakdown[] {
  const remainingMinutes = getRemainingShelfLifeMinutes(donation.expiresAt, now);

  return shelters.map((shelter) => {
    const ineligibilityReasons: string[] = [];
    const distanceKm = calculateDistanceKm(donation.coordinates, shelter.coordinates);
    const transitEtaMinutes = estimateTransitMinutes(distanceKm);
    const prepBuffer = 5;
    const safetyBuffer = Math.max(8, Math.ceil(transitEtaMinutes * 0.25));
    const totalTimeRequired = transitEtaMinutes + prepBuffer + safetyBuffer;
    const feasibleWithinExpiry = remainingMinutes >= totalTimeRequired;

    // Checks
    if (shelter.status !== 'ACCEPTING') {
      ineligibilityReasons.push(`Shelter status is ${shelter.status}`);
    }

    const availableCapacity = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
    if (availableCapacity <= 0) {
      ineligibilityReasons.push(`Zero intake space available`);
    } else if (requestedQuantity > 0 && availableCapacity < requestedQuantity) {
      // If a specific single quantity was requested and it exceeds available
      ineligibilityReasons.push(`Needs ${requestedQuantity} space, but only ${availableCapacity} available`);
    }

    const depCheck = validateAidDependencies(donation.category, shelter);
    if (!depCheck.passed && depCheck.reason) {
      ineligibilityReasons.push(depCheck.reason);
    }

    if (!feasibleWithinExpiry) {
      ineligibilityReasons.push(`Transit + buffer (${totalTimeRequired}m) exceeds remaining shelf-life (${remainingMinutes}m)`);
    }

    const isEligible = ineligibilityReasons.length === 0;

    // Explainable Scoring Formula
    // Proximity score (0 to 40)
    const proximityScore = Math.max(0, 40 - (distanceKm * 2.5));
    // Capacity headroom score (0 to 30)
    const capacityScore = availableCapacity > 0 ? Math.min(30, (availableCapacity / shelter.maxCapacity) * 30) : 0;
    // Expiry feasibility score (0 to 30)
    const expirySafetyScore = feasibleWithinExpiry ? Math.min(30, ((remainingMinutes - totalTimeRequired) / 60) * 30) : 0;

    const urgencyScore = Math.max(0, 100 - remainingMinutes);
    const compositeScore = isEligible 
      ? Math.round(proximityScore + capacityScore + expirySafetyScore)
      : 0;

    let explanation = '';
    if (isEligible) {
      explanation = `Optimal destination: ${distanceKm} km away (~${transitEtaMinutes}m ETA). Leaves ${remainingMinutes - totalTimeRequired}m safety margin. Available capacity: ${availableCapacity} units.`;
    } else {
      explanation = `Ineligible: ${ineligibilityReasons.join('; ')}`;
    }

    return {
      shelterId: shelter.id,
      shelterName: shelter.name,
      isEligible,
      ineligibilityReasons,
      distanceKm,
      transitEtaMinutes,
      feasibleWithinExpiry,
      remainingShelfLifeMinutes: remainingMinutes,
      urgencyScore,
      compositeScore,
      explanation
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

export interface SplitPlanItem {
  rider: Volunteer;
  allocatedQuantity: number;
}

export interface SplitPlanResult {
  feasible: boolean;
  totalAllocated: number;
  remainingUnallocated: number;
  plan: SplitPlanItem[];
  reason?: string;
}

/**
 * Splits a donation quantity across multiple eligible available riders
 * strictly enforcing each rider's carry capacity without silent loss
 */
export function calculateBatchSplit(
  totalNeeded: number,
  availableRiders: Volunteer[]
): SplitPlanResult {
  // Filter active and available riders, sorted by capacity descending
  const eligibleRiders = availableRiders
    .filter((r) => r.status === 'AVAILABLE' && r.responsiveness === 'ACTIVE')
    .sort((a, b) => b.carryCapacity - a.carryCapacity);

  let remaining = totalNeeded;
  const plan: SplitPlanItem[] = [];

  for (const rider of eligibleRiders) {
    if (remaining <= 0) break;
    const allocation = Math.min(remaining, rider.carryCapacity);
    if (allocation > 0) {
      plan.push({
        rider,
        allocatedQuantity: allocation
      });
      remaining -= allocation;
    }
  }

  const totalAllocated = totalNeeded - remaining;

  return {
    feasible: remaining === 0,
    totalAllocated,
    remainingUnallocated: remaining,
    plan,
    reason: remaining > 0 
      ? `Insufficient total rider capacity: Requested ${totalNeeded} units, but available fleet can only carry ${totalAllocated} units.`
      : undefined
  };
}

/**
 * Finds alternative eligible shelters for dynamic mid-transit rerouting
 */
export function findRerouteAlternatives(
  task: DeliveryTask,
  currentRider: Volunteer,
  donation: Donation,
  allShelters: Shelter[],
  now: Date = new Date()
): DispatchScoreBreakdown[] {
  const remainingMinutes = getRemainingShelfLifeMinutes(donation.expiresAt, now);
  const candidateShelters = allShelters.filter((s) => s.id !== task.targetShelterId);

  return candidateShelters.map((shelter) => {
    const ineligibilityReasons: string[] = [];
    const distanceKm = calculateDistanceKm(currentRider.coordinates, shelter.coordinates);
    const transitEtaMinutes = estimateTransitMinutes(distanceKm);
    const safetyBuffer = Math.max(5, Math.ceil(transitEtaMinutes * 0.2));
    const totalTimeRequired = transitEtaMinutes + safetyBuffer;
    const feasibleWithinExpiry = remainingMinutes >= totalTimeRequired;

    if (shelter.status !== 'ACCEPTING') {
      ineligibilityReasons.push(`Status is ${shelter.status}`);
    }

    const availableCapacity = shelter.maxCapacity - (shelter.currentOccupancy + shelter.committedCapacity);
    if (availableCapacity < task.quantity) {
      ineligibilityReasons.push(`Insufficient capacity (available: ${availableCapacity}, needed: ${task.quantity})`);
    }

    const depCheck = validateAidDependencies(donation.category, shelter);
    if (!depCheck.passed && depCheck.reason) {
      ineligibilityReasons.push(depCheck.reason);
    }

    if (!feasibleWithinExpiry) {
      ineligibilityReasons.push(`Remaining shelf life (${remainingMinutes}m) insufficient for reroute ETA (${totalTimeRequired}m)`);
    }

    const isEligible = ineligibilityReasons.length === 0;
    const proximityScore = Math.max(0, 50 - (distanceKm * 3));
    const capacityScore = isEligible ? Math.min(30, (availableCapacity / shelter.maxCapacity) * 30) : 0;
    const compositeScore = isEligible ? Math.round(proximityScore + capacityScore) : 0;

    return {
      shelterId: shelter.id,
      shelterName: shelter.name,
      isEligible,
      ineligibilityReasons,
      distanceKm,
      transitEtaMinutes,
      feasibleWithinExpiry,
      remainingShelfLifeMinutes: remainingMinutes,
      urgencyScore: 100 - remainingMinutes,
      compositeScore,
      explanation: isEligible
        ? `Feasible Alternative: ${distanceKm} km from rider's live position (~${transitEtaMinutes} mins). Available space: ${availableCapacity} units.`
        : `Blocked: ${ineligibilityReasons.join('; ')}`
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}
