/**
 * AudioSession.js — Mongoose Model for Audio Session Registry
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Tracks the lifecycle of each audio listening session:
 *   - Session start / end time
 *   - Configuration snapshot (attenuation model, rolloff factor, etc.)
 *   - Computed summary stats (populated at session close or on demand)
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-Schema: Session Configuration ───────────────────────────────────────
const SessionConfigSchema = new Schema(
  {
    /** Attenuation model used: 'inverse' | 'linear' | 'exponential' */
    attenuationModel: {
      type: String,
      enum: ['inverse', 'linear', 'exponential'],
      default: 'inverse',
    },
    rolloffFactor: { type: Number, default: 1.0, min: 0 },
    masterVolume: { type: Number, default: 1.0, min: 0, max: 1 },
    /** ID of the target beacon when session started */
    initialBeaconId: { type: Number, default: 0 },
    sourceType: {
      type: String,
      enum: ['synth', 'mic'],
      default: 'synth',
    },
  },
  { _id: false }
);

// ─── Sub-Schema: Session Summary Stats ───────────────────────────────────────
const SessionSummarySchema = new Schema(
  {
    totalEvents: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    avgGain: { type: Number, default: null },
    avgDistanceMeters: { type: Number, default: null },
    peakGain: { type: Number, default: null },
    minDistanceMeters: { type: Number, default: null },
    /** Percentage of time in each zone */
    zoneSplit: {
      core: { type: Number, default: 0 },
      rolloff: { type: Number, default: 0 },
      silent: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

// ─── Main AudioSession Schema ─────────────────────────────────────────────────
const AudioSessionSchema = new Schema(
  {
    /** UUID v4 or nanoid — matches meta.sessionId in TelemetryEvent */
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    listenerId: {
      type: String,
      required: true,
      index: true,
    },

    listenerLabel: {
      type: String,
      default: 'Listener',
    },

    /** Session lifecycle state */
    status: {
      type: String,
      enum: ['active', 'closed', 'error'],
      default: 'active',
      index: true,
    },

    /** Configuration at session start */
    config: {
      type: SessionConfigSchema,
      default: () => ({}),
    },

    /** Computed summary (populated on session close) */
    summary: {
      type: SessionSummarySchema,
      default: () => ({}),
    },

    startedAt: { type: Date, default: Date.now, index: true },
    closedAt: { type: Date, default: null },
  },
  {
    collection: 'audiosessions',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    versionKey: false,
  }
);

// ─── Instance Method: Close a session ────────────────────────────────────────
/**
 * Marks a session as closed and stores the computed summary stats.
 * @param {Object} summaryData - Pre-computed summary from TelemetryEvent aggregation
 * @returns {Promise<AudioSession>}
 */
AudioSessionSchema.methods.close = async function (summaryData = {}) {
  this.status = 'closed';
  this.closedAt = new Date();
  if (summaryData) {
    Object.assign(this.summary, summaryData);
    if (this.startedAt && this.closedAt) {
      this.summary.durationSeconds = Math.round(
        (this.closedAt - this.startedAt) / 1000
      );
    }
  }
  return this.save();
};

// ─── Static: Find active sessions ─────────────────────────────────────────────
AudioSessionSchema.statics.findActive = function () {
  return this.find({ status: 'active' }).sort({ startedAt: -1 });
};

module.exports = mongoose.model('AudioSession', AudioSessionSchema);
