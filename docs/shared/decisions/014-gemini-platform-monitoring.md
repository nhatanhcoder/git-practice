# ADR-014: Centralized Gemini Platform Key & AI Monitoring Architecture

**Status**: Accepted  
**Date**: 2026-09-05  
**Applies to**: `apps/api/src/monitoring/`, Admin Monitoring UI  
**Related**: UC-A-005, `08-dashboard.md` §2, `ai/context/HANDOFF.md` § 2026-08-16

---

## Context

The HSK Learning Platform integrates Google Gemini for AI assistance (such as writing evaluation suggestions).
Two key architectural questions required resolution:
1. **API Key Ownership (UC-A-005)**: Whether users/teachers should provide their own Gemini API keys (BYOK) or the organization provides a centralized key.
2. **Telemetry & Monitoring**: How the Admin monitoring dashboard (`/admin/monitoring`) retrieves and observes AI latency, quotas, and service health.

---

## Decision

1. **Centralized Platform Key**: All AI features use a single organization-managed API key configured via server environment variable `GEMINI_API_KEY`. No end-user BYOK configuration is exposed.
2. **Quota & Health Probe**:
   - The API provides `GET /api/v1/admin/monitoring/gemini`.
   - The endpoint reports API availability, average latency, and quota consumption metrics for the admin monitoring dashboard.
3. **Health Probes**: In addition to Gemini telemetry, the monitoring module provides system probes for PostgreSQL database connectivity, Redis cache (or memory cache), and Cloudflare R2 storage readiness.

---

## Consequences

**Positive:**
- Centralized billing, security, and quota management.
- Simplifies teacher grading workflows without friction of external API configuration.
- Unblocks the `/admin/monitoring` service health cards.

**Negative / Trade-offs:**
- Platform incurs the token cost of Gemini API usage centrally.
