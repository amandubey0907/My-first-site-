/**
 * testConnection.js — MongoDB Connection Test Script
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Run with: npm test
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const BeaconNode = require('../models/BeaconNode');
const TelemetryEvent = require('../models/TelemetryEvent');
const AudioSession = require('../models/AudioSession');

async function test() {
  try {
    console.log('\n[Test] 🔌 Testing MongoDB connection...');
    await connectDB();

    console.log('[Test] ✅ Connection successful!');
    console.log('[Test] Checking collections...');

    const beaconCount = await BeaconNode.countDocuments();
    const sessionCount = await AudioSession.countDocuments();
    const telCount = await TelemetryEvent.countDocuments();

    console.log(`[Test]   • BeaconNodes    : ${beaconCount} document(s)`);
    console.log(`[Test]   • AudioSessions  : ${sessionCount} document(s)`);
    console.log(`[Test]   • TelemetryEvents: ${telCount} document(s)`);

    await disconnectDB();
    console.log('[Test] ✅ All checks passed.\n');
    process.exit(0);
  } catch (err) {
    console.error('[Test] ❌ Connection test failed:', err.message);
    process.exit(1);
  }
}

test();
