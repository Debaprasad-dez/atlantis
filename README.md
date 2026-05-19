# ATLANTIS

Offline-first, browser-based financial-fraud analytics platform. Palantir-Gotham–inspired UI. No server calls today — IndexedDB + Web Workers + Service Worker. **Built for a future backend** via a repository layer that lets a single config flag swap Dexie for `fetch()` without touching screens.

## Stack

- **React 18** + JavaScript (PropTypes + JSDoc) + Vite
- **Tailwind CSS** with a custom dark, dense design system
- **Dexie.js** over IndexedDB (versions 1–3)
- **Zustand** for UI / live / auth / toast state
- **Web Workers** for seeding and the live tick
- **vite-plugin-pwa** for the service worker / offline shell
- **react-virtuoso** for virtualized tables, **leaflet** for maps, **react-force-graph-2d** for graph, **framer-motion** for restrained transitions
- **Repository layer** (`src/repo/`) — every screen/hook talks to repos, not Dexie directly. Today repos resolve locally; tomorrow they delegate to the API when `VITE_API_BASE_URL` is set.

## Getting started

```bash
npm install
npm run dev
```

First boot runs the seed worker (~10–60s); subsequent boots are instant.
To re-seed: DevTools → Application → IndexedDB → delete `atlantis`.

## What's in Phase 1 + 2 + 3

**Phase 1** — app shell, dashboard with 14 live tiles, Entity Explorer, Login, Admin / Roles with custom role builder, seeded fraud patterns.

**Phase 2** — RBAC gating (Permitted, RouteGuard, permission-aware nav), chip-based query language, Graph View, Investigation Workspace, Audit Log screen.

**Phase 3 (new)**
- **Interactive tiles** — every `⋯` menu now opens. Tiles support real Refresh / Expand / Copy / Export / Configure actions. Tiles also drill into other screens on click (counters → filtered Explorer, histogram bars → risk-band Explorer, audit rows → focused audit page, etc.).
- **Live feed** — pause/resume, severity quick filter, click-to-inspect modal, copy/export.
- **Graph View** — right-click context menu (Pin, Hide, Expand neighbors, Add to case, Copy ID, Open in Explorer), shift-click multi-select, bulk actions on selection, Zoom-to-fit, Unhide-all.
- **Geospatial full-screen** (`/map`) — basemap picker, clustering toggle, risk threshold + event-window sliders, click-to-inspect, deep-link to Entity Explorer or Graph. Offline tile cache infrastructure wired (Dexie `tileCache` store + cache/clear controls); production MBTiles ingestion is Phase 4.
- **Anomaly Detection tuning** (`/anomalies`) — six tunable signals with per-signal weights, global threshold, live preview against a 500-entity sample, save/load named model configs, "APPLY → ANOMALIES" writes flagged rows to Dexie.
- **Custom Report Builder** (`/reports`) — drag-orderable sections (cover, metrics, query, anomalies, cases, notes), live preview, save/load, print-to-PDF (browser), per-section CSV export.
- **Hash-chained audit** — every audit row stores `prevHash` and SHA-256 `hash`. VERIFY CHAIN button on the Audit Log screen recomputes and reports tampering.
- **Toasts** — global notification system (`@/stores/toastStore`) used by every interactive action.
- **Backend abstraction** — `src/lib/api.js` (fetch wrapper with Bearer auth) + `src/repo/*.js` (repository facade). `authStore` now carries a `token` field. Plumbing complete; behavior unchanged offline.

## Backend integration (future)

When the API is ready:

```bash
# .env.local
VITE_API_BASE_URL=https://api.atlantis.example.com
```

`apiEnabled()` flips to true and every repo's `tryRemoteThenLocal()` starts calling the API first, falling back to Dexie cache on network failure. No screen-level changes required.

`authStore.login(user, token)` already accepts a token. The Login screen's `submit()` can post credentials to the API and call `login(user, token)`; everything downstream uses `Bearer ${token}` via `authHeader()`.

## Project layout

```
src/
  components/
    primitives/      Panel, Tile, DataTable, Sparkline, MetricCard, StatusIndicator,
                     LiveBadge, FilterChip, Inspector, RiskBar, Menu, Modal
    tiles/           One file per dashboard tile (all with real menu actions)
    Permitted.jsx    RBAC content gate
    RouteGuard.jsx   RBAC route gate
    ChipQueryInput   Query chips with parser feedback
    Toasts.jsx       Global toast renderer
  features/
    shell/           TopBar, LeftNav, BottomStatusBar, CommandPalette, AppShell
    dashboard/       Dashboard composition
    entities/        Entity Explorer (chip query, saved queries, CSV export, seedQuery / focus deep-link)
    graph/           Graph View (right-click menu, multi-select, pin/hide/expand)
    geo/             Geospatial full-screen
    investigations/  List + 3-column case workspace
    audit/           Audit Log (hash-chain verify, CSV export)
    anomalies/       Anomaly model tuning
    reports/         Report builder (sections + print-to-PDF)
    auth/            Login (token-ready)
    admin/           Roles + custom role builder
    boot/            Boot splash
  db/                Dexie schema (v1 + v2 + v3)
  repo/              entitiesRepo, auditRepo (with hash chain), base helpers
  workers/           seed.worker.js, tick.worker.js
  hooks/             useSeed, useLiveTick, useEntities, useDexie, useRoles,
                     useQueryEntities, useGraphData, usePermissions, useRefreshable
  stores/            authStore, uiStore, liveStore, toastStore
  lib/               api, format, ids, rbac, audit, cn, csv, clipboard, query, anomalyModel
  types/             JSDoc @typedef definitions
  styles/            index.css (Tailwind + tokens + z-index scale)
```

## Path aliases

`@/...` → `src/...`. Configured in both `jsconfig.json` (IDE) and `vite.config.js` (build).

## Design-system tokens

See `tailwind.config.js`. Highlights:

- Background base `#0A0E14`, panel `#141B23`, elevated `#0F1419`
- Accents: cyan `#00D9FF`, amber `#FFB627`, critical `#FF4747`, success `#22D3A6`
- Typography: Inter for UI (tabular-nums on), JetBrains Mono for IDs/timestamps/numbers
- Sizes lean small: 13px base, 12px tables, 11px labels, 10px micro-labels uppercase-tracked
- Borders 1px everywhere, radius 0–4px, no pill shapes
- Documented z-index scale in `src/styles/index.css`

## Performance notes

- Tables are virtualized; 50k rows scroll smoothly
- Seeding is chunked (5k per Dexie `bulkPut`) inside a Web Worker
- Live tick batches 2–8 events every 2–5s
- Heavy modules (force-graph) are dynamically imported so they don't block dashboard first paint
- `useRefreshable()` exposes a re-fetch trigger so tile Refresh actions are cheap

## Testing

```bash
npm test              # one-shot
npm run test:watch    # watch mode
npm run test:coverage # v8 coverage report
```

Vitest + jsdom; fake-indexeddb auto-injected; framer-motion / leaflet / force-graph / virtuoso mocked in `src/test/setup.js`.

## Phase 4 (planned)

- Graph layout offloaded to a dedicated Web Worker (d3-force)
- MBTiles tile pack ingestion for true offline maps
- Production backend integration (currently the abstraction layer is in place)
- WebSocket live-data wiring (replace the simulated tick worker)
- Per-anomaly model evaluator running in a worker pool
- E2E tests with Playwright
