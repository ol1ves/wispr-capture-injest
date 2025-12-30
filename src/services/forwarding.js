/**
 * Forwarding service
 * Sends transcription to internal endpoint with exponential backoff retry
 */

import axios from 'axios';
import { loadConfig } from '../lib/config.js';

const config = loadConfig();

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Forward transcription to internal endpoint with retries
 * @param {string} transcriptionText - Transcribed text
 * @param {string} clientId - Client identifier
 * @param {string} requestId - Request ID for correlation
 * @returns {Promise<{success: boolean, error?: string}>} Forwarding result
 */
export async function forwardTranscription(transcriptionText, clientId, requestId) {
  const payload = {
    text: transcriptionText,
    clientId: clientId,
    timestamp: Date.now(),
    requestId: requestId,
  };
  
  const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
  let lastError = null;
  
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      const response = await axios.post(
        config.internalEndpointUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${config.internalEndpointAuthToken}`,
          },
          timeout: 10000, // 10 second timeout per attempt
        }
      );
      
      // Success
      if (response.status >= 200 && response.status < 300) {
        return { success: true };
      }
      
      // Non-2xx response, treat as error
      lastError = `Internal endpoint returned ${response.status}`;
    } catch (error) {
      if (error.response) {
        // API returned error response
        lastError = `Internal endpoint error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        // Request made but no response
        lastError = 'Internal endpoint unavailable';
      } else {
        // Other error
        lastError = `Forwarding error: ${error.message}`;
      }
    }
    
    // If not the last attempt, wait before retrying
    if (attempt < retryDelays.length) {
      await sleep(retryDelays[attempt]);
    }
  }
  
  // All retries exhausted
  return {
    success: false,
    error: lastError || 'Forwarding failed after all retries',
  };
}

