# Architecture

## Tech stack

- **Next.js 16** with App Router (TypeScript) — routing, server-side rendering, API routes
- **Supabase** — hosted PostgreSQL database + built-in Realtime (WebSockets for live updates)
- **Tailwind CSS 3.4** — responsive styling
- **Vercel** — deployment (free tier, no server to manage)

The Supabase Realtime feature automatically broadcasts database changes to all connected clients, which removes the need for a custom WebSocket or Server-Sent Events server.

## File structure

```
src/
├── app/
│   ├── layout.tsx                     # Root HTML shell
│   ├── page.tsx                       # Landing page
│   ├── api/
│   │   ├── tables/route.ts            # POST /api/tables — create table
│   │   ├── tables/[id]/route.ts       # DELETE /api/tables/[id] — admin only
│   │   ├── admin/login/route.ts       # POST /api/admin/login
│   │   └── admin/logout/route.ts      # POST /api/admin/logout
│   ├── admin/
│   │   ├── page.tsx                   # Admin dashboard
│   │   └── login/page.tsx             # Admin login form
│   └── table/[id]/
│       ├── page.tsx                   # Table view — fetches initial data server-side
│       └── not-found.tsx              # Shown for unknown table IDs
├── components/
│   ├── CreateTableButton.tsx          # Client button: calls POST, then navigates
│   ├── TableGrid.tsx                  # Client component: owns grid state + Realtime subscription
│   └── Cell.tsx                       # Single cell: click to edit, blur/Enter to save
├── lib/
│   ├── supabase.ts                    # Browser Supabase client + shared types
│   └── supabaseAdmin.ts              # Server-only admin client (service role key)
└── middleware.ts                      # Protects /admin/* routes
```

## Database schema

Two tables: `tables` (one row per shared table, stores id and title) and `cells` (one row per non-empty cell). Only non-empty cells are stored (sparse) — empty cells are inferred by their absence. Full SQL is in the setup section below.

## How real-time sync works

1. User edits a cell and clicks away (or presses Enter).
2. `Cell.tsx` calls `onSave` in `TableGrid.tsx`.
3. `TableGrid.tsx` optimistically updates local state and upserts the cell in Supabase.
4. Supabase detects the database change and broadcasts it via WebSocket to all other clients subscribed to that table's channel.
5. Each client's `useEffect` in `TableGrid.tsx` receives the event and updates its local grid state.

## Grid auto-expansion

There are no "add row" or "add column" buttons. The grid grows automatically:

```ts
const displayRows = Math.max(5, maxUsedRow + 3);
const displayCols = Math.max(8, maxUsedCol + 3);
```

There are always 2–3 empty rows/cols beyond the last filled cell, so users can always type further by clicking the empty edge cells.

## Supabase setup required (one-time)

After creating a Supabase project, run the following SQL in the SQL Editor. It is idempotent — safe to re-run if something fails partway through.

```sql
-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cells (
    table_id   UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    row        INTEGER NOT NULL,
    col        INTEGER NOT NULL,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (table_id, row, col)
);

-- Row Level Security
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;

-- Policies (drop first so re-running is safe)
DROP POLICY IF EXISTS "anon read tables"   ON tables;
DROP POLICY IF EXISTS "anon create table"  ON tables;
DROP POLICY IF EXISTS "anon update tables" ON tables;
DROP POLICY IF EXISTS "anon read cells"    ON cells;
DROP POLICY IF EXISTS "anon write cells"   ON cells;
DROP POLICY IF EXISTS "anon update cells"  ON cells;

CREATE POLICY "anon read tables"   ON tables FOR SELECT USING (true);
CREATE POLICY "anon create table"  ON tables FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update tables" ON tables FOR UPDATE USING (true);
CREATE POLICY "anon read cells"    ON cells  FOR SELECT USING (true);
CREATE POLICY "anon write cells"   ON cells  FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update cells"  ON cells  FOR UPDATE USING (true);
```

**Realtime** — run this in the SQL Editor (the Supabase dashboard UI for this has changed and is no longer straightforward):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tables, cells;
```

**Credentials** — go to **Project Settings → API Keys**. Copy the Project URL from **Project Settings → Data API** and the **Publishable key** (starts with `sb_publishable_...`) from the API Keys page. Add them to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Admin console

The admin console (`/admin`) is protected by middleware that checks a SHA-256 hashed password stored in an HTTP-only `admin_session` cookie (7-day expiry). If `ADMIN_PASSWORD` is not set in the environment, `/admin` is open to anyone.

Admin capabilities:
- List all tables (name, dimensions, creation date)
- Create a new table (redirects to the table view)
- Delete a table (cascades to all its cells)

Two separate Supabase clients are used:
- **`supabase.ts`** — anon key, safe for the browser (`NEXT_PUBLIC_` prefix)
- **`supabaseAdmin.ts`** — service role key, server-only (bypasses RLS). Never import in client components.

## Notable implementation details

| Topic | Detail |
|---|---|
| iOS Safari zoom | All `<input>` elements use `text-base` (16px). Smaller font sizes trigger automatic viewport zoom on iOS. |
| Realtime echo suppression | When this client saves a cell, it adds the cell key to `savingRef`. Incoming Realtime events for keys in that set are ignored to avoid a flicker where the cell briefly resets to the old value. |
| Anon key safety | The Supabase anon key is exposed in the browser (prefix `NEXT_PUBLIC_`). This is safe because Row Level Security policies on the database enforce what anonymous users can actually do. |
| Server-side initial load | `app/table/[id]/page.tsx` is a server component that fetches cells before sending HTML, so users see data immediately without a loading state. |
