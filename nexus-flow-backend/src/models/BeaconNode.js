/**
 * BeaconNode.js — Mongoose Model for Audio Beacon Registry
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Stores the persistent configuration of each spatial audio beacon/transmitter.
 * Mirrors the audioNodes[] array in app.js but persisted in MongoDB
 * so other team members (GPS, WebSocket, User Management) can query it.
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeaconNodeSchema = new Schema(
  {
    /** Numeric ID matching app.js audioNodes[].id */
    beaconId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    /** Canvas X position (pixels) — 2D radar coordinate */
    x: { type: Number, required: true },
    /** Canvas Y position (pixels) — 2D radar coordinate */
    y: { type: Number, required: true },

    /** Real-world geospatial coordinates (optional, for GPS/Mapbox integration) */
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },

    /** Inner 100% gain radius (meters / pixels) */
    refDistance: { type: Number, required: true, min: 1 },
    /** Outer cutoff radius (0% gain beyond this) */
    maxDistance: { type: Number, required: true, min: 1 },

    /** Synth tone frequency in Hz */
    frequency: { type: Number, required: true, min: 20, max: 20000 },

    /** Display color (hex string) */
    color: { type: String, default: '#06b6d4' },

    /** Whether beacon is currently active/broadcasting */
    isActive: { type: Boolean, default: true, index: true },

    /** Optional: room or zone this beacon belongs to */
    roomId: { type: String, default: null, index: true },
  },
  {
    collection: 'beaconnodes',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    versionKey: false,
  }
);

module.exports = mongoose.model('BeaconNode', BeaconNodeSchema);
