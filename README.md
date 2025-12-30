# Capture Service

Secure voice recording transcription and forwarding service for Wispr Flow integration.

## Overview

The Capture Service is a minimal Node.js HTTP service that securely receives authenticated voice recordings from trusted mobile clients, transcribes them via Wispr Flow API, and forwards the resulting text to an internal automation endpoint.

## Features

- **HMAC Authentication**: Request signature validation using HMAC-SHA256
- **Replay Protection**: Timestamp validation with 5-minute window
- **Rate Limiting**: 100 requests per minute per client
- **Ephemeral Processing**: Audio stored only in memory, deleted immediately after transcription
- **Retry Logic**: Exponential backoff for internal endpoint forwarding (3 retries: 1s, 2s, 4s)

## Prerequisites

- Node.js 20.x LTS or later
- npm

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Server Configuration
PORT=3000

# HMAC Authentication
# Format: HMAC_SECRET_<CLIENT_ID>=<shared-secret>
HMAC_SECRET_client-123=your-shared-secret-here

# Client Allowlist
CLIENT_ALLOWLIST=client-123,client-456

# Wispr Flow API Configuration
WISPR_FLOW_API_URL=https://api.wisprflow.com/transcribe
WISPR_FLOW_API_KEY=your-wispr-flow-api-key

# Internal Endpoint Configuration
INTERNAL_ENDPOINT_URL=https://internal.example.com/transcriptions
INTERNAL_ENDPOINT_AUTH_TOKEN=your-internal-endpoint-auth-token

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Timestamp Validation
TIMESTAMP_WINDOW_MINUTES=5

# Audio Limits
MAX_AUDIO_SIZE_MB=10
MAX_AUDIO_DURATION_SECONDS=300
```

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The service will start on port 3000 (or the port specified in `PORT` environment variable).

## API Endpoints

### POST /v1/capture

Submit a voice recording for transcription.

**Request**: `multipart/form-data`
- `audio`: Binary audio file (max 10MB, max 5 minutes)
- `clientId`: Client identifier
- `timestamp`: Unix timestamp in milliseconds
- `signature`: HMAC-SHA256 signature

**Response**: JSON
- Success: `{ success: true, message: "...", requestId: "..." }`
- Error: `{ success: false, error: "ERROR_CODE", message: "..." }`

**Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid format, size/duration limits exceeded)
- `401`: Unauthorized (invalid HMAC signature)
- `403`: Forbidden (client not allowed or timestamp outside window)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `502`: Bad Gateway (Wispr Flow API unavailable)
- `503`: Service Unavailable (internal endpoint unavailable after retries)

### GET /health

Health check endpoint for monitoring.

**Response**: JSON
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

## Project Structure

```
src/
├── middleware/
│   ├── auth.js          # HMAC signature validation
│   ├── validation.js    # Request validation (timestamp, client, limits)
│   ├── rateLimit.js     # Rate limiting per client
│   └── logging.js       # Request logging
├── services/
│   ├── transcription.js # Wispr Flow API integration
│   ├── forwarding.js    # Internal endpoint forwarding with retries
│   └── cleanup.js       # Audio artifact cleanup
├── routes/
│   ├── capture.js       # POST /capture endpoint
│   └── health.js         # GET /health endpoint
├── lib/
│   ├── hmac.js          # HMAC signature utilities
│   ├── errors.js        # Error handling utilities
│   └── config.js        # Environment configuration
└── app.js               # Express app setup
```

## Security Considerations

- HMAC secrets are stored in environment variables (never in code)
- Timing-safe signature comparison prevents timing attacks
- Timestamp validation prevents replay attacks (5-minute window)
- Rate limiting prevents abuse (100 requests/minute per client)
- Audio data is ephemeral (in-memory only, deleted immediately)
- No sensitive data in logs

## License

ISC

