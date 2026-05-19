# ATLANTIS — Test Plan

A complete enumeration of test cases for the Phase 1 codebase. Each case has a stable ID so it can be referenced from PRs and bug reports.

**Legend**
- `[I]` Implemented as a Vitest case
- `[D]` Deferred to a later phase (and why)
- `[M]` Manual / exploratory test (not automated)

---

## TC-LIB-IDS — `src/lib/ids.js`

| ID | Case | Status |
| --- | --- | --- |
| LIB-IDS-01 | `ulid()` returns a non-empty string | [I] |
| LIB-IDS-02 | `ulid()` is ~19 chars and uppercase alphanumeric | [I] |
| LIB-IDS-03 | Two successive `ulid()` calls produce distinct strings | [I] |
| LIB-IDS-04 | `ulid()` is lexicographically sortable in time order (with fixed Date) | [I] |
| LIB-IDS-05 | `seq(prefix, n)` returns `prefix + base36 padded to 8` | [I] |
| LIB-IDS-06 | `seq('E', 0)` → `E00000000`; `seq('E', 35)` → `E0000000Z` | [I] |

## TC-LIB-FORMAT — `src/lib/format.js`

| ID | Case | Status |
| --- | --- | --- |
| LIB-FMT-01 | `fmtInt(0) === '0'` | [I] |
| LIB-FMT-02 | `fmtInt(1234567)` includes a thousands separator | [I] |
| LIB-FMT-03 | `fmtInt(null)` returns `'0'` (no throw) | [I] |
| LIB-FMT-04 | `fmtCompact(1500)` returns `'1.5K'` | [I] |
| LIB-FMT-05 | `fmtMoney(1234.5)` includes `$` and 2 decimals | [I] |
| LIB-FMT-06 | `fmtMoney(1, 'EUR')` includes `EUR` suffix | [I] |
| LIB-FMT-07 | `fmtTime(0)` returns `'00:00:00'` | [I] |
| LIB-FMT-08 | `fmtDateTime(0)` returns `'1970-01-01 00:00:00'` | [I] |
| LIB-FMT-09 | `fmtRelative(now - 5000)` returns `'5s ago'` | [I] |
| LIB-FMT-10 | `fmtRelative(now - 3*60*1000)` returns `'3m ago'` | [I] |
| LIB-FMT-11 | `fmtRelative(now + 1000)` returns `'in future'` | [I] |
| LIB-FMT-12 | `fmtPct(33.456)` returns `'33.5%'` | [I] |

## TC-LIB-RBAC — `src/lib/rbac.js`

| ID | Case | Status |
| --- | --- | --- |
| LIB-RBAC-01 | `ALL_PERMISSIONS` exports 9 permissions across Read/Write/Admin groups | [I] |
| LIB-RBAC-02 | `BUILTIN_ROLES` contains exactly 3 roles, all flagged `system: true` | [I] |
| LIB-RBAC-03 | Analyst has view_entities, view_relationships, view_events only | [I] |
| LIB-RBAC-04 | Investigator includes view_audit, open_investigations, export_data | [I] |
| LIB-RBAC-05 | Admin includes manage_users and manage_roles | [I] |
| LIB-RBAC-06 | `can(null, roles, 'view_entities')` returns false | [I] |
| LIB-RBAC-07 | `can(analyst, roles, 'view_entities')` returns true | [I] |
| LIB-RBAC-08 | `can(analyst, roles, 'manage_roles')` returns false | [I] |
| LIB-RBAC-09 | `can(user, roles, 'unknown_perm')` returns false | [I] |
| LIB-RBAC-10 | `can(user, [], 'view_entities')` returns false (role not found) | [I] |

## TC-LIB-AUDIT — `src/lib/audit.js`

| ID | Case | Status |
| --- | --- | --- |
| LIB-AUD-01 | `audit(user, action)` writes a row into Dexie `audit` table | [I] |
| LIB-AUD-02 | Audit row has `userId`, `action`, `ts` populated | [I] |
| LIB-AUD-03 | Missing `userId` falls back to `'system'` | [I] |
| LIB-AUD-04 | `audit()` never throws even if Dexie throws | [I] |
| LIB-AUD-05 | `target` and `details` are persisted when supplied | [I] |

