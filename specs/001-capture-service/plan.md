# Implementation Plan: Capture Service

**Branch**: `001-capture-service` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-capture-service/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Capture Service is a minimal Node.js HTTP service that securely receives authenticated voice recordings from trusted mobile clients, transcribes them via Wispr Flow API, and forwards the resulting text to an internal automation endpoint. The service maintains strict security (HMAC authentication, replay protection, rate limiting), handles audio ephemerally (in-memory only), and provides no persistent storage. Technical approach: Express.js or Fastify for HTTP handling, built-in crypto for HMAC validation, multipart/form-data for audio uploads, and minimal dependencies to maintain a small attack surface.

## Technical Context

**Language/Version**: Node.js 20.x LTS (or latest stable)  
**Primary Dependencies**: Express.js (or Fastify), multer (or busboy) for multipart uploads, axios (or node-fetch) for HTTP client, crypto (built-in Node.js) for HMAC  
**Storage**: N/A (ephemeral in-memory only, no persistent storage)  
**Target Platform**: Linux server (containerized deployment)  
**Project Type**: single (HTTP API service)  
**Performance Goals**: Handle 100 requests/minute per client, process typical recordings (30-60s) within 10 seconds, maximum duration (5min) within 60 seconds  
**Constraints**: <2s response time for validation failures, 99% delivery success rate to internal endpoint, no persistent storage, stateless operation  
**Scale/Scope**: Single service instance, horizontal scaling via stateless design, rate-limited to 100 req/min per client

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Reference**: `.specify/memory/constitution.md`

**Status**: ✅ All gates passed (pre-research and post-design)

### Principle 1: Simplicity First
- [x] Does this feature maintain single responsibility (authenticated audio in, text out)?
- [x] Are all non-transcription concerns delegated to external systems?
- [x] Is the implementation the simplest approach that meets requirements?

### Principle 2: Strong Security by Default
- [x] Does this feature include authentication mechanisms?
- [x] Are replay protection measures in place?
- [x] Is request validation strict and comprehensive?
- [x] Are security considerations addressed at every layer?

### Principle 3: Stateless and Ephemeral
- [x] Does this feature avoid long-term storage of audio or text?
- [x] Is audio handled only in memory or temporary storage?
- [x] Are there any persistent data stores introduced? (If yes, justify in Complexity Tracking)

### Principle 4: Minimal Tech Surface Area
- [x] Does this feature use Node.js/npm-based dependencies only?
- [x] Are new dependencies minimal and necessary?
- [x] Does this avoid introducing new technology stacks?

### Principle 5: Internal System Isolation
- [x] Does this feature maintain the capture service as the only public entry point?
- [x] Are downstream systems kept private and not exposed?
- [x] Is network isolation preserved?

## Project Structure

### Documentation (this feature)

```text
specs/001-capture-service/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── middleware/
│   ├── auth.js          # HMAC signature validation
│   ├── validation.js    # Request validation (timestamp, client, limits)
│   └── rateLimit.js      # Rate limiting per client
├── services/
│   ├── transcription.js # Wispr Flow API integration
│   ├── forwarding.js    # Internal endpoint forwarding with retries
│   └── cleanup.js        # Audio artifact cleanup
├── routes/
│   └── capture.js       # POST /capture endpoint
└── lib/
    ├── hmac.js          # HMAC signature utilities
    └── errors.js        # Error handling utilities
```

**Structure Decision**: Single project structure with clear separation of concerns: middleware for cross-cutting concerns (auth, validation, rate limiting), services for business logic (transcription, forwarding, cleanup), routes for HTTP endpoints, and lib for shared utilities. This structure maintains simplicity and clear separation of concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | All principles satisfied |
