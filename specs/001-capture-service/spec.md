# Feature Specification: Capture Service

**Feature Branch**: `001-capture-service`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Service Responsibilities

------------------------

### Input

*   Authenticated HTTP request containing:
    
    *   A short voice recording (audio file or stream)
        
    *   Request metadata (timestamp, client identifier)
        
    *   Authorization credentials
        

### Processing Steps

1.  **Request Validation**
    
    *   Verify HMAC signature
        
    *   Validate timestamp to prevent replay attacks
        
    *   Verify client identifier against an allowlist
        
    *   Enforce size and duration limits on audio
        
2.  **Temporary Audio Handling**
    
    *   Store audio in memory or ephemeral storage only
        
    *   Audio must not persist beyond the transcription session
        
3.  **Transcription**
    
    *   Forward audio to Wispr Flow's transcription API
        
    *   Await final transcription result
        
    *   Handle transcription errors gracefully
        
4.  **Forwarding**
    
    *   Send transcription text and minimal metadata to an internal endpoint
        
    *   Include source identifiers but no raw audio
        
    *   Ensure delivery acknowledgment or retry on failure
        
5.  **Cleanup**
    
    *   Immediately delete any temporary audio artifacts
        
    *   Do not retain transcripts locally
        

Output
------

*   **Primary output**: Plain text transcription forwarded to an internal system
    
*   **Client response**: Success or failure acknowledgment (no transcription content required)
    

Authorization & Security Model
------------------------------

*   The service must require authentication on every request
    
*   Authentication should be:
    
    *   HMAC-signed (request signature using shared secret)
        
    *   Scoped to a single trusted client
        
*   Requests must include:
    
    *   Timestamp validation
        
    *   Replay protection
        
*   Rate limiting must be enforced
    
*   The service must not expose internal endpoints or credentials
    

Failure Handling
----------------

*   Invalid authentication → immediate rejection
    
*   Transcription failure → return error to client
    
*   Internal forwarding failure → retry with exponential backoff (3 retries: 1s, 2s, 4s) or return failure if retries exhausted
    
*   No partial successes (audio is never retained for later retry)
    

Non-Goals (Explicit)
--------------------

The Capture Service must **not**:

*   Store voice recordings
    
*   Classify or interpret text
    
*   Perform AI reasoning
    
*   Create tasks or notes
    
*   Manage user state or sessions"

## Clarifications

### Session 2025-01-27

- Q: Which authentication method should the service use (token-based or HMAC-signed)? → A: HMAC-signed (request signature using shared secret)
- Q: What retry strategy should be used for internal endpoint forwarding failures? → A: Exponential backoff with 3 retries (e.g., 1s, 2s, 4s delays)
- Q: What rate limit should be enforced per client? → A: 100 requests per minute
- Q: What are the maximum audio size and duration limits? → A: 10MB file size, 5 minutes duration
- Q: What is the timestamp validation window for replay protection? → A: 5 minutes

## User Scenarios *(mandatory)*

### User Story 1 - Authenticated Voice Recording Submission (Priority: P1)

A trusted mobile client submits a short voice recording to the capture service. The service validates the request, transcribes the audio, forwards the transcription to an internal system, and returns a success acknowledgment to the client.

**Why this priority**: This is the core functionality of the service. Without this, the service cannot fulfill its primary purpose of bridging mobile voice input to internal automation systems.

**Acceptance Scenarios**:

1. **Given** a trusted client with valid authentication credentials, **When** the client submits a voice recording within size and duration limits, **Then** the service accepts the request, transcribes the audio, forwards the transcription, and returns a success acknowledgment
2. **Given** a client with invalid or missing authentication credentials, **When** the client attempts to submit a voice recording, **Then** the service immediately rejects the request with an authentication error
3. **Given** a trusted client submits a voice recording, **When** the transcription service returns an error, **Then** the service returns an error to the client and does not forward any data
4. **Given** a trusted client submits a voice recording, **When** the internal forwarding endpoint is unavailable, **Then** the service retries the forwarding operation and returns an error to the client if retries are exhausted

---

### User Story 2 - Request Validation and Security Enforcement (Priority: P1)

The service validates all incoming requests for authentication, timestamp freshness, client authorization, and audio constraints before processing.

**Why this priority**: Security is a foundational requirement. Without proper validation, the service is vulnerable to unauthorized access, replay attacks, and resource exhaustion. This must work correctly from day one.

**Acceptance Scenarios**:

1. **Given** a request with a timestamp older than the allowed window, **When** the service receives the request, **Then** it rejects it as a potential replay attack
2. **Given** a request from a client identifier not on the allowlist, **When** the service receives the request, **Then** it rejects the request with an authorization error
3. **Given** a request with audio exceeding size (10MB) or duration (5 minutes) limits, **When** the service receives the request, **Then** it rejects the request before processing begins
4. **Given** a request exceeding the rate limit, **When** the service receives the request, **Then** it rejects the request with a rate limit error

---

### User Story 3 - Ephemeral Data Handling (Priority: P2)

The service ensures that audio data exists only temporarily during processing and is immediately deleted after transcription completes, regardless of success or failure.

**Why this priority**: Ephemeral data handling is a core constitutional principle that reduces privacy risk and compliance burden. While not blocking the primary flow, it is essential for maintaining the service's security posture.

**Acceptance Scenarios**:

1. **Given** a voice recording is received, **When** the service processes the request, **Then** the audio exists only in memory or ephemeral storage during transcription
2. **Given** transcription completes (successfully or with error), **When** the service finishes processing, **Then** all audio artifacts are immediately deleted and no audio data persists
3. **Given** a transcription request fails, **When** the service handles the error, **Then** audio is still deleted and not retained for later retry

