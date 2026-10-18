/**
 * Success envelope: { success: true, data, meta? }
 * Health probes are the only endpoints that answer bare.
 */
const ok = (res, data, status = 200, meta) => {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
};

/**
 * Error envelope: { success: false, error: { message, code, details? } }
 * Prefer throwing ApiError; use this only where a throw would lose context.
 */
const fail = (res, status, code, message, details) => {
  const error = { message, code };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
};

module.exports = { ok, fail };
