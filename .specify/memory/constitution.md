<!--
Sync Impact Report
==================
Version: 0.1.0 → 1.0.0 (Initial creation)
Modified Principles: N/A (initial)
Added Sections: All sections (initial creation)
Removed Sections: N/A
Templates Requiring Updates:
  - ✅ updated: .specify/templates/plan-template.md (added Constitution Check section with 5 principle gates)
  - ✅ updated: .specify/templates/spec-template.md (added constitution compliance note in Requirements section)
  - ✅ updated: .specify/templates/tasks-template.md (added constitution compliance reminder in Notes section)
  - ⚠ pending: .specify/templates/commands/*.md (commands directory does not exist yet)
Follow-up TODOs: None
-->

# Project Constitution: Capture Service

**Version:** 1.0.0  
**Ratification Date:** 2025-01-27  
**Last Amended Date:** 2025-01-27

## Purpose

This constitution defines the non-negotiable principles and governance rules that guide all development, architecture, and operational decisions for the Capture Service project.

## Project Overview

The **Capture Service** is a small, private ingestion service whose sole purpose is to securely receive short voice recordings from a trusted mobile client, convert them into high-quality text using Wispr Flow, and forward the resulting transcription to an internal automation system.

### Motivation

Mobile voice capture is fast and low-friction, but consumer voice apps do not provide reliable, secure, or automatable export mechanisms. This service exists to **bridge the gap between mobile voice input and structured automation**, while maintaining security, simplicity, and full ownership of the data pipeline.

### High-Level Function

At a high level, the Capture Service:

* Accepts authenticated voice recordings from a trusted client
* Sends audio to Wispr Flow for transcription
* Receives the final transcription
* Forwards the text to an internal system for further processing
* Discards audio immediately after use

The service does **not** classify, store, or interpret content beyond transcription.

## Principles

### Principle 1: Simplicity First

The service MUST do exactly one thing: authenticated audio in, text out. Any logic not required for secure capture or transcription MUST live elsewhere.

**Rationale:** Complexity increases maintenance burden, attack surface, and operational risk. By strictly limiting scope, we ensure the service remains maintainable and auditable.

### Principle 2: Strong Security by Default

The service MUST assume it is internet-facing and enforce authentication, replay protection, and strict request validation to prevent unauthorized use.

**Rationale:** As a public entry point, the service is a high-value target. Security cannot be an afterthought; it must be built into every layer of the service architecture.

### Principle 3: Stateless and Ephemeral

The service MUST NOT maintain long-term storage of audio or text. Audio exists only in memory or temporary storage for the duration of transcription.

**Rationale:** Ephemeral data handling reduces privacy risk, compliance burden, and storage costs. Statelessness enables horizontal scaling and simplifies operations.

### Principle 4: Minimal Tech Surface Area

The service MUST use a small Node.js (npm-based) HTTP(s?) service to minimize dependencies, operational overhead, and maintenance complexity.

**Rationale:** A minimal technology stack reduces attack surface, deployment complexity, and the cognitive load required to understand and maintain the system.

### Principle 5: Internal System Isolation

Downstream systems (automation, databases, AI workflows) MUST NOT be exposed publicly; the capture service is the only public entry point.

**Rationale:** Network isolation protects internal systems from external threats and ensures that the capture service is the single point of security enforcement and monitoring.

## Governance

### Amendment Procedure

1. Proposed amendments MUST be documented with clear rationale
2. Amendments affecting principles require explicit approval
3. Version MUST be incremented according to semantic versioning rules
4. All dependent templates and documentation MUST be updated in sync

### Versioning Policy

- **MAJOR:** Backward incompatible governance/principle removals or redefinitions
- **MINOR:** New principle/section added or materially expanded guidance
- **PATCH:** Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Review

All code changes, architectural decisions, and operational procedures MUST be evaluated against these principles. Violations MUST be documented and addressed before deployment.
