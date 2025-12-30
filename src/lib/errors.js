/**
 * Error handling utilities for Capture Service
 * Provides standardized error codes and response formatting
 */

/**
 * Error codes used throughout the service
 */
export const ERROR_CODES = {
  INVALID_AUTH: 'INVALID_AUTH',
  CLIENT_NOT_ALLOWED: 'CLIENT_NOT_ALLOWED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  DURATION_TOO_LONG: 'DURATION_TOO_LONG',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  FORWARDING_FAILED: 'FORWARDING_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * HTTP status codes mapped to error codes
 */
export const ERROR_STATUS_MAP = {
  [ERROR_CODES.INVALID_AUTH]: 401,
  [ERROR_CODES.CLIENT_NOT_ALLOWED]: 403,
  [ERROR_CODES.FILE_TOO_LARGE]: 400,
  [ERROR_CODES.DURATION_TOO_LONG]: 400,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.TRANSCRIPTION_FAILED]: 502,
  [ERROR_CODES.FORWARDING_FAILED]: 503,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

/**
 * Create a standardized error response object
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} message - Human-readable error message
 * @returns {Object} Error response object
 */
export function createErrorResponse(errorCode, message) {
  return {
    success: false,
    error: errorCode,
    message: message,
  };
}

/**
 * Get HTTP status code for an error code
 * @param {string} errorCode - Error code from ERROR_CODES
 * @returns {number} HTTP status code
 */
export function getErrorStatus(errorCode) {
  return ERROR_STATUS_MAP[errorCode] || 500;
}

/**
 * Create a success response object
 * @param {string} message - Success message
 * @param {string} requestId - Optional request ID for correlation
 * @returns {Object} Success response object
 */
export function createSuccessResponse(message, requestId = null) {
  const response = {
    success: true,
    message: message,
  };
  
  if (requestId) {
    response.requestId = requestId;
  }
  
  return response;
}

/**
 * Log error with appropriate detail levels, excluding sensitive data
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} message - Error message
 * @param {Object} context - Additional context (without sensitive data)
 */
export function logError(errorCode, message, context = {}) {
  const logData = {
    errorCode,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  
  // Remove sensitive data from context
  delete logData.secret;
  delete logData.signature;
  delete logData.audio;
  delete logData.buffer;
  
  console.error('[ERROR]', JSON.stringify(logData));
}