## TC-DB-SCHEMA — `src/db/schema.js`

| ID | Case | Status |
| --- | --- | --- |
| DB-SCH-01 | `db` is a Dexie instance named `'atlantis'` | [I] |
| DB-SCH-02 | All 10 object stores are defined | [I] |
| DB-SCH-03 | `entities.bulkPut` then `where('type').equals(...)` works | [I] |
| DB-SCH-04 | Compound index `[entityId+ts]` works on `events` | [I] |
| DB-SCH-05 | `meta.put({key, value})` round-trips | [I] |

## TC-STORE-AUTH — `src/stores/authStore.js`

| ID | Case | Status |
| --- | --- | --- |
| STORE-AU-01 | Initial state: `user === null` | [I] |
| STORE-AU-02 | `login(user)` sets `user` | [I] |
| STORE-AU-03 | `logout()` resets `user` to null | [I] |
| STORE-AU-04 | State persists to `localStorage` under `atlantis.auth` | [I] |

## TC-STORE-UI — `src/stores/uiStore.js`

| ID | Case | Status |
| --- | --- | --- |
| STORE-UI-01 | Initial: leftNavCollapsed=false, rightInspectorOpen=true, paletteOpen=false | [I] |
| STORE-UI-02 | `toggleLeftNav` flips `leftNavCollapsed` | [I] |
| STORE-UI-03 | `toggleRightInspector` flips `rightInspectorOpen` | [I] |
| STORE-UI-04 | `setPaletteOpen(true/false)` sets exactly that value | [I] |

## TC-STORE-LIVE — `src/stores/liveStore.js`

| ID | Case | Status |
| --- | --- | --- |
| STORE-LV-01 | Initial feed is empty, metrics zeroed for ingested+alerts | [I] |
| STORE-LV-02 | Sparks arrays each start at length 60 | [I] |
| STORE-LV-03 | `pushTick(events, null, metrics)` prepends events (newest first) | [I] |
| STORE-LV-04 | Feed is capped at 200 entries | [I] |
| STORE-LV-05 | An anomaly is prepended to `anomalies` and capped at 80 | [I] |
| STORE-LV-06 | `metrics.totalIngested` accumulates across ticks | [I] |
| STORE-LV-07 | Critical events bump `alertsPending` | [I] |
| STORE-LV-08 | Sparks roll forward (length stays 60, last element updates) | [I] |
| STORE-LV-09 | `acknowledgeAlerts()` resets `alertsPending` to 0 | [I] |

## TC-PRIM — `src/components/primitives/*`

| ID | Case | Status |
| --- | --- | --- |
| PRIM-PNL-01 | `<Panel>` renders children | [I] |
| PRIM-PNL-02 | `<Panel header=…>` renders the header bar | [I] |
| PRIM-PNL-03 | `<Panel footer=…>` renders the footer | [I] |
| PRIM-TL-01 | `<Tile title>` renders the uppercase title | [I] |
| PRIM-TL-02 | `<Tile live>` renders the LIVE badge | [I] |
| PRIM-TL-03 | `<Tile actions>` slot is rendered next to the ⋯ menu | [I] |
| PRIM-LB-01 | `<LiveBadge state="live">` has a pulsing dot class | [I] |
| PRIM-LB-02 | `<LiveBadge state="error">` uses critical color | [I] |
| PRIM-SI-01 | `<StatusIndicator status="healthy">` renders healthy color | [I] |
| PRIM-SI-02 | `<StatusIndicator status="offline" label="X">` renders the label | [I] |
| PRIM-MC-01 | `<MetricCard label value delta spark>` shows all 4 parts | [I] |
| PRIM-MC-02 | Negative delta is colored critical | [I] |
| PRIM-MC-03 | Positive delta is colored success and prefixed with `+` | [I] |
| PRIM-SP-01 | `<Sparkline>` with N values produces a path with N points | [I] |
| PRIM-SP-02 | Empty values array does not throw | [I] |
| PRIM-RB-01 | `<RiskBar score=95>` uses critical tone | [I] |
| PRIM-RB-02 | `<RiskBar score=10>` uses success tone | [I] |
| PRIM-RB-03 | `<RiskBar score=120>` clamps width to 100% | [I] |
| PRIM-FC-01 | `<FilterChip>` calls `onClick` when clicked | [I] |
| PRIM-FC-02 | `<FilterChip onRemove>` shows `×` and calls `onRemove` | [I] |
| PRIM-FC-03 | Clicking `×` does not bubble to `onClick` | [I] |
| PRIM-INS-01 | `<Inspector title subtitle>` renders both | [I] |
| PRIM-INS-02 | Close button calls `onClose` | [I] |
| PRIM-INS-03 | `<KV>` renders label + value | [I] |
| PRIM-DT-01 | `<DataTable>` renders header labels | [I] |
| PRIM-DT-02 | Row click invokes `onRowClick(row)` | [I] |
| PRIM-DT-03 | Clicking a sortable header toggles sort direction | [I] |
| PRIM-DT-04 | Empty `rows` array renders without crashing | [I] |

