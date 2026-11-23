/**
 * telemetryService.js — Core Telemetry Ingestion Logic
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * This service layer sits between the HTTP controllers and the
 * TelemetryEvent model. It handles:
 *   - Single event ingestion
 *   - Bulk batch ingestion (up to MAX_BATCH_SIZE events per request)
 *   - Query building for time-range lookups
 *   - Analytics aggregation helpers
 */

'use strict';

const TelemetryEvent = require('../models/TelemetryEvent');
const AudioSession = require('../models/AudioSession');

const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '500', 10);

// ─── Ingest a Single Telemetry Event ─────────────────────────────────────────

/**
 * Ingest a single telemetry snapshot from the front-end.
 *
 * @param {Object} payload - Raw body from POST /api/telemetry
 * @returns {Promise<TelemetryEvent>}
 */
async function ingestOne(payload) {
  const doc = buildEventDoc(payload);
  return TelemetryEvent.create(doc);
}

// ─── Bulk Ingest ──────────────────────────────────────────────────────────────

/**
 * Bulk-insert an array of telemetry events in one MongoDB write.
 * Front-end can buffer N events and flush them periodically for efficiency.
 *
 * @param {Array<Object>} payloads - Array of raw telemetry payloads
 * @returns {Promise<{ insertedCount: number }>}
 */
async function ingestBatch(payloads) {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    throw new Error('Batch must be a non-empty array.');
  }
  if (payloads.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Batch size ${payloads.length} exceeds the maximum of ${MAX_BATCH_SIZE}.`
    );
  }

  const docs = payloads.map(buildEventDoc);

  // insertMany with { ordered: false } so a single bad doc doesn't block the rest
  const result = await TelemetryEvent.insertMany(docs, { ordered: false });
  return { insertedCount: result.length };
}

// ─── Query Events ──────────────────────────────────────────────────────────────

/**
 * Retrieve raw telemetry events with optional filters.
 *
 * @param {Object} filters
 * @param {string} [filters.sessionId]
 * @param {string} [filters.listenerId]
 * @param {number} [filters.beaconId]
 * @param {Date|string} [filters.from]
 * @param {Date|string} [filters.to]
 * @param {number} [filters.limit=100]
 * @param {number} [filters.skip=0]
 * @returns {Promise<Array<TelemetryEvent>>}
 */
async function queryEvents(filters = {}) {
  const { sessionId, listenerId, beaconId, from, to, limit = 100, skip = 0 } = filters;

  const match = {};

  if (sessionId) match['meta.sessionId'] = sessionId;
  if (listenerId) match['meta.listenerId'] = listenerId;
  if (beaconId !== undefined) match['meta.beaconId'] = Number(beaconId);

  if (from || to) {
    match.timestamp = {};
    if (from) match.timestamp.$gte = new Date(from);
    if (to) match.timestamp.$lte = new Date(to);
  }

  return TelemetryEvent.find(match)
    .sort({ timestamp: -1 })
    .skip(Number(skip))
    .limit(Math.min(Number(limit), 1000))
    .lean();
}

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * Get a time-bucketed timeline of avg gain & distance for a session.
 *
 * @param {string} sessionId
 * @param {Date}   from
 * @param {Date}   to
 * @param {string} bucket  - 'second' | 'minute' | 'hour'
 * @returns {Promise<Array>}
 */
async function getTimeline(sessionId, from, to, bucket = 'minute') {
  const bucketMap = {
    second: '$second',
    minute: '$minute',
    hour: '$hour',
  };
  const mongoDateOp = bucketMap[bucket] || '$minute';
  return TelemetryEvent.getSessionTimeline(
    sessionId,
    new Date(from),
    new Date(to),
    mongoDateOp
  );
}

/**
 * Zone time-distribution for a session.
 *
 * @param {string} sessionId
 * @returns {Promise<Array>}
 */
async function getZoneDistribution(sessionId) {
  return TelemetryEvent.getZoneDistribution(sessionId);
}

/**
 * Get the peak gain moment in a session.
 *
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
async function getPeakGainEvent(sessionId) {
  return TelemetryEvent.getPeakGainEvent(sessionId);
}

/**
 * Compute and return a full summary for a session, then update the
 * AudioSession document with the computed stats.
 *
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
async function computeSessionSummary(sessionId) {
  const [zoneDist, peakEvent, timelineRaw] = await Promise.all([
    TelemetryEvent.getZoneDistribution(sessionId),
    TelemetryEvent.getPeakGainEvent(sessionId),
    TelemetryEvent.aggregate([
      { $match: { 'meta.sessionId': sessionId } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          avgGain: { $avg: '$measurements.gain' },
          avgDistance: { $avg: '$measurements.distanceMeters' },
          peakGain: { $max: '$measurements.gain' },
          minDistance: { $min: '$measurements.distanceMeters' },
        },
      },
    ]),
  ]);

  const stats = timelineRaw[0] || {
    totalEvents: 0,
    avgGain: null,
    avgDistance: null,
    peakGain: null,
    minDistance: null,
  };

  // Build zoneSplit percentages
  const totalZoneEvents = zoneDist.reduce((s, z) => s + z.count, 0);
  const zoneSplit = { core: 0, rolloff: 0, silent: 0 };
  zoneDist.forEach((z) => {
    if (zoneSplit[z.zone] !== undefined) {
      zoneSplit[z.zone] = totalZoneEvents > 0
        ? Math.round((z.count / totalZoneEvents) * 100)
        : 0;
    }
  });

  const summary = {
    totalEvents: stats.totalEvents,
    avgGain: stats.avgGain ? parseFloat(stats.avgGain.toFixed(4)) : null,
    avgDistanceMeters: stats.avgDistance ? parseFloat(stats.avgDistance.toFixed(2)) : null,
    peakGain: stats.peakGain,
    minDistanceMeters: stats.minDistance,
    zoneSplit,
  };

  // Update the AudioSession document
  await AudioSession.findOneAndUpdate(
    { sessionId },
    { $set: { summary } },
    { new: true }
  );

  return { summary, peakEvent };
}

// ─── Internal: Build a TelemetryEvent document from raw payload ───────────────

/**
 * @param {Object} p - Raw payload
 * @returns {Object} Mongoose-ready document
 */
function buildEventDoc(p) {
  return {
    timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
    meta: {
      sessionId: p.sessionId,
      listenerId: p.listenerId || 'anonymous',
      beaconId: Number(p.beaconId),
      beaconName: p.beaconName || '',
      sourceType: p.sourceType || 'synth',
    },
    measurements: {
      distanceMeters: Number(p.distanceMeters),
      gain: Number(p.gain),
      pan: Number(p.pan),
      zone: p.zone,
      attenuationModel: p.attenuationModel || 'inverse',
      rolloffFactor: p.rolloffFactor !== undefined ? Number(p.rolloffFactor) : 1.0,
      masterVolume: p.masterVolume !== undefined ? Number(p.masterVolume) : 1.0,
      fftSnapshot: Array.isArray(p.fftSnapshot) ? p.fftSnapshot : undefined,
      listenerPosition: {
        x: Number(p.listenerX),
        y: Number(p.listenerY),
        lat: p.lat || null,
        lon: p.lon || null,
      },
    },
  };
}

module.exports = {
  ingestOne,
  ingestBatch,
  queryEvents,
  getTimeline,
  getZoneDistribution,
  getPeakGainEvent,
  computeSessionSummary,
};
