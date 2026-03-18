# Development

## Tech stack

- **Next.js 16** with App Router (TypeScript) — routing, server-side rendering, API routes
- **Supabase** — hosted PostgreSQL database + built-in Realtime (WebSockets for live updates)
- **Tailwind CSS 3.4** — responsive styling
- **Vercel** — deployment (free tier, no server to manage)

The Supabase Realtime feature automatically broadcasts database changes to all connected clients, which removes the need for a custom WebSocket or Server-Sent Events server.

File structure: see CLAUDE.md.

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

**Server-side aggregate function** — used by the admin dashboard to compute table stats without downloading every cell:
```sql
CREATE OR REPLACE FUNCTION table_stats()
RETURNS TABLE(table_id UUID, max_row INT, max_col INT, last_edit TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT table_id, MAX(row), MAX(col), MAX(updated_at)
  FROM cells
  GROUP BY table_id;
$$;
```

**Realtime** — run this in the SQL Editor (the Supabase dashboard UI for this has changed and is no longer straightforward):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tables, cells;
```

**Credentials**:

Copy the following information

- Project URL from **Project Settings -> Data API**
- Publishable key from **Project Settings -> API Keys** (starts with `sb_publishable_...`)
- Secret key from **Project Settings -> API Keys** (starts with `sb_secret_...`)

to `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

## Admin console

The admin console (`/admin`) is protected by proxy (`src/proxy.ts`) that checks a SHA-256 hashed password stored in an HTTP-only `admin_session` cookie (7-day expiry). If `ADMIN_PASSWORD` is not set in the environment, `/admin` is open to anyone.

Admin capabilities:
- List all tables (name, dimensions, creation date)
- Create a new table (redirects to the table view)
- Delete a table (cascades to all its cells)

## Environments

Two environments are configured: **production** and **development**.

| | Production | Development |
|---|---|---|
| Git branch | `main` | `dev` |
| Supabase project | `webtable-production` | `webtable-development` |
| Vercel environment | Production | Preview |
| URL | Primary Vercel domain | Auto-generated Vercel preview URL (no custom alias) |

### How environment variables are scoped in Vercel

All four variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`) are set twice in **Settings → Environment Variables**: once scoped to **Production** (pointing at `webtable-production`) and once scoped to **Preview** (pointing at `webtable-development`).

> **Gotcha:** Use **Preview**, not **Development**. Vercel's "Development" scope is for local machines only (pulled via `vercel env pull`) — it is never injected into branch or PR deployments. The `dev` branch deploys as a Preview deployment and needs Preview-scoped variables.

> **Important:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are baked into the JS bundle at build time. Never use Vercel's "Promote to Production" dashboard button — it would leave client-side code pointing at the development Supabase project. Always promote by merging `dev → main`, which triggers a fresh production build with the correct env vars.

### Day-to-day workflow

```bash
# Develop a feature
git checkout dev
git checkout -b feature/my-feature
# ... work, open PR targeting dev ...

# Promote to production
git checkout main
git merge dev
git push
```

### GitHub Actions

Tests run automatically on push and pull request for both `main` and `dev` (see `.github/workflows/test.yml`). No Supabase credentials are needed — the test suite uses mocks.

### Initializing the development Supabase project

Run the same setup SQL (tables, RLS policies, Realtime) from the **Supabase setup required** section above in the `webtable-development` SQL Editor.

## Notable implementation details

| Topic | Detail |
|---|---|
| iOS Safari zoom | All `<input>` elements use `text-base` (16px). Smaller font sizes trigger automatic viewport zoom on iOS. |
| Realtime echo suppression | When this client saves a cell, it adds the cell key to `savingRef`. Incoming Realtime events for keys in that set are ignored to avoid a flicker where the cell briefly resets to the old value. |
| Anon key safety | The Supabase anon key is exposed in the browser (prefix `NEXT_PUBLIC_`). This is safe because Row Level Security policies on the database enforce what anonymous users can actually do. |
| Server-side initial load | `app/table/[id]/page.tsx` is a server component that fetches cells before sending HTML, so users see data immediately without a loading state. |
