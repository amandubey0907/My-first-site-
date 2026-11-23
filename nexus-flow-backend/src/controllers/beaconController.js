/**
 * beaconController.js — HTTP Controller for Beacon Node Registry
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

const BeaconNode = require('../models/BeaconNode');

// GET /api/beacons
async function getBeacons(req, res, next) {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.roomId) filter.roomId = req.query.roomId;

    const beacons = await BeaconNode.find(filter).sort({ beaconId: 1 }).lean();
    res.json({ success: true, count: beacons.length, data: beacons });
  } catch (err) {
    next(err);
  }
}

// GET /api/beacons/:beaconId
async function getBeacon(req, res, next) {
  try {
    const beacon = await BeaconNode.findOne({ beaconId: Number(req.params.beaconId) }).lean();
    if (!beacon) return res.status(404).json({ success: false, message: 'Beacon not found.' });
    res.json({ success: true, data: beacon });
  } catch (err) {
    next(err);
  }
}

// POST /api/beacons
async function createBeacon(req, res, next) {
  try {
    const beacon = await BeaconNode.create(req.body);
    res.status(201).json({ success: true, message: 'Beacon created.', data: beacon });
  } catch (err) {
    next(err);
  }
}

// PUT /api/beacons/:beaconId
async function updateBeacon(req, res, next) {
  try {
    const beacon = await BeaconNode.findOneAndUpdate(
      { beaconId: Number(req.params.beaconId) },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!beacon) return res.status(404).json({ success: false, message: 'Beacon not found.' });
    res.json({ success: true, message: 'Beacon updated.', data: beacon });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/beacons/:beaconId
async function deleteBeacon(req, res, next) {
  try {
    const beacon = await BeaconNode.findOneAndDelete({ beaconId: Number(req.params.beaconId) });
    if (!beacon) return res.status(404).json({ success: false, message: 'Beacon not found.' });
    res.json({ success: true, message: 'Beacon deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBeacons, getBeacon, createBeacon, updateBeacon, deleteBeacon };
