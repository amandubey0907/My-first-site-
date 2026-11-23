/**
 * errorHandler.js — Global Express Error Handler
 * Nexus Flow Backend | Geospatial Proximity Audio Ecosystem
 * Author: Aman Dwivedi
 */

'use strict';

/**
 * Global error handler middleware.
 * Must have exactly 4 parameters to be recognized by Express as error middleware.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: 'Database validation failed.',
      errors: messages,
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for \`${field}\`.`,
    });
  }

  // Mongoose cast error (bad ObjectId / type)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field \`${err.path}\`: ${err.value}`,
    });
  }

  // Generic server error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = errorHandler;
