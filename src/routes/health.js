/**
 * Health check endpoint
 * Returns service health status for monitoring
 */

import { createSuccessResponse } from '../lib/errors.js';

/**
 * Health check route handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export function healthCheck(req, res) {
  const response = createSuccessResponse('Service is healthy');
  response.status = 'healthy';
  response.timestamp = Date.now();
  response.version = '1.0.0';
  
  res.status(200).json(response);
}

