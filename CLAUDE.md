# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build (also type-checks)
npm run lint     # ESLint
npx tsc --noEmit # Type-check without building
```

There are no automated tests. Type-check with `npx tsc --noEmit` before committing.

## Required Environment Variables

```
ANTHROPIC_API_KEY          # Required for file upload and AI chat
GOOGLE_CLIENT_ID           # Optional: Google Drive OAuth
GOOGLE_CLIENT_SECRET       # Optional: Google Drive OAuth
MICROSOFT_CLIENT_ID        # Optional: OneDrive OAuth
MICROSOFT_CLIENT_SECRET    # Optional: OneDrive OAuth
NEXTAUTH_URL               # Required for OAuth redirects (e.g. https://your-domain.vercel.app)
```

`ANTHROPIC_API_KEY` is the only key required for core functionality. Without it, file uploads fail with a 503.

## Architecture

### Data flow

1. **File upload** → `POST /api/upload` → `lib/parsers/index.ts` extracts raw text → `lib/projectAnalyzer.ts` sends text to Claude (`claude-sonnet-4-6`) → returns `Project[]` JSON
2. **Parsed projects** are stored in React state (`app/page.tsx`) — there is no database or persistent storage
3. **Cloud import** (Google Drive) → `DriveFileBrowser` fetches file list via `/api/connect/googledrive/files`, downloads via `/api/connect/googledrive/download`, then POSTs to `/api/upload` — same pipeline as manual upload
4. **AI Chat** → `POST /api/chat` sends project state + conversation history to Claude

### State management (`app/page.tsx`)

All application state lives in a single page component:
- `projects: Project[]` — canonical list of all loaded projects (never mutated, only replaced)
- `selectedProjectIds: Set<string>` — which projects are "visible" (toggled per loaded file)
- `filters: ProjectFilters` — farol/phase/knowledge-area/date filters
- `displayProjects` — **single source of truth** derived from the above; passed to every chart and KPI component. All child components must use `displayProjects`, not `projects`.

### `lib/types.ts` — core data model

`Project` is the central interface. Key EVM fields:
- `ev`, `pv`, `ac` — Earned Value, Planned Value, Actual Cost (absolute R$ values)
- `bac` — Budget at Completion (original total budget)
- `monthlyData?: MonthlyDataPoint[]` — time-series for S-Curve charts (accumulated PV/EV/AC per month)
- `risks?: Risk[]` — PMBOK 5×5 risks with `probability` (1-5), `impact` (1-5), `score = prob × impact`
- `scope?: ProjectScope` — deliverables counts, approved changes, scope creep %

### `lib/parsers/index.ts`

Runs server-side only. Routes by file extension/MIME type to format-specific extractors. Supported: CSV, Excel (xlsx/xls/xlsm), PDF, DOCX, PPTX, XML/XER/P6XML, PNG/JPG/WebP (via Claude Vision), VSDX, RTF, MSG, DXF, IFC, CAD/BIM metadata, MPP metadata, and plain text fallback. All parsers return a plain string passed to Claude.

### `lib/projectAnalyzer.ts`

Two exported functions, server-side only:
- `extractProjectsFromText(rawText, fileName)` — calls Claude to parse raw text into `Project[]`. The system prompt defines the full JSON schema Claude must produce, including `risks[]`, `scope`, `monthlyData`, `bac`.
- `chatWithProjects(message, projects, history)` — conversational AI with project context injected into the system prompt.

### `lib/formatCurrency.ts`

Global currency formatter — always use this instead of inline formatting:
```
≥ 1B  → R$ 1,2Bi
≥ 1M  → R$ 8,5Mi
≥ 1K  → R$ 850K
< 1K  → R$ 850
```

### Charts (`components/charts/`)

All charts are dynamically imported with `{ ssr: false }` in `app/page.tsx` to avoid SSR issues with Recharts.

- **`SCurveCusto`** — PMBOK 3-line cost S-curve: PV (dashed white), EV (green `#00B050`), AC (red `#D5001C`). Uses `project.monthlyData` if available; falls back to `costCurve`; shows a static "unavailable" message if neither exists. Also used as a mini chart inside `ProjectDetail`.
- **`SCurvePrazo`** — Progress % S-curve (PV% vs EV%). Uses `scheduleCurve` or `monthlyData`; falls back to a synthetic sigmoid.
- **`RiskMatrix`** — Scatter chart plotting projects by `riskProbability`/`riskImpact`.

### KPI Cards with drill-down (`components/KPICards.tsx`)

Each card is clickable and opens a `position: fixed` drawer (580px wide). Three drawer types:
- **SPI drawer** — per-project SPI with horizontal bars and schedule delay in days
- **CPI drawer** — per-project CPI/EV/AC/desvio table
- **Risk drawer** — custom PMBOK 5×5 SVG heat-map grid + risk table sorted by score descending

Risk index (0–10) is a weighted average of per-project average risk scores, weighted by CAPEX (`bac` or `budget.planned`). Score categories: Low(1-5), Medium(6-14), High(15-20), Critical(21-25).

### OAuth / Cloud connectors (`app/api/connect/`)

OAuth flow uses a browser popup + `window.postMessage` to avoid full-page redirects. Access tokens are stored in HTTP-only cookies (`gdrive_token`, `onedrive_token`). Callback routes set the cookie and post a message to the opener.

### `next.config.ts`

`serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx']` — these packages must not be bundled; they require native/CJS resolution at runtime. Add any new server-side file-parsing library here.

## Key conventions

- **All styling is inline CSS** — no Tailwind classes in component files (Tailwind is installed but unused). Dark theme: backgrounds `#0A0A0A`/`#111111`, primary accent `#D5001C` (red).
- **`'use client'`** on every component file; only API routes and `lib/` files run server-side.
- **Path alias `@/`** maps to the repo root (not `src/`).
- When a data field is absent, render a grey chip "Não disponível" — never leave a field blank or throw.
