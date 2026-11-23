/**
 * sessionController.js — HTTP Controller for Audio Session Lifecycle
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

const { randomUUID } = require('crypto');
const AudioSession = require('../models/AudioSession');
const telemetryService = require('../services/telemetryService');

// ─── POST /api/sessions ───────────────────────────────────────────────────────
/**
 * Open a new audio session. Returns the sessionId to use in all
 * subsequent telemetry POSTs from the front-end.
 *
 * Body: { listenerId, listenerLabel, config: { attenuationModel, rolloffFactor, ... } }
 */
async function createSession(req, res, next) {
  try {
    const { listenerId = 'anonymous', listenerLabel = 'Listener', config = {} } = req.body;

    const sessionId = randomUUID();

    const session = await AudioSession.create({
      sessionId,
      listenerId,
      listenerLabel,
      config,
      status: 'active',
      startedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Audio session opened.',
      data: { sessionId: session.sessionId, startedAt: session.startedAt },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/sessions ────────────────────────────────────────────────────────
/**
 * List audio sessions.
 * Query params: status (active|closed), listenerId, limit, skip
 */
async function getSessions(req, res, next) {
  try {
    const { status, listenerId, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (listenerId) filter.listenerId = listenerId;

    const sessions = await AudioSession.find(filter)
      .sort({ startedAt: -1 })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 100))
      .lean();

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/sessions/:sessionId ────────────────────────────────────────────
/**
 * Get a single session by its sessionId.
 */
async function getSession(req, res, next) {
  try {
    const session = await AudioSession.findOne({ sessionId: req.params.sessionId }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/sessions/:sessionId/close ────────────────────────────────────
/**
 * Close an active session. Triggers summary computation from telemetry data.
 */
async function closeSession(req, res, next) {
  try {
    const session = await AudioSession.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.status === 'closed') {
      return res.status(409).json({ success: false, message: 'Session is already closed.' });
    }

    // Compute summary from telemetry then close
    const { summary } = await telemetryService.computeSessionSummary(session.sessionId);
    await session.close(summary);

    res.json({
      success: true,
      message: 'Session closed and summary computed.',
      data: { sessionId: session.sessionId, summary, closedAt: session.closedAt },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/sessions/:sessionId/summary ────────────────────────────────────
/**
 * Recompute and return the full analytics summary for a session on demand.
 */
async function getSessionSummary(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await AudioSession.findOne({ sessionId }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    const result = await telemetryService.computeSessionSummary(sessionId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSession,
  getSessions,
  getSession,
  closeSession,
  getSessionSummary,
};
