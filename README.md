# Resource-Heavy Reporting API (Proxy Pattern)

A TypeScript / Node.js / Express REST API that demonstrates the **Proxy Pattern** with two cooperating proxies: a **Protection Proxy** (role-based access control) in front of a **Virtual Proxy** (lazy initialization and caching) in front of an expensive real subject, `HeavyReportGenerator`. There is no database: all state is in memory.

## Architecture

```text
HTTP Client
    |
    v
REST API / Controller          (depends only on the Report interface)
    |
    v
ProtectionReportProxy          (authorizes BEFORE forwarding)
    |
    v
VirtualReportProxy             (creates the heavy object lazily, once)
    |
    v
HeavyReportGenerator           (increments MetricsTracker in its constructor)
```

`ProtectionReportProxy`, `VirtualReportProxy` and `HeavyReportGenerator` all implement the same `Report` interface:

```typescript
export interface Report {
  getTitle(): string;
  generate(userRole: string): string;
}
```

## Proxy Pattern

A proxy implements the same interface as the real subject and controls access to it. Clients cannot tell the difference, so behavior such as access control or lazy loading is added without touching the real subject or its callers.

### Virtual Proxy

`VirtualReportProxy` stores the report ID and title and starts with `realSubject = null`.

- the constructor never creates a `HeavyReportGenerator`
- `getTitle()` returns the cached title without creating anything
- the first `generate()` creates the `HeavyReportGenerator` and caches it
- every later `generate()` reuses the cached instance

### Protection Proxy

`ProtectionReportProxy` wraps another `Report` and stores a required role.

- `getTitle()` is delegated with no authorization
- `generate(userRole)` requires `userRole === requiredRole` (exact, case-sensitive)
- a mismatch throws `AccessDeniedError` (mapped to HTTP 403) and the wrapped report is never called

Because the Protection Proxy is the outer layer, an unauthorized request never reaches the Virtual Proxy, so `HeavyReportGenerator` is never instantiated for it.

## Project Structure

```text
.
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── reportController.ts
│   │   │   └── metricsController.ts
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── core/
│   │   ├── Report.ts
│   │   ├── HeavyReportGenerator.ts
│   │   ├── MetricsTracker.ts
│   │   └── errors.ts
│   ├── proxies/
│   │   ├── VirtualReportProxy.ts
│   │   └── ProtectionReportProxy.ts
│   └── data/
│       └── reportStore.ts
├── tests/
│   ├── metrics.test.ts
│   ├── reports.test.ts
│   ├── virtualProxy.test.ts
│   ├── protectionProxy.test.ts
│   ├── api.test.ts
│   └── integration.test.ts
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
└── README.md
```

## Seeded Reports

| ID | Title | Required role |
|----|-------|---------------|
| report-1 | Financial Q1 | admin |
| report-2 | User Analytics | manager |
| report-3 | System Status | guest |

Each is stored as `ProtectionReportProxy -> VirtualReportProxy -> HeavyReportGenerator`; the heavy object does not exist until it is first needed.

## API Endpoints

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | `/health` | 200 `{"status":"ok"}` | |
| GET | `/api/metrics` | 200 `{"total_instantiations": N}` | |
| POST | `/api/metrics/reset` | 200 `{"message":"Metrics reset successfully"}` | |
| GET | `/api/reports` | 200 array of `{id, title, required_role}` | |
| GET | `/api/reports/:id/generate?role=...` | 200 `{"id","content"}` | 400 missing/invalid role, 403 `{"error":"Access Denied"}`, 404 `{"error":"Report not found"}` |

## Example curl Commands

```bash
curl http://localhost:8080/health
```

```bash
curl http://localhost:8080/api/metrics
```

```bash
curl http://localhost:8080/api/reports
```

```bash
curl "http://localhost:8080/api/reports/report-3/generate?role=guest"
```

```bash
curl "http://localhost:8080/api/reports/report-1/generate?role=guest"
```

```bash
curl "http://localhost:8080/api/reports/report-1/generate?role=admin"
```

```bash
curl -X POST http://localhost:8080/api/metrics/reset
```

## Running Locally

Requires Node.js 18 or newer.

```bash
npm install
npm run build
npm start
```

The server listens on `http://localhost:8080` (override with the `PORT` environment variable). For development without a build step: `npm run dev`.

No environment variables are required and there are no secrets. `.env.example` only documents the optional `PORT`.

## Running with Docker

```bash
docker compose up -d
```

No local Node.js or npm install is needed. The image is built in two stages, runs as a non-root user, exposes port 8080, and has a health check against `GET /health`.

```bash
docker compose ps
curl http://localhost:8080/health
docker compose down
```

## Running Tests

```bash
npm test
```

The suite covers the metrics tracker, the Virtual Proxy, the Protection Proxy, the seeded store, every endpoint, 400/403/404 behavior, concurrency, and the full assignment sequence (`tests/integration.test.ts`).

## Expected Metrics Behavior

| Step | `total_instantiations` |
|------|------------------------|
| clean start | 0 |
| `GET /api/reports` | 0 |
| `report-3` + `guest` (first) | 1 |
| `report-3` + `guest` (second, third, fourth) | 1 |
| `report-1` + `guest` (403) | 1 |
| `report-1` + `admin` | 2 |
| `POST /api/metrics/reset` | 0 |

## Design Decisions

- Traditional OO: a `Report` interface and three classes implementing it; the controller only sees `Report`.
- The counter lives in a static `MetricsTracker` and is incremented only inside the `HeavyReportGenerator` constructor, so it measures real instantiations and nothing else.
- Protection Proxy wraps Virtual Proxy (not the reverse) so authorization happens before any lazy creation.
- `ReportStore` seeds the three proxies at startup and keeps them in an in-memory `Map`. `GET /api/reports` reads only titles and required roles, so it never triggers instantiation.
- `POST /api/metrics/reset` resets the counter and also rebuilds the seeded proxies. Without the rebuild, a report generated before the reset would stay cached and a later generation would not count, so the reset would not give a truly clean state.
- `createApp(store)` builds an isolated app per call, which keeps tests independent.

## Error Handling

A central Express error handler maps domain errors to responses, so the server never crashes on bad input.

| Condition | Status | Body |
|-----------|--------|------|
| success | 200 | endpoint payload |
| missing, empty or repeated `role` | 400 | `{"error": "Query parameter \"role\" is required"}` |
| role does not match exactly | 403 | `{"error": "Access Denied"}` |
| unknown report ID | 404 | `{"error": "Report not found"}` |
| unknown route | 404 | `{"error": "Not Found"}` |
| unexpected error | 500 | `{"error": "Internal Server Error"}` |

An unknown report ID is checked first, so it returns 404 even when `role` is missing.

## Concurrency Consideration

Node.js runs JavaScript on a single thread, and `VirtualReportProxy.generate()` is synchronous: the check `realSubject === null` and the assignment happen with no `await` between them, so two concurrent requests cannot both observe `null`. Each proxy therefore creates at most one `HeavyReportGenerator`. The tests fire 50 concurrent proxy calls and 25 concurrent HTTP requests and assert the count is exactly 1. If initialization ever becomes asynchronous, the proxy should cache the in-flight `Promise` instead of the resolved value.
