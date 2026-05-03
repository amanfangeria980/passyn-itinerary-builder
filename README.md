# Passyn Travels — Itinerary Builder

Internal Next.js app for **Passyn Travels** (Aniket Arora). Agents paste raw trip details + attach images, the system produces a polished day-wise itinerary, and the result can be exported as PDF/DOCX or shared via a public link.

> Phase 1 of 6 is what's in this repo right now: DB + rolled-own auth + R2 uploads + composer that saves raw text and images. The LLM parser, image matching, Tiptap editor, exports, and share links land in later phases.

## Stack

- Next.js 15 (App Router, TS, Server Actions)
- Tailwind CSS + small set of shadcn-style primitives
- Postgres via Drizzle ORM (Neon HTTP driver)
- Cloudflare R2 for image storage
- `bcryptjs` + `jose` for hand-rolled email/password auth (no NextAuth, no Clerk)
- `sharp` for EXIF stripping, webp conversion, and thumbnail generation

## Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# fill in DATABASE_URL, AUTH_SECRET (>=32 chars), and R2_* keys
# tip: openssl rand -base64 48  → AUTH_SECRET

# 3. Create tables
npm run db:generate   # generates SQL migrations under ./drizzle
npm run db:migrate    # applies them to the database in DATABASE_URL
# (or, faster for dev:  npm run db:push)

# 4. Seed users
cp users.example.json users.json
# edit users.json — set real emails and strong passwords
npm run seed:users -- ./users.json

# 5. Run
npm run dev
```

Open http://localhost:3000. You should be redirected to `/login`. Sign in with one of the seeded users → land on `/dashboard`.

## Auth

- Email + password against the `users` table (closed list, no public signup).
- Passwords hashed with bcrypt (cost 12).
- Session is a 32-byte random token; its sha256 hash is stored in `sessions.token_hash`. The raw token is wrapped in a `jose` HS256 JWT and set as the `sid` cookie (httpOnly, sameSite=lax, secure in prod, 30-day expiry).
- Multiple concurrent sessions per user are allowed.
- `middleware.ts` does an Edge-safe cookie shape check on `/dashboard/*`, `/itinerary/*`, and `/api/itinerary/*`. The full DB session lookup happens server-side via `getCurrentUser()` inside the protected route.
- Login endpoint is rate-limited: 10 attempts per 15 min per IP. After 5 consecutive failed passwords on one email, that account is locked for 15 min.

### Reset a password

```bash
npm run reset:password -- agent1@passyn.org new-strong-password
```

### Add or update users

Edit `users.json`, then re-run `npm run seed:users -- ./users.json`. Existing users (matched by email) are updated in place — passwords are re-hashed every time.

## What's in Phase 1

| Path | What it does |
| --- | --- |
| `/login` | Branded sign-in screen. Two-panel layout, Passyn green/white. |
| `/dashboard` | Lists every itinerary (all agents see all). Sortable by `updated_at`. |
| `/itinerary/new` | ChatGPT-style composer: textarea + multi-image dropzone + client meta. Save button creates the row and uploads each image to R2. |
| `/itinerary/[id]` | Static read-only view of the saved row + its attachments. Phase 2 will replace the "Raw notes" block with a parsed itinerary; Phase 4 will swap to a Tiptap editor. |
| `POST /api/auth/login` / `logout` | Session create / destroy. |
| `POST /api/itinerary/create` | Insert itinerary row. |
| `POST /api/itinerary/[id]/upload` | Multipart image upload → sharp → R2 → assets row. Caps: 10 MB/image, 20/itinerary, jpg/png/webp/heic only. |

## Branding

Hard-coded in [`lib/branding.ts`](lib/branding.ts) (agency name, contact, phone, email, currency, locale, timezone, logo path). Used by every screen, and will be used by the Phase 5 PDF/DOCX exports.

Logo file lives at `public/branding/logo.svg` (replace with the real Passyn PNG/SVG when supplied — the path also lives in `BRANDING.logoPath`).

## Phasing

1. **Phase 1 (this commit):** DB + auth + R2 + composer that saves raw text + uploads. ✅
2. **Phase 2:** NVIDIA NIM parser → JSON, Zod-validated, render to a static preview.
3. **Phase 3:** Pexels/Unsplash image matching + cache + manual override.
4. **Phase 4:** Tiptap editor + autosave.
5. **Phase 5:** PDF + DOCX exports with full Passyn branding.
6. **Phase 6:** Public share links + audit log UI + polish.

## File layout

```
app/
  (authenticated)/             # gated by getCurrentUser() in layout
    dashboard/page.tsx
    itinerary/new/page.tsx + composer.tsx
    itinerary/[id]/page.tsx
  api/
    auth/{login,logout}/route.ts
    itinerary/create/route.ts
    itinerary/[id]/upload/route.ts
  login/page.tsx + login-form.tsx
  layout.tsx, page.tsx, globals.css
components/
  app-header.tsx, logout-button.tsx, ui/*
lib/
  branding.ts, format.ts, utils.ts
  auth/{session,password,rate-limit}.ts
  db/{index,schema}.ts
  images.ts, r2.ts
middleware.ts
scripts/
  migrate.ts, seed-users.ts, reset-password.ts
public/branding/logo.svg
```

## Banned dependencies

Per the spec: NextAuth, Auth.js, Clerk, Lucia, any auth-as-a-service. Keep this allowlist tight — every new package needs a reason.
