# Deployment checklist — CSSA Cricket Fiesta '26

Target: **Vercel** (Next.js host) + **Supabase** (Postgres + Auth). Everything
below assumes the repo is on GitHub.

## 0. Before you deploy

- [ ] `pnpm test` is green (scoring engine — 77 cases).
- [ ] `pnpm build` succeeds locally.
- [ ] Decide the Supabase **region** — for a Sri Lanka tournament use Mumbai
      (`ap-south-1`); set the Vercel function region to match (Project →
      Settings → Functions → Region → Mumbai `bom1`).

## 1. Supabase (production project)

- [ ] Create the project in the chosen region.
- [ ] Copy the **pooled** connection string (port 6543) → `DATABASE_URL`, append
      `?pgbouncer=true&connection_limit=10&pool_timeout=20`.
- [ ] Copy the **session** pooler string (port 5432) → `DIRECT_URL`.
- [ ] Copy URL + publishable key + secret key from Project Settings → API Keys.
- [ ] Apply the schema: `DATABASE_URL=… DIRECT_URL=… pnpm db:deploy`.

## 2. Vercel

- [ ] Import the GitHub repo (framework auto-detected as Next.js).
- [ ] Add environment variables (Production + Preview):
  - `DATABASE_URL`, `DIRECT_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY` — **uncheck "expose to browser"**
  - `NEXT_PUBLIC_SITE_URL` = your production URL
- [ ] Build command: default `pnpm build` (runs `prisma generate && next build`;
      `postinstall` also runs `prisma generate` so the client is always fresh).
- [ ] Deploy.

## 3. First-run data

- [ ] Bootstrap a super-admin:
      `pnpm admin:create admin@cssa.lk 'StrongPass1' 'Tournament Admin' SUPER_ADMIN`
      (run locally with the **production** `DATABASE_URL` + `SUPABASE_SECRET_KEY`
      in your shell, or from a one-off Vercel/CI job).
- [ ] Optionally `pnpm db:seed` for demo data (skip for a real tournament).
- [ ] Sign in at `/admin`, create teams → players → a match → set toss + XIs →
      publish → start → score.

## 4. Post-deploy smoke test

- [ ] `/` renders the hero (or the empty state if no matches yet).
- [ ] `/admin` redirects to `/admin/login` when signed out.
- [ ] Sign in; the dashboard loads with your name + role.
- [ ] Open the scoring console on a live match, record a ball, confirm the
      public `/api/matches/<id>/live` version increments.
- [ ] The home hero updates without a manual refresh (SSE).

## Security checklist

- [ ] `SUPABASE_SECRET_KEY` is server-only and **never** in client code or git.
- [ ] `.env` is gitignored; only `.env.example` (placeholders) is committed.
- [ ] Rotate any dev credentials that were shared during development.
- [ ] Every admin mutation re-checks the role server-side (built in) and writes
      an `AuditLog` row — review `/admin/audit` after go-live.

## Notes & known follow-ups

- **Logo / photo / ad uploads** currently take an image **URL** (host on
  Supabase Storage or any CDN). Wiring direct file upload to a Supabase Storage
  bucket is a clean future addition; `next.config.ts` already allows
  `*.supabase.co` images.
- **SSE** runs in a ~25s server window and the browser auto-reconnects; a 15s
  polling fallback covers any gap. On Vercel Hobby, long function durations are
  capped — the polling fallback keeps the site live regardless.
- The Edge-runtime build warning from `@supabase/ssr` in middleware is benign
  (the middleware works); it can be silenced later by pinning the middleware to
  the Node runtime.