## TC-HOOKS

| ID | Case | Status |
| --- | --- | --- |
| HOOK-DX-01 | `useDexie` resolves data, sets `loading=false` | [I] |
| HOOK-DX-02 | `useDexie` surfaces the error from the query fn | [I] |
| HOOK-DX-03 | Re-running deps re-executes the query | [I] |
| HOOK-EN-01 | `useEntityCount()` returns the total entity count | [I] |
| HOOK-EN-02 | `useEntityCount('person')` returns count for that type | [I] |
| HOOK-EN-03 | `useEntities({types:['person']})` returns only persons | [I] |
| HOOK-EN-04 | `useEntities({riskRange:[80,100]})` filters by risk | [I] |
| HOOK-EN-05 | `useEntities({search:'x'})` matches name substrings | [I] |
| HOOK-EN-06 | `useEntities({limit:5})` caps the result set | [I] |
| HOOK-RO-01 | `useRoles` falls back to BUILTIN_ROLES when table is empty | [I] |
| HOOK-RO-02 | `useRoles` reads custom roles from Dexie when present | [I] |
| HOOK-SD-01 | `useSeed` resolves to `ready=true` when `meta.seeded=true` | [I] |
| HOOK-LT-01 | `useLiveTick` instantiates a Worker on mount and terminates on unmount | [D] *(Worker mocking is non-trivial; covered indirectly by store tests.)* |

## TC-SHELL

| ID | Case | Status |
| --- | --- | --- |
| SHELL-TB-01 | `<TopBar>` shows brand, user name, alert counter | [I] |
| SHELL-TB-02 | Power icon click invokes `logout()` | [I] |
| SHELL-TB-03 | Search button opens the palette | [I] |
| SHELL-LN-01 | `<LeftNav>` renders 8 nav items expanded; only icons when collapsed | [I] |
| SHELL-LN-02 | The Dashboard link is active by default at `/` | [I] |
| SHELL-BS-01 | `<BottomStatusBar>` renders record count and current user | [I] |
| SHELL-CP-01 | `Ctrl+K` toggles the palette open | [I] |
| SHELL-CP-02 | `Escape` closes the palette | [I] |
| SHELL-CP-03 | Typing filters available actions by fuzzy match | [I] |
| SHELL-CP-04 | `Enter` activates the selected item | [I] |
| SHELL-CP-05 | ArrowDown moves selection | [I] |

## TC-AUTH-LOGIN

| ID | Case | Status |
| --- | --- | --- |
| AUTH-LG-01 | Login renders an operator-name input | [I] |
| AUTH-LG-02 | All 3 built-in roles are listed with their permission counts | [I] |
| AUTH-LG-03 | Submitting persists a user via `useAuthStore.login` | [I] |
| AUTH-LG-04 | A custom role appears in the list and is selectable | [I] |
| AUTH-LG-05 | Submitting writes an `action: 'login'` audit row | [I] |

## TC-ADMIN-ROLES

