/**
 * Environment configuration loader
 * Reads from .env file and validates required variables
 */

/**
 * Load and validate environment configuration
 * @returns {Object} Configuration object
 * @throws {Error} If required variables are missing
 */
import 'dotenv/config';
export function loadConfig() {
  const requiredVars = [
    'CLIENT_ALLOWLIST',
    'WISPR_FLOW_API_URL',
    'WISPR_FLOW_API_KEY',
    'INTERNAL_ENDPOINT_URL',
  ];
  
  const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    clientAllowlist: process.env.CLIENT_ALLOWLIST?.split(',').map(id => id.trim()) || [],
    rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100', 10),
    timestampWindowMinutes: parseInt(process.env.TIMESTAMP_WINDOW_MINUTES || '5', 10),
    maxAudioSizeMB: parseInt(process.env.MAX_AUDIO_SIZE_MB || '10', 10),
    maxAudioDurationSeconds: parseInt(process.env.MAX_AUDIO_DURATION_SECONDS || '300', 10),
    wisprFlowApiUrl: process.env.WISPR_FLOW_API_URL,
    wisprFlowApiKey: process.env.WISPR_FLOW_API_KEY,
    internalEndpointUrl: process.env.INTERNAL_ENDPOINT_URL,
    internalEndpointAuthToken: process.env.INTERNAL_ENDPOINT_AUTH_TOKEN,
  };
  
  // Validate required variables
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Load API keys (format: API_KEY_<CLIENT_ID>)
  config.apiKeys = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('API_KEY_')) {
      const clientId = key.replace('API_KEY_', '');
      config.apiKeys[clientId] = value;
    }
  }
  
  if (Object.keys(config.apiKeys).length === 0) {
    throw new Error('No API keys configured. At least one API_KEY_<CLIENT_ID> must be set.');
  }
  
  return config;
}

