# Web Table

[![Test](https://github.com/mkobos/webtable/actions/workflows/test.yml/badge.svg)](https://github.com/mkobos/webtable/actions/workflows/test.yml)

A real-time collaborative spreadsheet app. Create a table, share the URL, and edit cells together — no login required.

## Features

- **Instant sharing** — every table gets a unique URL
- **Real-time collaboration** — changes appear immediately for all viewers
- **No account required** — fully anonymous
- **Auto-expanding grid** — the table grows as you type
- **Responsive** — works on desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the schema from `ARCHITECTURE.md`

### Setup

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and service role key
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server-only) |
| `ADMIN_PASSWORD` | Password for `/admin` (optional — omit to leave it open) |

## Testing

No Supabase credentials are needed to run tests.

```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # Single run with coverage report
```

The test suite covers pure utility functions, the `Cell` component, all four API routes, and the admin auth middleware (~40 tests).

## Admin Console

Visit `/admin` to list, create, and delete tables. If `ADMIN_PASSWORD` is set, you'll be prompted to log in first.

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, SSR, API routes
- [Supabase](https://supabase.com) — PostgreSQL + Realtime
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com) — deployment target
