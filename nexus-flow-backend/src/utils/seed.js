/**
 * seed.js — Database Seed Script
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Populates the BeaconNode collection with the 3 default beacons
 * matching the audioNodes[] array defined in app.js.
 *
 * Run with: npm run seed
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const BeaconNode = require('../models/BeaconNode');

const DEFAULT_BEACONS = [
  {
    beaconId: 0,
    name: 'Main Stage Beacon',
    x: 400,
    y: 200,
    refDistance: 40,
    maxDistance: 240,
    frequency: 220,
    color: '#06b6d4',
    isActive: true,
  },
  {
    beaconId: 1,
    name: 'Voice Channel Alpha',
    x: 180,
    y: 360,
    refDistance: 35,
    maxDistance: 190,
    frequency: 330,
    color: '#10b981',
    isActive: true,
  },
  {
    beaconId: 2,
    name: 'Ambient Zone',
    x: 620,
    y: 380,
    refDistance: 45,
    maxDistance: 220,
    frequency: 440,
    color: '#a855f7',
    isActive: true,
  },
];

async function seed() {
  try {
    console.log('\n[Seed] 🌱 Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing beacons...');
    await BeaconNode.deleteMany({});

    console.log('[Seed] Inserting default beacons...');
    const result = await BeaconNode.insertMany(DEFAULT_BEACONS);
    console.log(`[Seed] ✅ Inserted ${result.length} beacons:`);
    result.forEach((b) => console.log(`       • [${b.beaconId}] ${b.name} (${b.frequency} Hz)`));

    await disconnectDB();
    console.log('[Seed] Done.\n');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] ❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
