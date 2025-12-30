/**
 * Capture route handler
 * POST /v1/capture endpoint for voice recording submission
 */

import multer from 'multer';
import { randomUUID } from 'crypto';
import { transcribeAudio } from '../services/transcription.js';
import { forwardTranscription } from '../services/forwarding.js';
import { cleanupFile } from '../services/cleanup.js';
import { createSuccessResponse, createErrorResponse, getErrorStatus, ERROR_CODES, logError } from '../lib/errors.js';

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Generate request ID for correlation
 * @returns {string} Request ID
 */
function generateRequestId() {
  try {
    // Use Node.js built-in crypto.randomUUID (Node 14.17+)
    return randomUUID();
  } catch (error) {
    // Fallback to timestamp-based ID
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Capture route handler
 * Processes voice recording: transcribe → forward → cleanup → respond
 */
export async function captureHandler(req, res) {
  let audioFile = null;
  const requestId = req.requestId || generateRequestId();
  
  try {
    // Get audio file from multer
    audioFile = req.audioFile;
    if (!audioFile) {
      const error = createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Audio file not found');
      return res.status(400).json(error);
    }
    
    // Get client info from authenticated request
    const clientInfo = req.authenticatedClient;
    if (!clientInfo) {
      const error = createErrorResponse(ERROR_CODES.INVALID_AUTH, 'Client not authenticated');
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Transcribe audio
    const transcriptionResult = await transcribeAudio(
      audioFile.buffer,
      audioFile.mimetype || 'audio/mpeg'
    );
    
    // Clean up audio immediately after transcription
    cleanupFile(audioFile);
    audioFile = null;
    
    // Check transcription result
    if (transcriptionResult.error) {
      logError(ERROR_CODES.TRANSCRIPTION_FAILED, transcriptionResult.error, { requestId, clientId: clientInfo.clientId });
      const error = createErrorResponse(
        ERROR_CODES.TRANSCRIPTION_FAILED,
        transcriptionResult.error
      );
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Forward transcription to internal endpoint
    const forwardResult = await forwardTranscription(
      transcriptionResult.text,
      clientInfo.clientId,
      requestId
    );
    
    // Check forwarding result
    if (!forwardResult.success) {
      logError(ERROR_CODES.FORWARDING_FAILED, forwardResult.error || 'Failed to forward transcription', { requestId, clientId: clientInfo.clientId });
      const error = createErrorResponse(
        ERROR_CODES.FORWARDING_FAILED,
        forwardResult.error || 'Failed to forward transcription'
      );
      return res.status(getErrorStatus(error.error)).json(error);
    }
    
    // Success response
    const success = createSuccessResponse(
      'Transcription forwarded successfully',
      requestId
    );
    res.status(200).json(success);
    
  } catch (error) {
    // Ensure cleanup on error
    if (audioFile) {
      cleanupFile(audioFile);
    }
    
    // Log error
    logError(ERROR_CODES.INTERNAL_ERROR, error.message, { requestId, stack: error.stack });
    
    // Error response
    const errorResponse = createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      `Internal server error: ${error.message}`
    );
    res.status(getErrorStatus(errorResponse.error)).json(errorResponse);
  }
}

// Export multer middleware for use in app.js
export const uploadMiddleware = upload.single('audio');

