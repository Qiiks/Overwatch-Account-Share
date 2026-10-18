const ApiError = require('../utils/ApiError');
const { logger } = require('../utils/logger');

// PostgREST / PostgreSQL error codes we translate into the closed API code set.
const PG_ERRORS = {
  23505: [409, 'CONFLICT', 'A record with that value already exists'],
  23503: [409, 'CONFLICT', 'A related record constraint was violated'],
  PGRST116: [404, 'NOT_FOUND', 'Resource not found'],
  // Invalid text representation: a malformed uuid or other typed value reaching PostgREST.
  // The request is unprocessable rather than a server fault, so these answer 400 (this is the
  // backstop for every unvalidated id, not just the routes that validate their fields).
  '22P02': [400, 'VALIDATION_FAILED', 'A field has an invalid format'],
  // Schema drift: the live database is missing a column this build expects, which happens when
  // the migrations were not applied in order. Still a server fault, but naming it makes the
  // condition diagnosable from the response alone instead of a bare 500.
  '42703': [500, 'SCHEMA_OUT_OF_DATE', 'The database schema is missing a field this version expects'],
  PGRST204: [500, 'SCHEMA_OUT_OF_DATE', 'The database schema is missing a field this version expects'],
  // 205 is the table-level twin of 204: PostgREST reports a table it cannot see in its schema
  // cache (admin_audit_logs and email_services are absent until the reconcile migration runs).
  PGRST205: [500, 'SCHEMA_OUT_OF_DATE', 'The database schema is missing a table this version expects'],
};

/**
 * Single normaliser for every error: { success: false, error: { message, code, details? } }.
 * Never echoes upstream messages, SQL text or stacks outside development.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  let status = 500;
  let code = 'INTERNAL';
  let message = 'Internal server error';
  let details;
  let loud = false;

  if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    code = 'VALIDATION_FAILED';
    message = 'Malformed JSON body';
  } else if (err && err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body too large';
  } else if (err && err.name === 'JsonWebTokenError') {
    status = 401;
    code = 'UNAUTHENTICATED';
    message = 'Invalid token';
  } else if (err && err.name === 'TokenExpiredError') {
    status = 401;
    code = 'UNAUTHENTICATED';
    message = 'Token expired';
  } else if (err && Object.prototype.hasOwnProperty.call(PG_ERRORS, err.code)) {
    [status, code, message] = PG_ERRORS[err.code];
  } else if (err && err.code === '42P01') {
    // undefined_table — almost always a schema/migration problem, never the caller's fault.
    loud = true;
    message = 'Database schema is missing a required table';
  } else if (
    err &&
    (err.name === 'FetchError' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ETIMEDOUT' ||
      /fetch failed/i.test(err.message || ''))
  ) {
    // Supabase unreachable: an outage, not a bug — separable in logs and client toasts.
    status = 502;
    code = 'UPSTREAM_UNAVAILABLE';
    message = 'The database is temporarily unreachable. Please try again shortly.';
    loud = true;
  } else if (err && (err.status || err.statusCode)) {
    status = err.status || err.statusCode;
    message = err.message || message;
    if (status === 403) code = 'FORBIDDEN';
    else if (status === 401) code = 'UNAUTHENTICATED';
    else if (status === 404) code = 'NOT_FOUND';
  }

  logger.error(`${req.method} ${req.originalUrl} -> ${status} ${code}`, {
    stack: err && err.stack,
    upstreamCode: err && err.code,
    userId: req.user && req.user.id,
    loud,
  });

  const body = { message, code };
  if (details !== undefined) body.details = details;
  if (isDev && err && err.stack) body.details = { ...(body.details || {}), stack: err.stack };

  return res.status(status).json({ success: false, error: body });
};

module.exports = errorHandler;
