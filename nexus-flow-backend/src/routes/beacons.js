/**
 * beacons.js — Beacon Node Routes
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/beaconController');

const router = Router();

/** GET    /api/beacons           — List all beacons */
router.get('/', ctrl.getBeacons);

/** GET    /api/beacons/:beaconId — Get one beacon */
router.get('/:beaconId', ctrl.getBeacon);

/** POST   /api/beacons           — Register a new beacon */
router.post('/', ctrl.createBeacon);

/** PUT    /api/beacons/:beaconId — Update beacon config */
router.put('/:beaconId', ctrl.updateBeacon);

/** DELETE /api/beacons/:beaconId — Remove a beacon */
router.delete('/:beaconId', ctrl.deleteBeacon);

module.exports = router;
