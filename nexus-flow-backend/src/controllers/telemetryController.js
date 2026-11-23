/**
 * telemetryController.js — HTTP Controller for Telemetry Ingestion
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

const telemetryService = require('../services/telemetryService');

// ─── POST /api/telemetry ──────────────────────────────────────────────────────
/**
 * Ingest a single telemetry snapshot.
 *
 * Required body fields:
 *   sessionId, beaconId, distanceMeters, gain, pan, zone,
 *   listenerX, listenerY
 *
 * Optional:
 *   timestamp, listenerId, beaconName, sourceType,
 *   attenuationModel, rolloffFactor, masterVolume,
 *   fftSnapshot, lat, lon
 */
async function ingestOne(req, res, next) {
  try {
    const event = await telemetryService.ingestOne(req.body);
    res.status(201).json({
      success: true,
      message: 'Telemetry event recorded.',
      data: { id: event._id, timestamp: event.timestamp },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/telemetry/batch ────────────────────────────────────────────────
/**
 * Bulk ingest an array of telemetry events.
 * Body: { events: [ {...}, {...}, ... ] }
 */
async function ingestBatch(req, res, next) {
  try {
    const events = req.body.events;
    if (!Array.isArray(events)) {
      return res.status(400).json({ success: false, message: '`events` must be an array.' });
    }
    const result = await telemetryService.ingestBatch(events);
    res.status(201).json({
      success: true,
      message: `Batch ingested: ${result.insertedCount} events recorded.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/telemetry ───────────────────────────────────────────────────────
/**
 * Query telemetry events with optional filters.
 *
 * Query params: sessionId, listenerId, beaconId, from, to, limit, skip
 */
async function getEvents(req, res, next) {
  try {
    const events = await telemetryService.queryEvents(req.query);
    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/telemetry/timeline ──────────────────────────────────────────────
/**
 * Time-bucketed timeline for a session.
 * Query params: sessionId (required), from, to, bucket (second|minute|hour)
 */
async function getTimeline(req, res, next) {
  try {
    const { sessionId, from, to, bucket } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '`sessionId` is required.' });
    }
    const fromDate = from ? new Date(from) : new Date(Date.now() - 3600 * 1000);
    const toDate = to ? new Date(to) : new Date();
    const timeline = await telemetryService.getTimeline(sessionId, fromDate, toDate, bucket);
    res.json({ success: true, count: timeline.length, data: timeline });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/telemetry/zone-distribution ────────────────────────────────────
/**
 * Zone time-distribution breakdown for a session.
 * Query params: sessionId (required)
 */
async function getZoneDistribution(req, res, next) {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '`sessionId` is required.' });
    }
    const zones = await telemetryService.getZoneDistribution(sessionId);
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/telemetry/peak ──────────────────────────────────────────────────
/**
 * Peak gain event (closest listener moment) for a session.
 * Query params: sessionId (required)
 */
async function getPeakGainEvent(req, res, next) {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '`sessionId` is required.' });
    }
    const event = await telemetryService.getPeakGainEvent(sessionId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'No events found for this session.' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ingestOne,
  ingestBatch,
  getEvents,
  getTimeline,
  getZoneDistribution,
  getPeakGainEvent,
};
