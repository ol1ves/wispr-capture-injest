/**
 * Transcription service
 * Forwards audio to Wispr Flow API and returns transcription result
 */

import axios from 'axios';
import { loadConfig } from '../lib/config.js';
import { convertTo16kHzWav } from '../lib/audio-converter.js';

const config = loadConfig();

/**
 * Transcribe audio using Wispr Flow API
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} contentType - MIME type of audio file
 * @returns {Promise<{text: string}|{error: string}>} Transcription result or error
 */
export async function transcribeAudio(audioBuffer, contentType) {
  try {
    // Validate audio size (25MB max per API spec)
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.length > maxSizeBytes) {
      return {
        error: `Audio file too large: ${audioBuffer.length} bytes (max ${maxSizeBytes} bytes)`,
      };
    }

    // Convert audio to 16kHz WAV and base64 encode
    let base64Audio;
    try {
      base64Audio = await convertTo16kHzWav(audioBuffer, contentType);
    } catch (conversionError) {
      return {
        error: `Audio conversion failed: ${conversionError.message}`,
      };
    }

    // Prepare JSON request body
    const requestBody = {
      audio: base64Audio,
      language: ['en'], // Default to English, can be made configurable later
      context: {}, // Optional context, can be enhanced later
    };
    
    // Normalize API URL to ensure it ends with /api
    // According to Wispr Flow API docs, the REST endpoint is /api
    let apiUrl = config.wisprFlowApiUrl;
    if (!apiUrl) {
      return {
        error: 'WISPR_FLOW_API_URL is not configured',
      };
    }
    
    // Remove trailing slashes and append /api if not present
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`;
    }
    
    // Call Wispr Flow API
    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.wisprFlowApiKey}`,
        },
        timeout: 60000, // 60 seconds timeout for max duration audio
      }
    );
    
    // Extract transcription text from response
    // API response structure: { id, text, detected_language, total_time, generated_tokens }
    const transcriptionText = response.data?.text;
    
    // Handle null or empty text - API may return null if no speech detected
    if (transcriptionText === null || transcriptionText === undefined) {
      return {
        error: 'No transcription text returned from Wispr Flow API (audio may contain no speech or transcription failed)',
      };
    }
    
    if (typeof transcriptionText !== 'string') {
      return {
        error: 'Invalid transcription response from Wispr Flow API: text field is not a string',
      };
    }
    
    // Return empty string if text is empty (no speech detected)
    if (transcriptionText.trim().length === 0) {
      return {
        error: 'Transcription returned empty text (no speech detected in audio)',
      };
    }
    
    return { text: transcriptionText };
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        error: 'Transcription request timed out',
      };
    }
    
    if (error.response) {
      // API returned error response
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage = error.response.data?.message || error.response.data?.error || statusText;
      
      return {
        error: `Wispr Flow API error: ${status} ${errorMessage}`,
      };
    }
    
    if (error.request) {
      // Request made but no response
      return {
        error: 'Wispr Flow API unavailable',
      };
    }
    
    // Other error
    return {
      error: `Transcription failed: ${error.message}`,
    };
  }
}

