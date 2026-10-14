/**
 * An error that carries the HTTP status code it should be sent with.
 * Anything thrown inside a controller ends up in the central error handler.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps an async controller so a rejected promise reaches Express's
 * error handler instead of hanging the request.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { ApiError, asyncHandler };
