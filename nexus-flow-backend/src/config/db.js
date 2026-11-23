/**
 * db.js — MongoDB Connection Manager
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Establishes a Mongoose connection to MongoDB and sets up:
 *  - Time Series collection for TelemetryEvent (auto-created on first use)
 *  - Connection event logging
 *  - Graceful disconnect on process termination
 */

'use strict';

const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the URI from environment variables.
 * This function is idempotent — safe to call multiple times.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      '[DB] MONGODB_URI is not set. Please copy .env.example → .env and fill in your connection string.'
    );
  }

  // Mongoose 8 connection options
  const options = {
    // Auto-create indexes defined in schemas
    autoIndex: true,
    // Keep the connection pool healthy
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  mongoose.connection.on('connecting', () => {
    console.log('[DB] Connecting to MongoDB...');
  });

  mongoose.connection.on('connected', () => {
    console.log(`[DB] ✅ Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] ❌ Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] ⚠️  MongoDB disconnected.');
  });

  await mongoose.connect(uri, options);

  // Ensure Time Series collection exists (MongoDB 5.0+)
  await ensureTimeSeriesCollection(mongoose.connection);
}

/**
 * Ensure the MongoDB Time Series collection for telemetry exists.
 * MongoDB requires the timeseries option to be set at collection creation time.
 * We use createCollection() with { ignoreExistingError: true } pattern.
 *
 * @param {mongoose.Connection} connection
 */
async function ensureTimeSeriesCollection(connection) {
  const db = connection.db;
  const collectionName = 'telemetryevents';

  const existingCollections = await db.listCollections({ name: collectionName }).toArray();

  if (existingCollections.length === 0) {
    console.log('[DB] Creating Time Series collection: telemetryevents ...');
    await db.createCollection(collectionName, {
      timeseries: {
        timeField: 'timestamp',      // Required: the Date field that is the time axis
        metaField: 'meta',           // Optional: metadata for grouping (sessionId, beaconId, etc.)
        granularity: 'seconds',      // 'seconds' | 'minutes' | 'hours'
      },
      // Automatically expire raw telemetry documents after TTL
      expireAfterSeconds: parseInt(process.env.TELEMETRY_TTL_SECONDS || '604800', 10),
    });
    console.log('[DB] ✅ Time Series collection created: telemetryevents');
  } else {
    console.log('[DB] ✅ Time Series collection already exists: telemetryevents');
  }
}

/**
 * Gracefully close the MongoDB connection.
 * Called on SIGINT / SIGTERM.
 */
async function disconnectDB() {
  await mongoose.disconnect();
  console.log('[DB] MongoDB connection closed gracefully.');
}

module.exports = { connectDB, disconnectDB };
