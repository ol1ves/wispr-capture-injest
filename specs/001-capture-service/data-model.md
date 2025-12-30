# Data Model: Capture Service

**Date**: 2025-01-27  
**Feature**: Capture Service

## Overview

The Capture Service is stateless and ephemeral by design. It does not maintain persistent data storage. All data exists only in memory during request processing and is discarded immediately after use.

## Entities

### Voice Recording Request

**Lifetime**: Exists only during HTTP request processing (request → response)

**Attributes**:
- `audio`: Binary audio data (multipart/form-data)
- `clientId`: String - Unique identifier for the trusted client
- `timestamp`: Number - Unix timestamp (milliseconds) of request creation
- `signature`: String - HMAC-SHA256 signature of request body
- `contentType`: String - MIME type of audio file (e.g., audio/mpeg, audio/wav)
- `fileSize`: Number - Size of audio file in bytes (max 10MB)
- `duration`: Number - Audio duration in seconds (max 300 seconds / 5 minutes)

**Validation Rules**:
- `clientId` must be present and non-empty
- `timestamp` must be within 5 minutes of current server time
- `signature` must be valid HMAC-SHA256 signature using client's shared secret
- `fileSize` must be ≤ 10MB (10,485,760 bytes)
- `duration` must be ≤ 5 minutes (300 seconds)
- `clientId` must exist in allowlist

**State Transitions**: None (ephemeral, destroyed after processing)

### Transcription Result

**Lifetime**: Exists only during request processing, forwarded to internal endpoint, then discarded

**Attributes**:
- `text`: String - Transcribed text from Wispr Flow API
- `clientId`: String - Source client identifier
- `timestamp`: Number - Original request timestamp
- `requestId`: String (optional) - Unique identifier for this request (for correlation)

**Validation Rules**:
- `text` must be non-empty if transcription succeeded
- `clientId` and `timestamp` must match original request

**State Transitions**: None (ephemeral, forwarded and discarded)

### Client Identifier

**Lifetime**: Persistent (managed externally, not stored by service)

**Attributes**:
- `id`: String - Unique client identifier
- `sharedSecret`: String - HMAC shared secret (stored securely, not in service)
- `allowlisted`: Boolean - Whether client is authorized (managed externally)

**Validation Rules**:
- `id` must be unique
- `sharedSecret` must be kept secure (environment variable or secure config)
- `allowlisted` must be true for service to accept requests

**Note**: This entity is not stored by the service. The service validates against an external allowlist (environment variable or config file).

### Rate Limit State

**Lifetime**: In-memory during service runtime (not persisted)

**Attributes**:
- `clientId`: String - Client identifier
- `requestCount`: Number - Number of requests in current window
- `windowStart`: Number - Unix timestamp of window start
- `windowDuration`: Number - Window duration in milliseconds (60000 for 1 minute)

**Validation Rules**:
- `requestCount` must be ≤ 100 per minute window
- Window resets after 1 minute

**State Transitions**:
- Reset when window expires (sliding window algorithm)

## Relationships

- **Voice Recording Request** → **Client Identifier**: One request belongs to one client (via `clientId`)
- **Voice Recording Request** → **Transcription Result**: One request produces one transcription result
- **Client Identifier** → **Rate Limit State**: One client has one rate limit state (in-memory)

## Data Flow

1. **Request Reception**: HTTP request with audio → Voice Recording Request entity (in-memory)
2. **Validation**: Validate against Client Identifier allowlist and Rate Limit State
3. **Transcription**: Voice Recording Request → Wispr Flow API → Transcription Result (in-memory)
4. **Forwarding**: Transcription Result → Internal Endpoint (HTTP POST)
5. **Cleanup**: All entities destroyed (no persistence)

## Constraints

- No persistent storage of any entity
- Audio data must be deleted within 1 second of transcription completion
- Transcription results must be forwarded immediately (no queuing)
- Rate limit state is in-memory only (resets on service restart)

## Security Considerations

- Client Identifier shared secrets stored in environment variables (not in code)
- HMAC signatures validated using timing-safe comparison
- Timestamp validation prevents replay attacks (5-minute window)
- Rate limiting prevents abuse (100 requests/minute per client)

