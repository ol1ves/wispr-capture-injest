/**
 * Rate limiting middleware
 * Implements sliding window algorithm for rate limiting per client
 */

import { createErrorResponse, getErrorStatus, ERROR_CODES } from '../lib/errors.js';
import { loadConfig } from '../lib/config.js';

const config = loadConfig();

/**
 * Rate limit state storage (in-memory)
 * Structure: { clientId: { count: number, windowStart: number } }
 */
const rateLimitStore = new Map();

/**
 * Clean up expired rate limit entries
 * Removes entries older than 1 minute
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  for (const [clientId, state] of rateLimitStore.entries()) {
    if (now - state.windowStart >= windowMs) {
      rateLimitStore.delete(clientId);
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

// Request counter for periodic cleanup (cleanup every 100 requests)
let requestCount = 0;

/**
 * Check if client has exceeded rate limit
 * @param {string} clientId - Client identifier
 * @returns {Object} { allowed: boolean, retryAfter: number|null }
 */
function checkRateLimit(clientId) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = config.rateLimitRequestsPerMinute;
  
  // Clean up expired entries every 100 requests
  requestCount++;
  if (requestCount >= 100) {
    cleanupExpiredEntries();
    requestCount = 0;
  }
  
  const state = rateLimitStore.get(clientId);
  
  // If no state or window expired, create new window
  if (!state || (now - state.windowStart >= windowMs)) {
    rateLimitStore.set(clientId, {
      count: 1,
      windowStart: now,
    });
    return { allowed: true, retryAfter: null };
  }
  
  // Increment count
  state.count++;
  
  // Check if limit exceeded
  if (state.count > maxRequests) {
    const retryAfter = Math.ceil((windowMs - (now - state.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }
  
  return { allowed: true, retryAfter: null };
}

/**
 * Rate limiting middleware
 * Enforces 100 requests per minute per client
 */
export function rateLimit(req, res, next) {
  try {
    const clientId = req.body?.clientId || req.authenticatedClient?.clientId;
    
    if (!clientId) {
      // If no clientId, skip rate limiting (will be caught by auth middleware)
      return next();
    }
    
    const { allowed, retryAfter } = checkRateLimit(clientId);
    
    if (!allowed) {
      const error = createErrorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded. Maximum ${config.rateLimitRequestsPerMinute} requests per minute.`
      );
      res.status(getErrorStatus(error.error));
      if (retryAfter) {
        res.set('Retry-After', retryAfter.toString());
      }
      return res.json(error);
    }
    
    next();
  } catch (error) {
    // On error, allow request through (fail open for rate limiting)
    // Log error for monitoring
    console.error('Rate limiting error:', error);
    next();
  }
}

