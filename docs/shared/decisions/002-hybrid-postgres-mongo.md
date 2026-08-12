# ADR-002: Hybrid PostgreSQL + MongoDB

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

The platform needs to store two very different kinds of data:
- Tightly relational data (users, enrollments, payroll, invoices) — ACID is mandatory
- Flexible data with a changing schema (questions across 8+ sub-types, flashcards, SRS state) — needs a document model

## Decision

**PostgreSQL via Supabase** for relational data (Prisma ORM).  
**MongoDB Atlas** for document data (Mongoose).

## Consequences

**Positive:**
- PostgreSQL: ACID, and the 500MB Supabase free tier is enough
- MongoDB: schema-free for Question (8+ sub-types with no migrations), good for nested content
- Both have a permanent free tier

**Negative:**
- The team has to know two query languages (Prisma + Mongoose)
- No cross-database transactions
- `questionIds` on Assignment is stored as a JSON array → cannot be joined directly

## Alternatives Considered

| Option | Why it was not chosen |
|--------|-----------------|
| PostgreSQL only (JSONB) | JSONB queries are complex, and indexing is weaker than MongoDB for nested data |
| MongoDB only | Hard to guarantee financial integrity, no foreign key constraints |
| PlanetScale (MySQL) | No foreign key support on the free tier |
