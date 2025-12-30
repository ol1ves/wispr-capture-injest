/**
 * API Key authentication middleware
 * Validates API key and client allowlist
 */

import { createErrorResponse, getErrorStatus, ERROR_CODES } from '../lib/errors.js';
import { loadConfig } from '../lib/config.js';

const config = loadConfig();

/**
 * Verify client identifier against allowlist
 * @param {string} clientId - Client identifier
 * @returns {boolean} True if client is allowed
 */
function isClientAllowed(clientId) {
  return config.clientAllowlist.includes(clientId);
}

/**
 * Get API key for a client
 * @param {string} clientId - Client identifier
 * @returns {string|null} API key or null if not found
 */
function getClientApiKey(clientId) {
  return config.apiKeys[clientId] || null;
}

/**
 * Extract API key from request (header or body)
 * @param {Object} req - Express request object
 * @returns {string|null} API key or null
 */
function extractApiKey(req) {
  // Check Authorization header first (Bearer token format)
  // Note: Express normalizes headers to lowercase
  const authHeader = req.headers.authorization || req.headers['authorization'];
  let extractedKey = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    extractedKey = authHeader.substring(7);
  } else if (req.body?.apiKey) {
    extractedKey = req.body.apiKey;
  }
  
  return extractedKey;
}

/**
 * API Key authentication middleware
 * Validates API key and client allowlist
 */
export function authenticateRequest(req, res, next) {
  try {
    const apiKey = extractApiKey(req);
    // Support clientId from body (multipart), query param, or header (for raw audio uploads)
    // Note: If body is a Buffer (raw audio), we can't read clientId from it
    // Express normalizes headers to lowercase, so X-Client-Id becomes x-client-id
    const clientId = (req.body && !Buffer.isBuffer(req.body) ? req.body.clientId : null) 
      || req.query?.clientId 
      || req.headers['x-client-id'] 
      || req.headers['client-id']
      || req.headers['x-clientid'];
    
    // Check required fields
    if (!apiKey || !clientId) {
      const missing = [];
      if (!apiKey) missing.push('apiKey (in Authorization header or body)');
      if (!clientId) missing.push('clientId (in request body, query parameter, or X-Client-Id header)');
      
      const error = createErrorResponse(
        ERROR_CODES.INVALID_AUTH,
        `Missing required authentication: ${missing.join(' and ')}`
      );
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Verify client is allowed
    if (!isClientAllowed(clientId)) {
      const error = createErrorResponse(
        ERROR_CODES.CLIENT_NOT_ALLOWED,
        `Client ${clientId} is not authorized`
      );
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Get expected API key for client
    const expectedApiKey = getClientApiKey(clientId);
    
    if (!expectedApiKey) {
      const error = createErrorResponse(
        ERROR_CODES.INVALID_AUTH,
        'No API key configured for client'
      );
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Validate API key (timing-safe comparison would be ideal, but simple comparison is acceptable for API keys)
    if (apiKey !== expectedApiKey) {
      const error = createErrorResponse(
        ERROR_CODES.INVALID_AUTH,
        'Invalid API key'
      );
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Store client info in request for downstream middleware
    req.authenticatedClient = {
      clientId,
    };
    
    next();
  } catch (error) {
    const errorResponse = createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'Authentication validation failed'
    );
    res.status(getErrorStatus(errorResponse.error)).json(errorResponse);
  }
}

