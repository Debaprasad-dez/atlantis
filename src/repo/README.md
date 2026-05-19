# Repository layer

Single boundary between UI/hooks and persistence. Every screen and hook should call
into a repo (`entitiesRepo`, `eventsRepo`, …) rather than touching Dexie or `fetch`
directly.

## Why

ATLANTIS is offline-first today (Dexie/IndexedDB), but a backend will eventually
own canonical data. When that happens we want the swap to be a **one-file change
per resource**, not a cross-repo grep.

## Contract

Each repo exports plain async functions returning plain data. Internally they:

1. Check `apiEnabled()` from `src/lib/api.js`.
2. If true: call the API, fall back to local cache (Dexie) on network failure.
3. If false (current state): operate against Dexie directly.

Write functions also append to the local cache so reads stay consistent across
the dexie ↔ network gap.

## Adding a new resource

1. Add a Dexie store in `src/db/schema.js` (bump version).
2. Create `src/repo/<resource>.js` with `list / get / put / remove` exports.
3. Document the eventual API path in a comment at the top.
4. Use the repo from hooks; never import `db` directly from feature code.

## Migration plan from current direct-Dexie code

The Phase 1/2 hooks still call `db` directly (`useEntities`, `useDexie`, etc.).
Migrate one at a time when touching them — no big-bang refactor required.
