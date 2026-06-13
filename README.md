# CSSA Cricket Fiesta '26

Public live-score website **plus** an admin scoring & management console for the
CSSA Cricket Fiesta '26 tournament — University of Kelaniya.

- **Public site** (read-only, no login): live match hero, match cards, full
  scorecards, leaderboards, player profiles, popular players.
- **Admin console** (role-gated): dashboard, teams/players/matches/venues CRUD,
  a one-tap **live scoring console**, popular votes, sponsors & ads, leaderboard
  rebuild, audit logs, admin users, settings.

The scoring engine is the heart of the project: every innings is a deterministic
replay of an ordered delivery stream, so undo/edit never patch aggregates in
place. The public site reads a single denormalized `ScoreSnapshot` row per match,
updated inside every mutation's transaction and pushed live over SSE (with a
polling fallback).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma · **Supabase**
(Postgres + Auth) · Zod · Vitest. Package manager: **pnpm**.

## Local setup

```bash
pnpm install                      # also runs `prisma generate` (postinstall)

cp .env.example .env              # then fill in the values (see below)

pnpm db:migrate                   # apply migrations to your Supabase Postgres
pnpm db:seed                      # sample tournament: 4 teams, 48 players, 4 matches
pnpm admin:create you@email.com 'StrongPass1' 'Your Name' SUPER_ADMIN

pnpm dev                          # http://localhost:3000  (admin at /admin)
pnpm test                         # scoring-engine unit tests (must stay green)
```

### Environment variables (`.env`)

| Var | Where to find it | Notes |
|-----|------------------|-------|
| `DATABASE_URL` | Supabase → Connect → ORMs → Prisma (pooled, port 6543) | keep `?pgbouncer=true&connection_limit=10&pool_timeout=20` |
| `DIRECT_URL` | same panel (session pooler, port 5432) | migrations only |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | safe for the client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys | `sb_publishable_…`, client-safe |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret | `sb_secret_…` — **server only, never commit** |
| `NEXT_PUBLIC_SITE_URL` | your deployed URL | used for absolute links |

> If the DB password contains `@ # ! : /` etc., URL-encode it inside the
> connection strings (`#`→`%23`, `@`→`%40`, `!`→`%21`).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` / `pnpm build` / `pnpm start` | dev server / production build / serve |
| `pnpm test` | scoring-engine unit tests (77 cases) |
| `pnpm db:migrate` | create + apply a migration (dev) |
| `pnpm db:deploy` | apply existing migrations (CI/prod) |
| `pnpm db:seed` | seed sample tournament data |
| `pnpm db:studio` | Prisma Studio |
| `pnpm admin:create <email> <pass> "<name>" [ROLE]` | bootstrap an admin |

## Deploy (Vercel + Supabase)

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the full checklist. In short:

1. Push to GitHub, import the repo in Vercel.
2. Add all six env vars (mark `SUPABASE_SECRET_KEY` as **not** exposed to the
   browser). Build command is the default `pnpm build` (runs `prisma generate`).
3. Run `pnpm db:deploy` against the production database (or let the first deploy
   apply migrations from CI).
4. Bootstrap a SUPER_ADMIN with `pnpm admin:create`.

**Region:** the tournament is in Sri Lanka, so put the Supabase project (and the
Vercel function region) in **Mumbai `ap-south-1`** for the lowest scoring
latency. The current sample project is in Sydney `ap-southeast-2` — fine for
testing, but every query is a longer round-trip from South Asia.

## Roles

- **SUPER_ADMIN** — everything, incl. admin users + settings.
- **ADMIN (Editor)** — master data + matches + sponsors + scoring.
- **SCORE_UPDATER (Scorer)** — live scoring only.

Authorization is re-checked **server-side on every mutation** — the UI is never
trusted. Public pages have no session and are strictly read-only.
