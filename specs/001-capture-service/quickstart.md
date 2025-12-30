# Quick Start: Capture Service

**Date**: 2025-01-27  
**Feature**: Capture Service

## Overview

This guide provides a high-level overview of implementing the Capture Service. For detailed specifications, see [spec.md](./spec.md) and [plan.md](./plan.md).

## Architecture Summary

The Capture Service is a minimal Node.js HTTP API that:

1. **Receives** authenticated voice recordings from trusted mobile clients
2. **Validates** requests (HMAC auth, timestamp, client allowlist, size/duration limits, rate limits)
3. **Transcribes** audio via Wispr Flow API
4. **Forwards** transcription text to internal endpoint (with retries)
5. **Cleans up** all audio artifacts immediately

**Key Principles**:
- Stateless and ephemeral (no persistent storage)
- Single responsibility (audio in, text out)
- Strong security by default (HMAC, replay protection, rate limiting)
- Minimal dependencies (Node.js + Express + essential libraries)

## Implementation Steps

### 1. Project Setup

```bash
# Initialize Node.js project
npm init -y

# Install core dependencies
npm install express multer axios

# Install development dependencies
npm install --save-dev nodemon
```

### 2. Project Structure

```
src/
├── middleware/
│   ├── auth.js          # HMAC signature validation
│   ├── validation.js    # Request validation (timestamp, client, limits)
│   └── rateLimit.js     # Rate limiting per client
├── services/
│   ├── transcription.js # Wispr Flow API integration
│   ├── forwarding.js    # Internal endpoint forwarding with retries
│   └── cleanup.js       # Audio artifact cleanup
├── routes/
│   └── capture.js       # POST /capture endpoint
├── lib/
│   ├── hmac.js          # HMAC signature utilities
│   └── errors.js        # Error handling utilities
└── app.js               # Express app setup
```

### 3. Core Components

#### HMAC Authentication Middleware (`src/middleware/auth.js`)

- Validate HMAC-SHA256 signature using `crypto` module
- Use timing-safe comparison (`crypto.timingSafeEqual`)
- Validate timestamp freshness (5-minute window)
- Verify client identifier against allowlist

#### Request Validation Middleware (`src/middleware/validation.js`)

- Check audio file size (max 10MB)
- Check audio duration (max 5 minutes)
- Validate required fields (clientId, timestamp, signature)
- Reject invalid requests before processing

#### Rate Limiting Middleware (`src/middleware/rateLimit.js`)

- Track requests per client in memory (sliding window)
- Enforce 100 requests per minute limit
- Return 429 with Retry-After header when exceeded

#### Transcription Service (`src/services/transcription.js`)

- Forward audio to Wispr Flow API
- Handle timeouts (60 seconds for max duration)
- Return transcription text or error
- No retries (Wispr Flow handles its own reliability)

#### Forwarding Service (`src/services/forwarding.js`)

- Send transcription to internal endpoint
- Implement exponential backoff (3 retries: 1s, 2s, 4s)
- Include client identifier and timestamp in payload
- Return success or failure after retries exhausted

#### Cleanup Service (`src/services/cleanup.js`)

- Delete audio buffers immediately after transcription
- Ensure cleanup on both success and error paths
- Verify no audio persists after request completion

### 4. Environment Configuration

```bash
# .env file
PORT=3000
HMAC_SECRET_CLIENT_123=shared-secret-for-client-123
CLIENT_ALLOWLIST=client-123,client-456
WISPR_FLOW_API_URL=https://api.wisprflow.com/transcribe
WISPR_FLOW_API_KEY=your-api-key
INTERNAL_ENDPOINT_URL=https://internal.example.com/transcriptions
INTERNAL_ENDPOINT_AUTH_TOKEN=your-auth-token
RATE_LIMIT_REQUESTS_PER_MINUTE=100
TIMESTAMP_WINDOW_MINUTES=5
MAX_AUDIO_SIZE_MB=10
MAX_AUDIO_DURATION_SECONDS=300
```

### 5. API Endpoints

#### POST /capture

**Request**: multipart/form-data
- `audio`: Binary audio file
- `clientId`: Client identifier
- `timestamp`: Unix timestamp (milliseconds)
- `signature`: HMAC-SHA256 signature

**Response**: JSON
- Success: `{ success: true, message: "...", requestId: "..." }`
- Error: `{ success: false, error: "ERROR_CODE", message: "..." }`

#### GET /health

**Response**: JSON
- `{ status: "healthy", timestamp: 1234567890, version: "1.0.0" }`

### 6. Error Handling

- **400 Bad Request**: Invalid request format, size/duration limits exceeded
- **401 Unauthorized**: Invalid HMAC signature
- **403 Forbidden**: Client not allowed or timestamp outside window
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Transcription or forwarding failure
- **502 Bad Gateway**: Wispr Flow API unavailable
- **503 Service Unavailable**: Internal endpoint unavailable after retries

### 7. Deployment Considerations

- **Containerization**: Use Node.js official Docker image (alpine)
- **Health Checks**: Implement `/health` endpoint for orchestration
- **Logging**: Log all requests (without sensitive data)
- **Monitoring**: Track request count, success rate, latency, error rates
- **Secrets Management**: Store HMAC secrets and API keys securely (environment variables, secrets manager)

### 8. Security Checklist

- [ ] HMAC signatures validated with timing-safe comparison
- [ ] Timestamp validation prevents replay attacks (5-minute window)
- [ ] Client allowlist enforced
- [ ] Rate limiting active (100 req/min per client)
- [ ] Audio size/duration limits enforced
- [ ] Secrets stored in environment variables (not in code)
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production

### 9. Next Steps

1. Implement core middleware (auth, validation, rate limiting)
2. Implement transcription service (Wispr Flow integration)
3. Implement forwarding service (internal endpoint with retries)
4. Implement cleanup service (audio artifact deletion)
5. Create Express routes and wire everything together
6. Set up CI/CD pipeline
7. Deploy to staging environment
8. Production deployment

## Key Implementation Notes

- **Stateless Design**: No database or persistent storage required
- **In-Memory Rate Limiting**: Sufficient for single-instance deployment
- **Ephemeral Audio**: Store in memory only, delete immediately after transcription
- **Error Handling**: Return meaningful errors to clients, log for debugging
- **Retry Strategy**: Only for internal endpoint forwarding (not for transcription)
- **Security First**: Validate everything before processing

## Dependencies Summary

**Production**:
- `express`: HTTP server framework
- `multer`: Multipart form data handling
- `axios`: HTTP client for Wispr Flow and internal endpoint
- `crypto`: Built-in Node.js module for HMAC (no install needed)

**Development**:
- `nodemon`: Development server auto-reload

Total production dependencies: 3 (minimal surface area)

