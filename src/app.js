/**
 * Express app setup for Capture Service
 * Basic server configuration and middleware registration
 */

import express from 'express';
import { loadConfig } from './lib/config.js';
import { healthCheck } from './routes/health.js';
import { captureHandler, uploadMiddleware } from './routes/capture.js';
import { authenticateRequest } from './middleware/auth.js';
import { validateRequest } from './middleware/validation.js';
import { rateLimit } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/logging.js';

// Load configuration
const config = loadConfig();

// Create Express app
const app = express();

// Request logging middleware
app.use(requestLogger);

// Handle raw audio uploads for /capture endpoint
// Only parse as raw if content-type is audio/* and not multipart
const rawAudioParser = express.raw({ type: ['audio/*'], limit: '10mb' });
app.use('/capture', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  // Only use raw parser for audio/* that isn't multipart/form-data
  if (contentType.startsWith('audio/') && !contentType.includes('multipart')) {
    return rawAudioParser(req, res, next);
  }
  next();
});

// Health check endpoint
app.get('/health', healthCheck);

// Capture endpoint with all middleware
// Order: rateLimit → upload (multer) → authenticate → validate → capture handler
// Note: Multer must come before auth/validation to parse multipart form data
app.post('/capture', 
  rateLimit,
  uploadMiddleware,
  authenticateRequest,
  validateRequest,
  captureHandler
);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Capture Service listening on port ${PORT}`);
});

export default app;

