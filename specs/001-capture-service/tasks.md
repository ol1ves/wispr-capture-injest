# Tasks: Capture Service

**Input**: Design documents from `/specs/001-capture-service/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual testing will be used. No automated test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, at repository root
- Paths shown below assume single project structure per plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan (src/middleware/, src/services/, src/routes/, src/lib/)
- [x] T002 Initialize Node.js project with package.json
- [x] T003 [P] Install production dependencies (express, multer, axios) via npm
- [x] T004 [P] Install development dependencies (nodemon) via npm
- [x] T005 [P] Create .env.example file with required environment variables
- [x] T006 [P] Create .gitignore file for Node.js project

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Create error handling utilities in src/lib/errors.js (error codes, response formatting)
- [x] T008 [P] Create HMAC signature utilities in src/lib/hmac.js (signature generation and validation helpers)
- [x] T009 Create Express app setup in src/app.js (basic server configuration, middleware registration)
- [x] T010 [P] Create environment configuration loader (read from .env, validate required variables)
- [x] T011 Create health check endpoint GET /health in src/routes/health.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 2 - Request Validation and Security Enforcement (Priority: P1) 🎯 MVP

**Goal**: Implement comprehensive request validation including HMAC authentication, timestamp validation, client allowlist checking, audio size/duration limits, and rate limiting. This is foundational security that must work before any audio processing can occur.

**Independent Test**: Send various invalid requests (expired timestamps, unauthorized clients, oversized audio, rate limit exceeded) and verify each is rejected with appropriate error messages. Send valid authenticated request and verify it passes all validation checks.

### Implementation for User Story 2

- [x] T012 [P] [US2] Implement HMAC signature validation middleware in src/middleware/auth.js (validate signature using crypto.timingSafeEqual, check timestamp freshness within 5-minute window)
- [x] T013 [P] [US2] Implement client allowlist validation in src/middleware/auth.js (verify clientId against allowlist from environment/config)
- [x] T014 [P] [US2] Implement request validation middleware in src/middleware/validation.js (check required fields: audio, clientId, timestamp, signature)
- [x] T015 [US2] Implement audio size validation in src/middleware/validation.js (enforce 10MB maximum file size)
- [x] T016 [US2] Implement audio duration validation in src/middleware/validation.js (enforce 5 minutes maximum duration)
- [x] T017 [P] [US2] Implement rate limiting middleware in src/middleware/rateLimit.js (sliding window algorithm, 100 requests per minute per client, in-memory tracking)
- [x] T018 [US2] Integrate validation middleware into Express app in src/app.js (apply auth, validation, and rateLimit middleware to /capture route)

**Checkpoint**: At this point, User Story 2 should be fully functional - all invalid requests are rejected, valid requests pass validation

---

## Phase 4: User Story 1 - Authenticated Voice Recording Submission (Priority: P1) 🎯 MVP

**Goal**: Implement the core capture flow: receive authenticated voice recording, transcribe via Wispr Flow API, forward transcription to internal endpoint with retries, and return success/failure acknowledgment to client.

**Independent Test**: Send authenticated HTTP request with valid audio file and verify: (1) request is accepted, (2) audio is sent to Wispr Flow for transcription, (3) transcription result is forwarded to internal endpoint, (4) success response is returned to client, (5) no audio artifacts remain after processing.

### Implementation for User Story 1

- [x] T019 [P] [US1] Implement transcription service in src/services/transcription.js (forward audio to Wispr Flow API, handle timeouts up to 60 seconds, return transcription text or error)
- [x] T020 [P] [US1] Implement forwarding service in src/services/forwarding.js (send transcription to internal endpoint with exponential backoff: 3 retries with 1s, 2s, 4s delays)
- [x] T021 [US1] Implement capture route handler in src/routes/capture.js (POST /capture endpoint, multipart/form-data parsing with multer, orchestrate transcription and forwarding)
- [x] T022 [US1] Implement request ID generation for correlation in src/routes/capture.js
- [x] T023 [US1] Integrate capture route into Express app in src/app.js (register /capture route with all middleware)
- [x] T024 [US1] Implement error handling for transcription failures in src/routes/capture.js (return appropriate error codes: 502 for Wispr Flow unavailable, 500 for transcription errors)
- [x] T025 [US1] Implement error handling for forwarding failures in src/routes/capture.js (return 503 if all retries exhausted, 500 for other forwarding errors)
- [x] T026 [US1] Implement success response formatting in src/routes/capture.js (return { success: true, message: "...", requestId: "..." })

**Checkpoint**: At this point, User Story 1 should be fully functional - authenticated requests are processed, transcribed, forwarded, and acknowledged

---

## Phase 5: User Story 3 - Ephemeral Data Handling (Priority: P2)

**Goal**: Ensure audio data exists only temporarily during processing and is immediately deleted after transcription completes, regardless of success or failure.

**Independent Test**: Submit requests and verify through system monitoring that: (1) audio exists only in memory or temporary storage during processing, (2) all audio artifacts are deleted immediately after transcription, (3) no audio persists in any storage system after request completion.

### Implementation for User Story 3

- [x] T027 [P] [US3] Implement cleanup service in src/services/cleanup.js (delete audio buffers immediately after transcription, ensure cleanup on both success and error paths)
- [x] T028 [US3] Integrate cleanup service into capture route in src/routes/capture.js (call cleanup after transcription completes, in both success and error handlers)
- [x] T029 [US3] Verify cleanup in error scenarios in src/routes/capture.js (ensure audio is deleted even when transcription or forwarding fails)
- [x] T030 [US3] Add cleanup verification logging in src/services/cleanup.js (log cleanup operations for monitoring, without logging sensitive audio data)

**Checkpoint**: At this point, User Story 3 should be fully functional - all audio is ephemeral and deleted immediately after use

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T031 [P] Add request logging middleware in src/middleware/logging.js (log all requests without sensitive data, include requestId for correlation)
- [x] T032 [P] Add error logging in src/lib/errors.js (log errors with appropriate detail levels, exclude sensitive data)
- [x] T033 [P] Update documentation in README.md (setup instructions, environment variables, API usage)
- [x] T034 [P] Add request correlation IDs to all log entries (include requestId in logs for tracing)
- [x] T035 Code cleanup and refactoring (review all files for consistency, remove unused code)
- [x] T036 Security hardening review (verify HMAC secrets are never logged, check all error messages don't leak sensitive info)
- [x] T037 Performance optimization review (verify memory cleanup is efficient, check for memory leaks in rate limiting)
- [x] T038 Run quickstart.md validation (verify all implementation steps from quickstart.md are complete)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 2 (Phase 3) must complete before User Story 1 (Phase 4) - validation is required for processing
  - User Story 1 (Phase 4) must complete before User Story 3 (Phase 5) - cleanup happens after processing
  - User stories should proceed sequentially in priority order (US2 → US1 → US3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories. MUST complete before US1.
- **User Story 1 (P1)**: Can start after Foundational (Phase 2) and User Story 2 (Phase 3) completion - Depends on US2 for validation
- **User Story 3 (P2)**: Can start after User Story 1 (Phase 4) completion - Depends on US1 for processing flow

### Within Each User Story

- Middleware before services
- Services before routes
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005, T006)
- All Foundational tasks marked [P] can run in parallel (T007, T008, T010)
- Within User Story 2: T012, T013, T014, T017 can run in parallel (different middleware files)
- Within User Story 1: T019, T020 can run in parallel (different service files)
- Within User Story 3: T027 can run independently
- All Polish tasks marked [P] can run in parallel (T031, T032, T033, T034)

---

## Parallel Example: User Story 2

```bash
# Launch all middleware for User Story 2 together:
Task: "Implement HMAC signature validation middleware in src/middleware/auth.js"
Task: "Implement client allowlist validation in src/middleware/auth.js"
Task: "Implement request validation middleware in src/middleware/validation.js"
Task: "Implement rate limiting middleware in src/middleware/rateLimit.js"
```

---

## Parallel Example: User Story 1

```bash
# Launch all services for User Story 1 together:
Task: "Implement transcription service in src/services/transcription.js"
Task: "Implement forwarding service in src/services/forwarding.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 2 (Security validation)
4. Complete Phase 4: User Story 1 (Core capture flow)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 2 → Test independently → Deploy/Demo (Security MVP!)
3. Add User Story 1 → Test independently → Deploy/Demo (Full MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo (Complete!)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 2 (Security - all middleware)
   - Developer B: Prepares for User Story 1 (can start after US2 completes)
3. Once User Story 2 is done:
   - Developer A: User Story 1 (Transcription service)
   - Developer B: User Story 1 (Forwarding service)
   - Developer C: User Story 1 (Route handler)
4. Once User Story 1 is done:
   - Developer A: User Story 3 (Cleanup service)
   - Developer B: Polish tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Constitution Compliance**: All implementation tasks MUST align with project constitution principles (`.specify/memory/constitution.md`). Review plan.md Constitution Check section before starting implementation.
- **Manual Testing**: All validation should be done through manual testing. No automated test infrastructure is required.

---

## Task Summary

**Total Tasks**: 38

**By Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (User Story 2): 7 tasks
- Phase 4 (User Story 1): 8 tasks
- Phase 5 (User Story 3): 4 tasks
- Phase 6 (Polish): 8 tasks

**By User Story**:
- User Story 2 (Security): 7 tasks
- User Story 1 (Core Flow): 8 tasks
- User Story 3 (Cleanup): 4 tasks

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel

**MVP Scope**: Phases 1-4 (Setup + Foundational + US2 + US1) = 26 tasks

