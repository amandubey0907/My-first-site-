/**
 * ProximityEngine.js
 * Geospatial Distance and Proximity Calculation Module
 * Part of: Geospatial Proximity Audio Ecosystem
 */

class ProximityEngine {
  constructor(options = {}) {
    // Earth's radius in meters for Haversine calculation
    this.EARTH_RADIUS_METERS = 6371000;

    // Attenuation Model: 'inverse', 'linear', or 'exponential'
    this.model = options.model || 'inverse';
    
    // Rolloff factor controls how fast sound decays with distance
    this.rolloffFactor = options.rolloffFactor !== undefined ? options.rolloffFactor : 1.0;
  }

  /**
   * Calculate Euclidean distance between two 2D points (in meters)
   * @param {Object} pos1 - { x, y }
   * @param {Object} pos2 - { x, y }
   * @returns {number} distance in meters
   */
  getEuclideanDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Real-World Geospatial Distance using Haversine formula
   * @param {number} lat1 - Latitude of point 1 (degrees)
   * @param {number} lon1 - Longitude of point 1 (degrees)
   * @param {number} lat2 - Latitude of point 2 (degrees)
   * @param {number} lon2 - Longitude of point 2 (degrees)
   * @returns {number} distance in meters
   */
  getHaversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (angle) => (angle * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Calculate Bearing Angle from listener to sound source in degrees (-180 to 180)
   * 0 deg = Directly ahead
   * +90 deg = Right ear
   * -90 deg = Left ear
   */
  getBearing(listenerPos, sourcePos) {
    const dx = sourcePos.x - listenerPos.x;
    const dy = sourcePos.y - listenerPos.y;
    let angleRad = Math.atan2(dx, -dy); // 0 at top/North, clockwise
    return (angleRad * 180) / Math.PI;
  }

  /**
   * Compute normalized stereo panning factor (-1.0 to +1.0)
   * -1.0 = full left ear, 0.0 = center, +1.0 = full right ear
   */
  getPanningFactor(listenerPos, sourcePos) {
    const dx = sourcePos.x - listenerPos.x;
    const distance = Math.max(0.1, this.getEuclideanDistance(listenerPos, sourcePos));
    // Normalize X offset by distance, clamped to [-1, 1]
    const pan = dx / distance;
    return Math.max(-1.0, Math.min(1.0, pan));
  }

  /**
   * Calculate Gain (Volume Attenuation: 0.0 to 1.0) based on proximity
   * @param {number} distance - Current distance from listener to source (meters)
   * @param {number} refDistance - Minimum radius with 100% volume (meters)
   * @param {number} maxDistance - Maximum cutoff radius with 0% volume (meters)
   * @returns {number} normalized gain [0.0 - 1.0]
   */
  calculateProximityGain(distance, refDistance = 5, maxDistance = 60) {
    // If inside the minimum reference distance, full volume
    if (distance <= refDistance) {
      return 1.0;
    }

    // If beyond the outer cutoff radius, completely silent
    if (distance >= maxDistance) {
      return 0.0;
    }

    // Proximity attenuation curves
    switch (this.model) {
      case 'linear': {
        // Linear fade from refDistance down to maxDistance
        return 1.0 - (distance - refDistance) / (maxDistance - refDistance);
      }
      case 'exponential': {
        // Exponential decay
        const normalized = (distance - refDistance) / (maxDistance - refDistance);
        return Math.pow(1.0 - normalized, 2 * this.rolloffFactor);
      }
      case 'inverse':
      default: {
        // Standard Inverse Distance Clamped Model (Web Audio standard)
        // Gain = refDistance / (refDistance + rolloffFactor * (distance - refDistance))
        const effectiveDist = distance - refDistance;
        const gain = refDistance / (refDistance + this.rolloffFactor * effectiveDist);
        // Smoothly fade to 0 as it approaches maxDistance
        const cutoffMargin = (maxDistance - distance) / (maxDistance - refDistance);
        return Math.max(0, gain * Math.min(1, cutoffMargin * 1.5));
      }
    }
  }
}

// Export for module/browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProximityEngine;
}
