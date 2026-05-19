# ATLANTIS — Documentation

Two living documents live in this folder:

| File | Purpose |
| --- | --- |
| `USER_MANUAL.html` | End-user manual covering every screen, role, and workflow. Updated each phase. |
| `ARCHITECTURE.html` | System architecture: layers, data flow, worker topology, Dexie schema, RBAC, offline strategy. |

Both use embedded SVG diagrams (no image dependencies) and print-optimized CSS so the
on-screen view and the PDF export are visually identical.

## Generating the PDFs

### Option A — Browser (recommended, zero deps)

1. Open the HTML file in Chrome / Edge / Firefox.
2. `Ctrl+P` (or `⌘+P`).
3. Destination → **Save as PDF**.
4. Settings:
   - **Layout**: Portrait
   - **Paper size**: A4
   - **Margins**: Default
   - **Background graphics**: **ON** (critical — keeps the dark theme + diagrams)
5. Save into this folder as `USER_MANUAL.pdf` / `ARCHITECTURE.pdf`.

The HTML uses `@page` and `page-break-*` rules, so chapter breaks and headers/footers
render correctly.

### Option B — Headless one-shot (Puppeteer)

If you'd rather automate regeneration after every doc edit, install Puppeteer once:

```bash
npm i -D puppeteer
```

then run:

```bash
node docs/build-pdfs.mjs
```

The script renders both HTML files headlessly and writes the PDFs next to them.

## Updating the docs

When a feature lands:

1. Edit the relevant HTML file (search for the section name — they're heavily commented).
2. Bump the version badge in the cover page.
3. Re-export per Option A or B.

Diagrams are inline SVG — no Figma round-trip needed. Each diagram is annotated with
`<!-- DIAGRAM: name -->` so it's easy to find.
