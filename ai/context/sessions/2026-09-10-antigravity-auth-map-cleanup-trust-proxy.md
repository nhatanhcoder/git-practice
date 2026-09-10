## [2026-09-10] — Auth Map Cleanup & Trust Proxy IP Strategy (A1 + A2) — Antigravity — branch `fix/auth-map-cleanup-trust-proxy`

**Context**:
Addressed technical debt in Auth in-memory state management (`loginAttempts`, `rotationCache`) and reverse proxy IP extraction strategy (A1 + A2).

**Done**:
- **A1 `loginAttempts` periodic sweep without timers (`apps/api/src/auth/auth.service.ts`)**:
  - Implemented `sweepExpiredLoginAttempts(now = Date.now())` that runs during both `checkLoginRateLimit` and `recordFailedLogin`.
  - Cleans any entry past the 15-minute sliding window across all keys, preventing unbounded Map growth.
  - Confirmed that attempts rejected with 429 `AUTH_TOO_MANY_REQUESTS` do not increment the counter further.
  - Re-allowed attempts after 15 minutes reset the counter to 1.
- **A1 `rotationCache` expiration cleanup & FIFO eviction (`apps/api/src/auth/auth.service.ts`)**:
  - Added `MAX_ROTATION_CACHE_ENTRIES = 10_000`.
  - Implemented `getRotationCache(tokenHash)` which deletes expired entries (`expiresAt <= Date.now()`) on read.
  - Implemented `setRotationCache(tokenHash, entry)` which sweeps expired entries and evicts the oldest entry (FIFO) if capacity exceeds `10_000`.
- **A2 Express `trust proxy` & IP resolution (`apps/api/src/main.ts` + `apps/api/src/auth/auth.controller.ts`)**:
  - Configured `app.set('trust proxy', process.env.TRUST_PROXY ?? 1)` in `main.ts` with `NestExpressApplication` typing.
  - Removed manual `x-forwarded-for?.split(',')[0]` splitting from `auth.controller.ts`, relying directly on Express's sanitized `req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1'`.
  - Prevents client-forged `X-Forwarded-For` IP spoofing and properly partitions rate limiting across distinct client IPs behind proxies.
- **Tests**:
  - Added `apps/api/test/auth-map-cleanup.test.ts` (6 tests covering sweep, rate-limit window, 429 counter lock, rotation cache read eviction, max entries overflow, and trust proxy multi-hop extraction).
  - Verified:
    - `auth-map-cleanup.test.ts`: **6/6 passed**.
    - `auth.e2e.test.ts`: **17/17 passed**.
    - `refresh-token-concurrency.e2e.test.ts`: **4/4 passed**.
    - `pnpm --filter web build`: **42/42 static pages pass**.
    - `node scripts/check-docs.mjs`: **8/8 checks pass**.

**Blocker / needs follow-up**:
- None for A1 + A2.

**Next steps**:
- Proceed to Group B + C + D (Helmet, Swagger dev-only gate, Graceful shutdown in `main.ts`) or Group G (Grammar hook-order fix).