| ID | Case | Status |
| --- | --- | --- |
| ADMIN-RB-01 | Editor shows "NEW ROLE" header when nothing is selected | [I] |
| ADMIN-RB-02 | Typing a name + clicking a permission then SAVE writes a row | [I] |
| ADMIN-RB-03 | Saved custom role appears in the roster | [I] |
| ADMIN-RB-04 | System roles have no DEL button; custom roles do | [I] |
| ADMIN-RB-05 | Saving a role writes an audit entry `create_role` or `edit_role` | [I] |
| ADMIN-RB-06 | Permission toggles update the group counter (`1/4`) | [M] *(visual; covered by DOM assertion via counter text.)* |

## TC-ENTITY-EXPLORER

| ID | Case | Status |
| --- | --- | --- |
| ENT-EX-01 | Faceted filter chips render for type/country/tags | [I] |
| ENT-EX-02 | Clicking a row opens the inspector and writes a `view_entity` audit row | [I] |
| ENT-EX-03 | Search input filters the row count | [I] |
| ENT-EX-04 | Risk range numeric inputs propagate into the filter | [I] |
| ENT-EX-05 | Inspector close button clears selection | [I] |

## TC-DASHBOARD

| ID | Case | Status |
| --- | --- | --- |
| DASH-01 | Dashboard mounts all 14 tile titles | [I] |
| DASH-02 | SystemStatusStrip displays each KPI label | [I] |
| DASH-03 | LiveEventFeed renders rows when liveStore has feed entries | [I] |
| DASH-04 | EntityCounters shows a counter for each of 6 types | [I] |
| DASH-05 | AlertSummaryTile shows CRIT/WARN/INFO | [I] |
| DASH-06 | DataSourceHealthTile lists rows from `sources` table | [I] |
| DASH-07 | GeoHeatmap renders (with mocked Leaflet) without throwing | [I] |
| DASH-08 | GraphPreviewTile renders (force-graph mocked) without throwing | [I] |
| DASH-09 | QueryPerfTile shows LAST / AVG / MAX | [I] |
| DASH-10 | TimeSeriesChart renders chart legend | [I] |

## TC-BOOT

| ID | Case | Status |
| --- | --- | --- |
| BOOT-SP-01 | BootSplash shows the stage name | [I] |
| BOOT-SP-02 | Progress bar width matches `done/total` | [I] |
| BOOT-SP-03 | Error message is rendered when `error` prop is set | [I] |

## TC-ROUTING — `src/App.jsx`

| ID | Case | Status |
| --- | --- | --- |
| APP-RT-01 | Unauthenticated user is redirected to `/login` | [I] |
| APP-RT-02 | After seeding+login, `/` renders the Dashboard | [I] |
| APP-RT-03 | `/admin` renders the role builder | [I] |
| APP-RT-04 | Unknown paths redirect to `/` | [I] |
| APP-RT-05 | Placeholder routes render the Placeholder panel | [I] |

## TC-WORKERS

| ID | Case | Status |
| --- | --- | --- |
| WK-SEED-01 | Seed worker writes 50k+200k+500k records and sets `meta.seeded` | [D] *(Requires running a real worker in jsdom — covered by manual smoke test on `npm run dev`.)* |
| WK-TICK-01 | Tick worker emits a `tick` message every 2–5s | [D] *(Time-sensitive; live store contract tested directly.)* |

## TC-PWA / OFFLINE

| ID | Case | Status |
| --- | --- | --- |
| PWA-01 | `npm run build` produces a service worker and manifest | [M] |
| PWA-02 | Bundle works offline after first load | [M] |

---

## Coverage targets

Phase 1 minimums:

| Area | Lines | Notes |
| --- | --- | --- |
| `lib/` | ≥ 95% | Pure logic, unit-tested exhaustively |
| `stores/` | ≥ 90% | Zustand stores, direct state assertions |
| `components/primitives/` | ≥ 80% | Render + interaction |
| `features/` | ≥ 60% | Smoke + key workflows |
| `workers/`, `db/schema` | — | Excluded from coverage; behavior tested through hooks |

Run `npm run test:coverage` for the live report.
