/**
 * app.js — Nexus Flow Backend Entry Point
 * MongoDB Time-Series Telemetry Ingestion Server
 * Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Stack: Node.js / Express / Mongoose / MongoDB Time Series
 *
 * API Routes:
 *   POST   /api/telemetry              — Ingest single telemetry event
 *   POST   /api/telemetry/batch        — Bulk ingest up to 500 events
 *   GET    /api/telemetry              — Query telemetry events
 *   GET    /api/telemetry/timeline     — Time-bucketed gain/distance chart data
 *   GET    /api/telemetry/zone-distribution — Zone time-split
 *   GET    /api/telemetry/peak         — Peak gain (closest) event
 *
 *   POST   /api/sessions               — Open audio session
 *   GET    /api/sessions               — List sessions
 *   GET    /api/sessions/:id           — Get session
 *   PATCH  /api/sessions/:id/close     — Close session + compute summary
 *   GET    /api/sessions/:id/summary   — Recompute session summary
 *
 *   GET    /api/beacons                — List beacons
 *   GET    /api/beacons/:id            — Get beacon
 *   POST   /api/beacons               — Register beacon
 *   PUT    /api/beacons/:id            — Update beacon
 *   DELETE /api/beacons/:id            — Delete beacon
 *
 *   GET    /api/health                 — Health check
 */

'use strict';

// ─── Load Environment Variables ───────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB, disconnectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const telemetryRoutes = require('./routes/telemetry');
const sessionRoutes = require('./routes/sessions');
const beaconRoutes = require('./routes/beacons');

// ─── App Initialization ───────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── CORS Configuration ───────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (curl, Postman, same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (skip in test)
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nexus-flow-backend',
    version: '1.0.0',
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/beacons', beaconRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║          NEXUS FLOW BACKEND  —  v1.0.0               ║');
      console.log('║   MongoDB Telemetry Ingestion | Proximity Audio       ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  🚀  Server     : http://localhost:${PORT}             ║`);
      console.log(`║  🌿  Env        : ${NODE_ENV.padEnd(32)}║`);
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log('║  Routes:                                              ║');
      console.log('║   POST  /api/telemetry          (ingest 1 event)      ║');
      console.log('║   POST  /api/telemetry/batch    (bulk ingest)         ║');
      console.log('║   GET   /api/telemetry          (query events)        ║');
      console.log('║   GET   /api/telemetry/timeline (time chart)          ║');
      console.log('║   POST  /api/sessions           (open session)        ║');
      console.log('║   PATCH /api/sessions/:id/close (close session)       ║');
      console.log('║   GET   /api/beacons            (list beacons)        ║');
      console.log('║   GET   /api/health             (health check)        ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('[App] ❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[App] ${signal} received. Shutting down gracefully...`);
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[App] Unhandled Rejection:', reason);
});

start();

module.exports = app; // Export for testing
