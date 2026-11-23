# Nexus Flow Backend 🌊
## MongoDB Time-Series Telemetry Ingestion Service
### Geospatial Proximity Audio Ecosystem — Backend Module

> **Author:** Aman Dwivedi  
> **Stack:** Node.js · Express · Mongoose · MongoDB Time Series  
> **Version:** 1.0.0

---

## 📐 Architecture

```
nexus-flow-backend/
├── src/
│   ├── app.js                     # Express server entry point
│   ├── config/
│   │   └── db.js                  # MongoDB connection + Time Series collection setup
│   ├── models/
│   │   ├── TelemetryEvent.js      # ⏱️  MongoDB Time Series model (timeField: timestamp)
│   │   ├── AudioSession.js        # 🎧  Session lifecycle & summary stats
│   │   └── BeaconNode.js          # 📡  Beacon/transmitter registry
│   ├── routes/
│   │   ├── telemetry.js           # POST/GET /api/telemetry
│   │   ├── sessions.js            # POST/GET/PATCH /api/sessions
│   │   └── beacons.js             # CRUD /api/beacons
│   ├── controllers/
│   │   ├── telemetryController.js
│   │   ├── sessionController.js
│   │   └── beaconController.js
│   ├── services/
│   │   └── telemetryService.js    # Core ingestion + analytics logic
│   ├── middleware/
│   │   ├── validate.js            # Request validation
│   │   └── errorHandler.js        # Global error handler
│   └── utils/
│       ├── seed.js                # DB seed script (default beacons)
│       └── testConnection.js      # Connection test
├── .env.example                   # Copy → .env
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd nexus-flow-backend
npm install
```

### 2. Configure environment
```bash
# Copy the example config
cp .env.example .env
# Edit .env and set your MONGODB_URI
```

### 3. Seed the database with default beacons
```bash
npm run seed
```

### 4. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

The API will be live at **http://localhost:4000**

---

## 🔌 API Reference

### 🩺 Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server + DB health check |

---

### 📊 Telemetry Ingestion

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/telemetry` | Ingest 1 proximity event |
| `POST` | `/api/telemetry/batch` | Bulk ingest (up to 500) |
| `GET` | `/api/telemetry` | Query events with filters |
| `GET` | `/api/telemetry/timeline` | Time-bucketed chart data |
| `GET` | `/api/telemetry/zone-distribution` | Zone time-split |
| `GET` | `/api/telemetry/peak` | Peak gain event |

#### Single Event Payload (`POST /api/telemetry`)
```json
{
  "sessionId": "uuid-of-session",
  "beaconId": 0,
  "beaconName": "Main Stage Beacon",
  "distanceMeters": 85.4,
  "gain": 0.62,
  "pan": -0.3,
  "zone": "rolloff",
  "listenerX": 310,
  "listenerY": 290,
  "attenuationModel": "inverse",
  "rolloffFactor": 1.0,
  "masterVolume": 0.8,
  "sourceType": "synth",
  "timestamp": "2026-11-23T15:30:00.000Z"
}
```

#### Batch Payload (`POST /api/telemetry/batch`)
```json
{
  "events": [
    { "sessionId": "...", "beaconId": 0, "distanceMeters": 85.4, ... },
    { "sessionId": "...", "beaconId": 0, "distanceMeters": 90.1, ... }
  ]
}
```

---

### 🎧 Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Open new session → returns `sessionId` |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/:id` | Get session details |
| `PATCH` | `/api/sessions/:id/close` | Close session + compute stats |
| `GET` | `/api/sessions/:id/summary` | Get analytics summary |

#### Open Session (`POST /api/sessions`)
```json
{
  "listenerId": "aman-dwivedi",
  "listenerLabel": "Aman Dwivedi (Listener)",
  "config": {
    "attenuationModel": "inverse",
    "rolloffFactor": 1.0,
    "masterVolume": 0.8,
    "initialBeaconId": 0,
    "sourceType": "synth"
  }
}
```

---

### 📡 Beacons

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/beacons` | List all beacons |
| `GET` | `/api/beacons/:id` | Get single beacon |
| `POST` | `/api/beacons` | Register new beacon |
| `PUT` | `/api/beacons/:id` | Update beacon config |
| `DELETE` | `/api/beacons/:id` | Remove beacon |

---

## 🗄️ MongoDB Time Series Design

The core `TelemetryEvent` collection uses MongoDB's native **Time Series** format:

```
Collection: telemetryevents
  ├── timeField  : "timestamp"   ← Date axis (required)
  ├── metaField  : "meta"        ← Grouping (sessionId, beaconId, listenerId)
  └── granularity: "seconds"     ← Bucket optimization
```

**Why Time Series?**
- 📦 Automatic data bucketing — MongoDB groups nearby time points together
- ⚡ 10–100× faster range queries: *"all events in the last 5 minutes for session X"*
- 🗜️ Built-in compression — reduces storage for high-frequency telemetry
- 🕐 TTL auto-expiry — raw events auto-delete after 7 days (configurable)

---

## 🤝 Integration Guide (Other Team Members)

### GPS / Mobile Mapping (Leaflet / Mapbox)
```js
// Include real lat/lon in every telemetry POST
{
  "distanceMeters": proximity.getHaversineDistance(userLat, userLon, beaconLat, beaconLon),
  "lat": userLat,
  "lon": userLon
}
// Store beacon real coordinates via PUT /api/beacons/:id
{ "lat": 28.6139, "lon": 77.2090 }
```

### WebSockets / Backend Stream
```js
// On each audio spatial update from WebRTC stream, POST telemetry:
socket.on('proximity-update', (data) => {
  fetch('http://localhost:4000/api/telemetry', {
    method: 'POST', body: JSON.stringify({ sessionId, ...data })
  });
});
```

### User Management & Rooms
```js
// When user joins a room, open a session
const { data } = await fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({ listenerId: userId, listenerLabel: userName })
}).then(r => r.json());
const sessionId = data.sessionId;
// Use sessionId in all telemetry events for this user's session
```

---

## 📅 Changelog

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| v1.0.0 | 2026-11-23 | Aman Dwivedi | Initial release — Time Series ingestion, sessions, beacons |
