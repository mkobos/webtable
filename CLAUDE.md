# Web Table — Claude Code Guide

## Project Overview

Real-time collaborative spreadsheet app. Anonymous users create tables via unique URLs, edit cells, and see each other's changes instantly. No login, no formulas.

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm start        # Run production build
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_PASSWORD=your-secret-password
```

`ADMIN_PASSWORD` is optional — if omitted, `/admin` is publicly accessible.

## File Structure

```
src/
├── app/
│   ├── layout.tsx                   # Root HTML shell
│   ├── page.tsx                     # Landing page
│   ├── api/
│   │   ├── tables/route.ts          # POST /api/tables — create table
│   │   ├── tables/[id]/route.ts     # DELETE /api/tables/[id] — admin only
│   │   ├── admin/login/route.ts     # POST /api/admin/login
│   │   └── admin/logout/route.ts    # POST /api/admin/logout
│   ├── admin/
│   │   ├── page.tsx                 # Admin dashboard (list/create/delete tables)
│   │   └── login/page.tsx           # Admin login form
│   └── table/[id]/
│       ├── page.tsx                 # Table view — SSR initial data fetch
│       └── not-found.tsx            # 404 for unknown table IDs
├── components/
│   ├── TableGrid.tsx                # Grid state, Realtime subscription, title edit
│   ├── Cell.tsx                     # Single cell edit (click, keyboard nav, save)
│   └── CreateTableButton.tsx        # Landing page "Create" button
├── lib/
│   ├── supabase.ts                  # Browser Supabase client + shared types
│   └── supabaseAdmin.ts             # Server-only admin client (service role key)
└── middleware.ts                    # Protects /admin/* routes via SHA-256 cookie
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript) — routing, SSR, API routes
- **Supabase** — PostgreSQL + built-in Realtime (WebSockets)
- **Tailwind CSS 3.4** — styling
- **Vercel** — deployment target

## Key Architectural Decisions

### Sparse cell storage
Only non-empty cells are stored in the `cells` table. Empty cells are inferred by absence. Grid dimensions are computed at runtime from the max row/col values.

### Auto-expanding grid
```ts
const displayRows = Math.max(5, maxUsedRow + 3);
const displayCols = Math.max(8, maxUsedCol + 3);
```
No "add row/col" buttons — always 2–3 empty cells beyond the last filled one.

### Realtime echo suppression
When a client saves a cell, it adds the key to `savingRef`. Incoming Realtime events for keys in that set are ignored to prevent flicker.

### SSR initial load
`app/table/[id]/page.tsx` is a server component — data fetched before HTML is sent. No loading spinner on first render.

### Admin auth
Middleware (`src/middleware.ts`) checks `admin_session` cookie against SHA-256 hash of `ADMIN_PASSWORD`. No external auth library.

### Two Supabase clients
- `src/lib/supabase.ts` — anon key, safe for browser (exposed via `NEXT_PUBLIC_`)
- `src/lib/supabaseAdmin.ts` — service role key, server-only (bypasses RLS)

## Database Schema

```sql
CREATE TABLE tables (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE cells (
    table_id   UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    row        INTEGER NOT NULL,
    col        INTEGER NOT NULL,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (table_id, row, col)
);
```

Full setup SQL (including RLS policies and Realtime) is in `ARCHITECTURE.md`.

## Keyboard Navigation in Cells

- **Tab** → save + move right
- **Enter** → save + move down
- **Escape** → cancel, restore original value

## Admin Console

- URL: `/admin` (redirects to `/admin/login` if password set)
- Features: list all tables with dimensions, create new table, delete table (cascades to cells)
- Table creation from the public landing page is disabled — only via admin console

## Common Gotchas

- **iOS Safari zoom**: All inputs use `text-base` (16px min). Don't use smaller font sizes on inputs or iOS will auto-zoom the viewport.
- **Anon key in browser**: Safe — RLS policies enforce what anonymous users can do.
- **No tests**: No test suite exists yet.
- **`supabaseAdmin` is server-only**: Never import `src/lib/supabaseAdmin.ts` in client components or `NEXT_PUBLIC_` contexts.
