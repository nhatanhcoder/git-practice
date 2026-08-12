# ADR-001: Monolith 5-Layer Architecture

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

We need an architecture that suits a small team (1–3 people), a short development timeline, and deployment on free tiers. The options were: microservices, monolith, monorepo.

## Decision

Use a **NestJS monolith** split into 5 clear layers:
1. **Controller** — receives the HTTP request, validates the DTO
2. **Service** — business logic
3. **Repository / Prisma** — database access
4. **Guard / Middleware** — auth, RBAC
5. **Module** — dependency injection boundary

## Consequences

**Positive:**
- Simple deployment (a single instance on the Railway/Render free tier)
- No need for service discovery or a message broker
- Easy to refactor into microservices later (module boundaries are clear)

**Negative:**
- Cannot scale horizontally per feature
- Every feature shares the same memory / process

## Alternatives Considered

| Option | Why it was not chosen |
|--------|-----------------|
| Microservices | Too complex for a small team, large ops overhead |
| Serverless functions | Hard to maintain state, cold starts for NestJS |
