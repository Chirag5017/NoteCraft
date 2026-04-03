'use strict';

/**
 * 404 Not Found middleware — catches unmatched routes.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
function notFound(_req, res) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

/**
 * Global error handler middleware.
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}

module.exports = { notFound, errorHandler };
