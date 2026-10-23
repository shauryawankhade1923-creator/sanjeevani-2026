import { Coordinates } from '../types';

/**
 * Calculates Haversine distance in kilometers between two coordinates
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimates transit duration in minutes for two-wheelers in urban traffic
 * Assumes average speed of 24 km/h with 3 min fixed traffic/signals buffer
 */
export function estimateTransitMinutes(distanceKm: number): number {
  const averageSpeedKmH = 24;
  const transitTimeMinutes = (distanceKm / averageSpeedKmH) * 60;
  const fixedBufferMinutes = 3;
  return Math.max(5, Math.ceil(transitTimeMinutes + fixedBufferMinutes));
}
