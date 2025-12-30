# Capture Service

Secure voice recording transcription and forwarding service for Wispr Flow integration.

## Overview

The Capture Service is a minimal Node.js HTTP service that securely receives authenticated voice recordings from trusted mobile clients, transcribes them via Wispr Flow API, and forwards the resulting text to an internal automation endpoint.

## Features

- **API Key Authentication**: Per-client API key validation with allowlist
- **Rate Limiting**: 100 requests per minute per client
- **Ephemeral Processing**: Audio stored only in memory, deleted immediately after transcription
- **Retry Logic**: Exponential backoff for internal endpoint forwarding (3 retries: 1s, 2s, 4s)
- **Audio Conversion**: Automatic conversion to 16kHz WAV format for Wispr Flow API

## Prerequisites

- Node.js 20.x LTS or later
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wispr-capture-injest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Server Configuration
PORT=3000

# API Key Authentication
# Format: API_KEY_<CLIENT_ID>=<api-key>
API_KEY_client-123=your-api-key-here
API_KEY_client-456=another-api-key-here

# Client Allowlist
CLIENT_ALLOWLIST=client-123,client-456

# Wispr Flow API Configuration
WISPR_FLOW_API_URL=https://api.wisprflow.com
WISPR_FLOW_API_KEY=your-wispr-flow-api-key

# Internal Endpoint Configuration
INTERNAL_ENDPOINT_URL=https://internal.example.com/transcriptions
INTERNAL_ENDPOINT_AUTH_TOKEN=your-internal-endpoint-auth-token

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Audio Limits
MAX_AUDIO_SIZE_MB=10
MAX_AUDIO_DURATION_SECONDS=300
```

### Required Environment Variables

- `CLIENT_ALLOWLIST`: Comma-separated list of allowed client IDs
- `WISPR_FLOW_API_URL`: Base URL for Wispr Flow API (will be normalized to end with `/api`)
- `WISPR_FLOW_API_KEY`: API key for Wispr Flow authentication
- `INTERNAL_ENDPOINT_URL`: URL of the internal endpoint to forward transcriptions
- At least one `API_KEY_<CLIENT_ID>` variable must be set

## Running the Service

### Development

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server on file changes.

### Production

```bash
npm start
```

The service will start on port 3000 (or the port specified in `PORT` environment variable).

## API Endpoints

### POST /v1/capture

Submit a voice recording for transcription.

**Request**: `multipart/form-data` or raw `audio/*`
- `audio`: Binary audio file (max 10MB)
- `clientId`: Client identifier (can also be provided via `?clientId=xxx` query parameter or `X-Client-Id` header)
- `apiKey`: API key (can also be provided via `Authorization: Bearer <key>` header)

**Response**: JSON
- Success: `{ success: true, message: "...", requestId: "..." }`
- Error: `{ success: false, error: "ERROR_CODE", message: "..." }`

**Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid format, size limits exceeded, missing required fields)
- `401`: Unauthorized (invalid or missing API key)
- `403`: Forbidden (client not allowed)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `502`: Bad Gateway (Wispr Flow API unavailable)
- `503`: Service Unavailable (internal endpoint unavailable after retries)

**Example Request**:
```bash
curl -X POST http://localhost:3000/v1/capture \
  -H "Authorization: Bearer your-api-key" \
  -H "X-Client-Id: client-123" \
  -F "audio=@recording.mp3"
```

### GET /health

Health check endpoint for monitoring.

**Response**: JSON
```json
{
  "success": true,
  "message": "Service is healthy",
  "status": "healthy",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

## Architecture

The service follows a simple request-response flow:

1. **Request Reception**: Express server receives multipart/form-data or raw audio upload
2. **Rate Limiting**: Check if client has exceeded rate limit (100 requests/minute)
3. **Authentication**: Validate API key and verify client is in allowlist
4. **Validation**: Validate audio file size and required fields
5. **Transcription**: Convert audio to 16kHz WAV, send to Wispr Flow API
6. **Forwarding**: Forward transcription text to internal endpoint with retries
7. **Cleanup**: Immediately delete audio buffer from memory
8. **Response**: Return success or error to client

### Request Flow

```
Client Request
    ↓
Rate Limiting Middleware
    ↓
Multer Upload Parser
    ↓
Authentication Middleware (API Key + Allowlist)
    ↓
Validation Middleware (Size, Required Fields)
    ↓
Capture Handler
    ├─→ Transcribe Audio (Wispr Flow API)
    ├─→ Forward Transcription (Internal Endpoint)
    ├─→ Cleanup Audio Buffer
    └─→ Return Response
```

## Project Structure

```
src/
├── middleware/
│   ├── auth.js          # API key authentication and allowlist validation
│   ├── validation.js    # Request validation (client, size limits)
│   ├── rateLimit.js     # Rate limiting per client
│   └── logging.js       # Request/response logging
├── services/
│   ├── transcription.js # Wispr Flow API integration
│   ├── forwarding.js    # Internal endpoint forwarding with retries
│   └── cleanup.js       # Audio artifact cleanup
├── routes/
│   ├── capture.js       # POST /v1/capture endpoint handler
│   └── health.js        # GET /health endpoint handler
├── lib/
│   ├── audio-converter.js # Audio format conversion utilities
│   ├── errors.js        # Error handling utilities
│   └── config.js        # Environment configuration loader
└── app.js               # Express app setup and middleware registration
```

## Errors

The service uses standardized error codes for consistent error responses:

- `INVALID_AUTH`: Invalid or missing API key (401)
- `CLIENT_NOT_ALLOWED`: Client ID not in allowlist (403)
- `FILE_TOO_LARGE`: Audio file exceeds size limit (400)
- `DURATION_TOO_LONG`: Audio duration exceeds limit (400)
- `RATE_LIMIT_EXCEEDED`: Too many requests (429)
- `TRANSCRIPTION_FAILED`: Wispr Flow API error (502)
- `FORWARDING_FAILED`: Internal endpoint forwarding failed (503)
- `INTERNAL_ERROR`: Unexpected server error (500)