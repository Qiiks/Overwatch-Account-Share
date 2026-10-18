/**
 * Thrown by controllers; normalised into the API error envelope by errorMiddleware.
 */
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

module.exports = ApiError;
