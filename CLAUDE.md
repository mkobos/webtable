# Web Table — Claude Code Guide

## Project Overview

Real-time collaborative spreadsheet app. Anonymous users create tables via unique URLs, edit cells, and see each other's changes instantly. No login, no formulas.

## Commands

```bash
npm run dev           # Dev server at localhost:3000
npm run build         # Production build
npm start             # Run production build
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

Environment setup: see README.md. Database schema and full setup SQL: see DEVELOPMENT.md.

## File Structure

```
src/
├── app/
│   ├── layout.tsx                   # Root HTML shell
│   ├── page.tsx                     # Landing page
│   ├── error.tsx                    # Global error boundary
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
│       ├── error.tsx                # Table-specific error boundary
│       └── not-found.tsx            # 404 for unknown table IDs
├── components/
│   ├── TableGrid.tsx                # Grid state, Realtime subscription, title edit
│   └── Cell.tsx                     # Single cell edit (click, keyboard nav, save)
├── lib/
│   ├── supabase.ts                  # Browser Supabase client + shared types
│   ├── supabaseAdmin.ts             # Server-only admin client (service role key)
│   ├── gridUtils.ts                 # Shared table dimension + sort utilities
│   └── utils.ts                     # SHA-256 helper
└── proxy.ts                         # Protects /admin/* routes via SHA-256 cookie
```

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
When a client saves a cell, it adds the key to `savingRef`. Incoming Realtime events for keys in that set are ignored to prevent flicker. Keys are removed after a 2-second delay to cover late-arriving echoes.

### SSR initial load
`app/table/[id]/page.tsx` is a server component — data fetched before HTML is sent. No loading spinner on first render.

### Admin auth
Proxy (`src/proxy.ts`) checks `admin_session` cookie against SHA-256 hash of `ADMIN_PASSWORD`. No external auth library. Table creation is admin-only. Admin-only API routes (e.g., DELETE `/api/tables/[id]`) also verify the cookie directly.

### Two Supabase clients
- `src/lib/supabase.ts` — anon key, safe for browser (exposed via `NEXT_PUBLIC_`)
- `src/lib/supabaseAdmin.ts` — service role key, server-only (bypasses RLS)

## Keyboard Navigation in Cells

- **Tab** → save + move right
- **Enter** → save + move down
- **Escape** → cancel, restore original value

## Common Gotchas

- **iOS Safari zoom**: All inputs use `text-base` (16px min). Don't use smaller font sizes on inputs or iOS will auto-zoom the viewport.
- **Anon key in browser**: Safe — RLS policies enforce what anonymous users can do.
- **Tests**: Vitest + jsdom. No Supabase credentials needed. Run with `npm run test:run`.
- **`supabaseAdmin` is server-only**: Never import `src/lib/supabaseAdmin.ts` in client components or `NEXT_PUBLIC_` contexts.
