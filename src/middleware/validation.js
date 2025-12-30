/**
 * Request validation middleware
 * Validates required fields, audio size, and duration limits
 */

import { createErrorResponse, getErrorStatus, ERROR_CODES } from '../lib/errors.js';
import { loadConfig } from '../lib/config.js';

const config = loadConfig();


/**
 * Validate audio file size
 * @param {Object} file - Multer file object
 * @returns {string|null} Error message or null if valid
 */
function validateAudioSize(file) {
  if (!file) {
    return 'Audio file is required';
  }
  
  const maxSizeBytes = config.maxAudioSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `Audio file exceeds maximum size of ${config.maxAudioSizeMB}MB`;
  }
  
  return null;
}

/**
 * Validate audio duration
 * Note: Duration validation would require audio file parsing
 * For now, we'll do basic validation. Full duration check would need
 * an audio library like node-ffprobe or similar.
 * @param {Object} file - Multer file object
 * @returns {string|null} Error message or null if valid
 */
function validateAudioDuration(file) {
  // TODO: Implement actual audio duration validation
  // This would require parsing the audio file to get its duration
  // For now, we'll return null (valid) and let Wispr Flow handle duration limits
  // In production, you might want to use a library like node-ffprobe
  
  return null;
}

/**
 * Request validation middleware
 * Validates required fields, audio size, and duration
 * Note: This runs after multer, so req.file is available
 */
export function validateRequest(req, res, next) {
  try {
    // Check required fields - support clientId from body, query, or header
    const clientId = req.body?.clientId || req.query?.clientId || req.headers['x-client-id'];
    
    if (!clientId) {
      const error = createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Missing required field: clientId (provide in body, query parameter, or X-Client-Id header)');
      return res.status(400).json(error);
    }
    
    // Get audio file - from multer (multipart) or raw body (raw audio)
    let file = req.file;
    
    // If multer didn't parse it (raw audio upload), create file-like object from raw body
    if (!file && Buffer.isBuffer(req.body) && req.headers['content-type']?.startsWith('audio/')) {
      file = {
        buffer: req.body,
        size: req.body.length,
        mimetype: req.headers['content-type'],
        originalname: 'audio.mp3',
      };
    }
    
    const sizeError = validateAudioSize(file);
    if (sizeError) {
      const error = createErrorResponse(ERROR_CODES.FILE_TOO_LARGE, sizeError);
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Validate audio duration
    const durationError = validateAudioDuration(file);
    if (durationError) {
      const error = createErrorResponse(ERROR_CODES.DURATION_TOO_LONG, durationError);
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Store file info in request for downstream handlers
    req.audioFile = file;
    
    next();
  } catch (error) {
    const errorResponse = createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'Request validation failed'
    );
    res.status(getErrorStatus(errorResponse.error)).json(errorResponse);
  }
}

