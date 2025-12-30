# Research: Capture Service

**Date**: 2025-01-27  
**Feature**: Capture Service  
**Purpose**: Document technology choices and research findings for implementation

## Technology Decisions

### HTTP Framework: Express.js vs Fastify

**Decision**: Express.js

**Rationale**: 
- Most widely adopted Node.js framework with extensive ecosystem
- Minimal learning curve for team members
- Sufficient performance for expected load (100 req/min per client)
- Large community and documentation
- Built-in middleware ecosystem simplifies auth, validation, and error handling

**Alternatives considered**:
- **Fastify**: Faster performance and lower overhead, but smaller ecosystem and less familiar to most developers. Performance gains not critical for this use case.
- **Native Node.js http module**: Too low-level, requires more boilerplate for middleware, routing, and error handling.

### File Upload Handling: multer vs busboy

**Decision**: multer

**Rationale**:
- Standard Express.js middleware for multipart/form-data
- Well-documented and widely used
- Supports memory storage (required for ephemeral handling)
- Easy integration with Express.js
- Built-in file size limits and validation

**Alternatives considered**:
- **busboy**: Lower-level, more control but requires more code. multer provides sufficient abstraction.
- **formidable**: Similar to multer but less actively maintained.

### HTTP Client: axios vs node-fetch

**Decision**: axios

**Rationale**:
- Promise-based API with async/await support
- Built-in request/response interceptors
- Automatic JSON parsing
- Better error handling
- Widely used and well-documented
- Supports timeout configuration (important for transcription API calls)

**Alternatives considered**:
- **node-fetch**: Lighter weight but requires more manual error handling and doesn't support interceptors natively.
- **Native fetch (Node.js 18+)**: Available but less mature ecosystem and fewer features.

### HMAC Implementation

**Decision**: Node.js built-in `crypto` module

**Rationale**:
- No external dependencies required
- Standard library, well-tested and secure
- Supports SHA-256 and other algorithms
- Built-in timing-safe comparison functions
- Zero additional attack surface

**Alternatives considered**:
- **crypto-js**: External library, adds dependency without clear benefit since crypto is built-in.

### Rate Limiting Strategy

**Decision**: In-memory rate limiting with sliding window

**Rationale**:
- Stateless service design allows in-memory tracking per instance
- Simple implementation without external dependencies
- Sufficient for single-instance deployment
- Can be enhanced with Redis if horizontal scaling is needed later

**Alternatives considered**:
- **Redis-based rate limiting**: More complex, requires external dependency. Not needed for initial deployment.
- **Token bucket algorithm**: More complex than sliding window, no clear benefit for this use case.

### Retry Strategy Implementation

**Decision**: Custom exponential backoff with axios-retry pattern

**Rationale**:
- Simple to implement with axios interceptors
- No additional dependencies required
- Meets requirement: 3 retries with 1s, 2s, 4s delays

**Alternatives considered**:
- **p-retry library**: External dependency, adds complexity for simple use case.
- **Fixed interval retries**: Less efficient than exponential backoff.

### Audio Format Handling

**Decision**: Accept common audio formats, validate before forwarding to Wispr Flow

**Rationale**:
- Wispr Flow API will handle format validation
- Service should accept common formats (MP3, WAV, M4A, OGG)
- Basic format detection via Content-Type header and file extension
- Let Wispr Flow reject unsupported formats (simpler than pre-validation)

**Alternatives considered**:
- **Pre-validation with audio libraries**: Adds complexity and dependencies. Wispr Flow is authoritative.
- **Single format requirement**: Too restrictive, reduces client flexibility.

## Integration Patterns

### Wispr Flow API Integration

**Pattern**: RESTful API with async/await, timeout handling, and error propagation

**Key considerations**:
- Set appropriate timeout (e.g., 60 seconds for max duration audio)
- Handle network errors gracefully
- Return meaningful error messages to client
- No retries at this layer (Wispr Flow handles its own reliability)

### Internal Endpoint Forwarding

**Pattern**: HTTP POST with exponential backoff retry, JSON payload

**Key considerations**:
- Retry strategy: 3 attempts with 1s, 2s, 4s delays
- Include client identifier and timestamp in payload
- No raw audio in forwarded data
- Return error to client if all retries exhausted

### HMAC Signature Format

**Pattern**: Standard HMAC-SHA256 with request body and timestamp

**Key considerations**:
- Include timestamp in signature to prevent replay
- Sign request body (audio file + metadata)
- Include client identifier in headers
- Validate signature before processing request body

## Security Considerations

### HMAC Signature Validation

- Use timing-safe comparison (crypto.timingSafeEqual) to prevent timing attacks
- Validate timestamp freshness (5-minute window)
- Store shared secrets securely (environment variables, not in code)
- Rotate secrets periodically

### Rate Limiting Implementation

- Track requests per client identifier in memory
- Use sliding window algorithm
- Return 429 Too Many Requests with Retry-After header
- Clear rate limit counters periodically to prevent memory leaks

### Request Validation Order

1. HMAC signature validation (fail fast on invalid auth)
2. Timestamp validation (replay protection)
3. Client identifier allowlist check
4. Audio size/duration limits
5. Rate limit check

This order minimizes resource usage for invalid requests.

## Performance Considerations

### Memory Management

- Stream audio to transcription API when possible (for large files)
- Delete audio buffers immediately after transcription
- Use streaming parsers (multer memory storage is acceptable for 10MB limit)
- Monitor memory usage in production

### Concurrent Request Handling

- Node.js event loop handles concurrency naturally
- No special concurrency limits needed for expected load
- Consider connection pooling for HTTP clients if needed

## Deployment Considerations

### Containerization

- Use Node.js official Docker image (alpine variant for smaller size)
- Multi-stage build to minimize image size
- Health check endpoint for container orchestration

### Environment Configuration

- HMAC shared secrets via environment variables
- Client allowlist via environment variable or config file
- Wispr Flow API endpoint and credentials
- Internal endpoint URL and credentials
- Rate limit thresholds (configurable, default 100/min)

### Monitoring and Observability

- Log all requests (without sensitive data)
- Log transcription and forwarding failures
- Metrics: request count, success rate, latency, error rates
- Health check endpoint for monitoring

## Open Questions Resolved

1. **Q**: Should we use TypeScript?  
   **A**: No. JavaScript is sufficient for this simple service, reduces build complexity.

2. **Q**: Should we use a database for rate limiting?  
   **A**: No. In-memory is sufficient for single-instance deployment. Can add Redis later if needed.

3. **Q**: Should we validate audio format before sending to Wispr Flow?  
   **A**: No. Let Wispr Flow handle format validation. Service accepts common formats and forwards.

4. **Q**: Should we implement request queuing?  
   **A**: No. Expected load doesn't require queuing. Node.js handles concurrency naturally.

