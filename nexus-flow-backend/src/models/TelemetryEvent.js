/**
 * TelemetryEvent.js — Mongoose Model for Time-Series Telemetry
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Maps to the MongoDB Time Series collection "telemetryevents".
 *
 * Each document records one proximity audio telemetry snapshot:
 *   - timestamp   : Time axis (required by MongoDB Time Series)
 *   - meta        : Grouping metadata (sessionId, listenerId, beaconId)
 *   - measurements: The actual proximity/audio values
 *
 * MongoDB Time Series Design:
 *   timeField  = "timestamp"
 *   metaField  = "meta"
 *   granularity = "seconds"
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-Schema: Geospatial Position ────────────────────────────────────────
const PositionSchema = new Schema(
  {
    /** Canvas X coordinate (pixels) or real Longitude (degrees) */
    x: { type: Number, required: true },
    /** Canvas Y coordinate (pixels) or real Latitude (degrees) */
    y: { type: Number, required: true },
    /** Optional: real-world latitude for Haversine integration */
    lat: { type: Number, default: null },
    /** Optional: real-world longitude for Haversine integration */
    lon: { type: Number, default: null },
  },
  { _id: false }
);

// ─── Sub-Schema: Audio Measurements ─────────────────────────────────────────
const MeasurementsSchema = new Schema(
  {
    /** Euclidean or Haversine distance from listener to beacon (meters) */
    distanceMeters: { type: Number, required: true, min: 0 },

    /** Proximity gain factor [0.0 – 1.0] */
    gain: { type: Number, required: true, min: 0, max: 1 },

    /** Stereo panning factor [-1.0 Left … 0.0 Center … +1.0 Right] */
    pan: { type: Number, required: true, min: -1, max: 1 },

    /** Named proximity zone: 'core' | 'rolloff' | 'silent' */
    zone: {
      type: String,
      required: true,
      enum: ['core', 'rolloff', 'silent'],
    },

    /** Attenuation model active at time of capture: 'inverse' | 'linear' | 'exponential' */
    attenuationModel: {
      type: String,
      required: true,
      enum: ['inverse', 'linear', 'exponential'],
      default: 'inverse',
    },

    /** Rolloff factor used in attenuation calculation */
    rolloffFactor: { type: Number, default: 1.0, min: 0 },

    /** Master volume at time of capture [0 – 1] */
    masterVolume: { type: Number, default: 1.0, min: 0, max: 1 },

    /** FFT frequency band amplitude data snapshot (optional) */
    fftSnapshot: { type: [Number], default: undefined },

    /** Listener position at snapshot time */
    listenerPosition: { type: PositionSchema, required: true },
  },
  { _id: false }
);

// ─── Sub-Schema: Metadata (metaField for Time Series) ────────────────────────
const MetaSchema = new Schema(
  {
    /** Unique audio session identifier */
    sessionId: { type: String, required: true, index: true },

    /** Listener identifier (e.g. 'aman-dwivedi' or a user UUID) */
    listenerId: { type: String, required: true },

    /** Target beacon/audio node ID (matches audioNodes[].id in app.js) */
    beaconId: { type: Number, required: true },

    /** Beacon name for human readability */
    beaconName: { type: String, default: '' },

    /** Audio source type active during this event */
    sourceType: {
      type: String,
      enum: ['synth', 'mic'],
      default: 'synth',
    },
  },
  { _id: false }
);

// ─── Main TelemetryEvent Schema ───────────────────────────────────────────────
const TelemetryEventSchema = new Schema(
  {
    /**
     * TIME FIELD — Required by MongoDB Time Series.
     * Represents the exact moment this telemetry snapshot was captured.
     */
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    /**
     * META FIELD — Optional grouping metadata for Time Series bucketing.
     * MongoDB uses this to colocate related documents in the same bucket
     * for fast range queries: "give me all events for session X".
     */
    meta: {
      type: MetaSchema,
      required: true,
    },

    /**
     * MEASUREMENTS — The actual telemetry payload.
     * Not part of timeField or metaField; stored as regular document fields.
     */
    measurements: {
      type: MeasurementsSchema,
      required: true,
    },
  },
  {
    /**
     * IMPORTANT: Tell Mongoose this schema maps to the Time Series collection.
     * We set { autoCreate: false } because we pre-created the collection
     * in db.js with the timeseries options (Mongoose cannot set those options).
     */
    collection: 'telemetryevents',
    autoCreate: false,   // Collection created manually in db.js with timeseries options
    autoIndex: false,    // Time Series collections manage their own indexes
    timestamps: false,   // We manage 'timestamp' manually as the timeField
    versionKey: false,
  }
);

// ─── Static Helper Methods ────────────────────────────────────────────────────

/**
 * Retrieve time-bucketed aggregation of gain & distance over time.
 * Useful for plotting "proximity over time" charts.
 *
 * @param {string} sessionId
 * @param {Date}   fromDate
 * @param {Date}   toDate
 * @param {string} bucketSize  - '$minute' | '$hour' | '$second'
 * @returns {Promise<Array>}
 */
TelemetryEventSchema.statics.getSessionTimeline = async function (
  sessionId,
  fromDate,
  toDate,
  bucketSize = '$minute'
) {
  return this.aggregate([
    {
      $match: {
        'meta.sessionId': sessionId,
        timestamp: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $group: {
        _id: {
          bucket: { [bucketSize]: '$timestamp' },
        },
        avgGain: { $avg: '$measurements.gain' },
        avgDistance: { $avg: '$measurements.distanceMeters' },
        avgPan: { $avg: '$measurements.pan' },
        maxGain: { $max: '$measurements.gain' },
        minDistance: { $min: '$measurements.distanceMeters' },
        eventCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.bucket': 1 } },
  ]);
};

/**
 * Zone distribution: how much time the listener spent in each zone.
 *
 * @param {string} sessionId
 * @returns {Promise<Array>} [{ zone: 'core', count: N }, ...]
 */
TelemetryEventSchema.statics.getZoneDistribution = async function (sessionId) {
  return this.aggregate([
    { $match: { 'meta.sessionId': sessionId } },
    {
      $group: {
        _id: '$measurements.zone',
        count: { $sum: 1 },
        avgGain: { $avg: '$measurements.gain' },
      },
    },
    { $project: { zone: '$_id', count: 1, avgGain: 1, _id: 0 } },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Peak gain moment: the event when listener was closest (highest gain).
 *
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
TelemetryEventSchema.statics.getPeakGainEvent = async function (sessionId) {
  const results = await this.find({ 'meta.sessionId': sessionId })
    .sort({ 'measurements.gain': -1 })
    .limit(1)
    .lean();
  return results[0] || null;
};

module.exports = mongoose.model('TelemetryEvent', TelemetryEventSchema);
