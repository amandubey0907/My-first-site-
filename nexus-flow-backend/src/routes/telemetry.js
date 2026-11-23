/**
 * telemetry.js — Telemetry Routes
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/telemetryController');
const { validateTelemetryEvent, validateBatch } = require('../middleware/validate');

const router = Router();

/**
 * @route  POST /api/telemetry
 * @desc   Ingest a single proximity audio telemetry snapshot
 * @body   { sessionId, beaconId, distanceMeters, gain, pan, zone, listenerX, listenerY, ... }
 */
router.post('/', validateTelemetryEvent, ctrl.ingestOne);

/**
 * @route  POST /api/telemetry/batch
 * @desc   Bulk ingest up to MAX_BATCH_SIZE events
 * @body   { events: [ {...}, ... ] }
 */
router.post('/batch', validateBatch, ctrl.ingestBatch);

/**
 * @route  GET /api/telemetry
 * @desc   Query telemetry events
 * @query  sessionId, listenerId, beaconId, from, to, limit, skip
 */
router.get('/', ctrl.getEvents);

/**
 * @route  GET /api/telemetry/timeline
 * @desc   Time-bucketed gain/distance timeline for a session
 * @query  sessionId (required), from, to, bucket (second|minute|hour)
 */
router.get('/timeline', ctrl.getTimeline);

/**
 * @route  GET /api/telemetry/zone-distribution
 * @desc   Zone time-distribution for a session
 * @query  sessionId (required)
 */
router.get('/zone-distribution', ctrl.getZoneDistribution);

/**
 * @route  GET /api/telemetry/peak
 * @desc   Peak gain event (closest listener moment) for a session
 * @query  sessionId (required)
 */
router.get('/peak', ctrl.getPeakGainEvent);

module.exports = router;
