/**
 * sessions.js — Session Routes
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/sessionController');

const router = Router();

/** POST   /api/sessions          — Open a new audio session */
router.post('/', ctrl.createSession);

/** GET    /api/sessions          — List sessions */
router.get('/', ctrl.getSessions);

/** GET    /api/sessions/:id      — Get one session */
router.get('/:sessionId', ctrl.getSession);

/** PATCH  /api/sessions/:id/close — Close a session & compute summary */
router.patch('/:sessionId/close', ctrl.closeSession);

/** GET    /api/sessions/:id/summary — On-demand summary recompute */
router.get('/:sessionId/summary', ctrl.getSessionSummary);

module.exports = router;