---

### Edge Cases

- What happens when the audio format is unsupported or corrupted?
- How does the system handle concurrent requests from the same client?
- What happens when the transcription service is slow or times out?
- How does the system handle partial audio uploads or network interruptions?
- What happens when the internal forwarding endpoint returns a non-standard response?
- How does the system handle extremely short audio clips (e.g., less than 1 second)?
- What happens when multiple transcription requests are in flight simultaneously?
- How does the system handle malformed authentication headers or signatures?

## Requirements *(mandatory)*

<!--
  NOTE: All requirements MUST comply with project constitution principles
  (see `.specify/memory/constitution.md`). Ensure requirements align with:
  - Simplicity First: Single responsibility, minimal scope
  - Strong Security by Default: Authentication, validation, replay protection
  - Stateless and Ephemeral: No long-term storage
  - Minimal Tech Surface Area: Node.js/npm only
  - Internal System Isolation: Capture service as only public entry point
-->

### Functional Requirements

- **FR-001**: System MUST require authentication on every HTTP request
- **FR-002**: System MUST validate HMAC signatures before processing requests
- **FR-003**: System MUST validate request timestamps to prevent replay attacks within a 5-minute time window
- **FR-004**: System MUST verify client identifiers against an allowlist before processing requests
- **FR-005**: System MUST enforce size limits on audio files or streams (maximum 10MB)
- **FR-006**: System MUST enforce duration limits on audio recordings (maximum 5 minutes)
- **FR-007**: System MUST store audio only in memory or ephemeral storage during processing
- **FR-008**: System MUST delete all audio artifacts immediately after transcription completes (success or failure)
- **FR-009**: System MUST forward audio to Wispr Flow's transcription API
- **FR-010**: System MUST await the final transcription result from Wispr Flow
- **FR-011**: System MUST handle transcription errors gracefully and return appropriate errors to clients
- **FR-012**: System MUST forward transcription text and minimal metadata to an internal endpoint
- **FR-013**: System MUST include source identifiers (client identifier, timestamp) in forwarded data
- **FR-014**: System MUST NOT include raw audio in forwarded data to internal systems
- **FR-015**: System MUST ensure delivery acknowledgment from the internal endpoint or retry on failure using exponential backoff (3 retries with delays: 1s, 2s, 4s)
- **FR-016**: System MUST NOT retain transcripts locally after forwarding
- **FR-017**: System MUST enforce rate limiting per client identifier (100 requests per minute)
- **FR-018**: System MUST return success or failure acknowledgment to the client (without transcription content)
- **FR-019**: System MUST NOT store voice recordings beyond the transcription session
- **FR-020**: System MUST NOT classify or interpret transcription text
- **FR-021**: System MUST NOT perform AI reasoning on transcription content
- **FR-022**: System MUST NOT create tasks or notes from transcription content
- **FR-023**: System MUST NOT manage user state or sessions
- **FR-024**: System MUST reject requests with invalid authentication immediately
- **FR-025**: System MUST return transcription errors to clients when Wispr Flow fails
- **FR-026**: System MUST retry internal forwarding on failure using exponential backoff (3 retries: 1s, 2s, 4s delays) or return failure if all retries are exhausted
- **FR-027**: System MUST NOT retain audio for later retry (no partial successes)

### Key Entities

- **Voice Recording Request**: Represents an authenticated HTTP request containing audio data, metadata (timestamp, client identifier), and authorization credentials. Exists only during request processing.
- **Transcription Result**: Represents the text output from Wispr Flow's transcription API. Contains the transcribed text and is forwarded to internal systems but not retained locally.
- **Client Identifier**: Represents a unique identifier for trusted clients authorized to use the service. Used for allowlist validation and rate limiting.
- **Internal Endpoint**: Represents the downstream system that receives transcriptions. Not exposed publicly and accessed only by the capture service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Service processes 95% of valid authenticated requests successfully (transcription completed and forwarded)
- **SC-002**: Service rejects 100% of unauthenticated or invalid requests before processing begins
- **SC-003**: Service completes transcription and forwarding for typical voice recordings (30-60 seconds) within 10 seconds of receiving the request, and for maximum duration recordings (5 minutes) within 60 seconds
- **SC-004**: Service enforces rate limits such that no single client can exceed 100 requests per minute
- **SC-005**: Service deletes all audio artifacts within 1 second of transcription completion (success or failure)
- **SC-006**: Service forwards transcriptions to the internal endpoint with 99% delivery success rate (including retries)
- **SC-007**: Service handles concurrent requests from multiple clients without degradation in processing time
- **SC-008**: Service returns appropriate error responses to clients within 2 seconds for validation failures

## Assumptions

- Wispr Flow transcription API is available and accessible from the capture service
- Internal endpoint for forwarding transcriptions is available and accessible from the capture service
- Trusted clients have pre-configured HMAC shared secrets for request signing
- Client allowlist is maintained separately and accessible to the capture service
- Rate limiting is set to 100 requests per minute per client identifier
- Audio format and encoding are supported by Wispr Flow (specific formats to be determined during implementation)
- Network connectivity between capture service, Wispr Flow, and internal endpoint is reliable
- Timestamp validation window is 5 minutes (requests must be within 5 minutes of current time)

## Dependencies

- Wispr Flow transcription API (external service)
- Internal endpoint for receiving transcriptions (downstream system)
- Authentication/authorization infrastructure (HMAC shared secrets, allowlist management)
- Rate limiting configuration and storage mechanism
