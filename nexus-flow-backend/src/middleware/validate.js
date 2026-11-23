/**
 * validate.js — Request Validation Middleware
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 *
 * Lightweight field validation without external libraries.
 * Returns 422 Unprocessable Entity on validation failure.
 */

'use strict';

const REQUIRED_TELEMETRY_FIELDS = [
  'sessionId',
  'beaconId',
  'distanceMeters',
  'gain',
  'pan',
  'zone',
  'listenerX',
  'listenerY',
];

const VALID_ZONES = ['core', 'rolloff', 'silent'];
const VALID_MODELS = ['inverse', 'linear', 'exponential'];

/**
 * Validate a single telemetry event payload.
 */
function validateTelemetryEvent(req, res, next) {
  const body = req.body;
  const errors = [];

  // Required fields
  REQUIRED_TELEMETRY_FIELDS.forEach((field) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push(`\`${field}\` is required.`);
    }
  });

  if (errors.length > 0) {
    return res.status(422).json({ success: false, message: 'Validation failed.', errors });
  }

  // Range checks
  const gain = Number(body.gain);
  const pan = Number(body.pan);
  const dist = Number(body.distanceMeters);

  if (isNaN(gain) || gain < 0 || gain > 1)
    errors.push('`gain` must be a number between 0 and 1.');
  if (isNaN(pan) || pan < -1 || pan > 1)
    errors.push('`pan` must be a number between -1 and 1.');
  if (isNaN(dist) || dist < 0)
    errors.push('`distanceMeters` must be a non-negative number.');
  if (!VALID_ZONES.includes(body.zone))
    errors.push(`\`zone\` must be one of: ${VALID_ZONES.join(', ')}.`);
  if (body.attenuationModel && !VALID_MODELS.includes(body.attenuationModel))
    errors.push(`\`attenuationModel\` must be one of: ${VALID_MODELS.join(', ')}.`);

  if (errors.length > 0) {
    return res.status(422).json({ success: false, message: 'Validation failed.', errors });
  }

  next();
}

/**
 * Validate a batch ingest body.
 */
function validateBatch(req, res, next) {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(422).json({
      success: false,
      message: '`events` must be a non-empty array.',
    });
  }
  const maxBatch = parseInt(process.env.MAX_BATCH_SIZE || '500', 10);
  if (events.length > maxBatch) {
    return res.status(422).json({
      success: false,
      message: `Batch size ${events.length} exceeds limit of ${maxBatch}.`,
    });
  }
  next();
}

module.exports = { validateTelemetryEvent, validateBatch };
