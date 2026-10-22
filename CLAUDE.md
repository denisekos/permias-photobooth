# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser photobooth for the Permias NYC "Sebelum Uber Menjemput" Halloween party (November 1, 2026). It runs full screen on a laptop, takes 3 photos, composites them into a 1200 × 3600 strip in the browser, "prints" it with an animation, and shows a QR code that opens a phone download page. Strips are deleted after 48 hours. Next.js 15 (App Router), React 19, TypeScript. Deployed on Vercel with an S3-compatible bucket (Cloudflare R2).

## Commands

```bash
npm run dev          # regenerates scenery markup, then next dev
npm run build        # prebuild regenerates scenery markup, then next build
npm start            # serve the production build
npm run typecheck    # tsc --noEmit
npm run gen:scenery  # rebuild src/lib/server/scenery-html.ts by hand
```

There is no linter config and no test suite in the repo. Verify changes with `npm run typecheck` and `npm run build`, then drive the app in Chromium. A fake webcam works: `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`. The camera only works on `localhost` or HTTPS.

## Architecture

**One client component runs the booth.** `src/components/Booth.tsx` is a state machine over screens: `attract → waking → frame → capture → review → print`, plus `denied` when camera access is refused. Async flows (countdown and capture, upload retries) take a `session` token and stop by throwing `Cancelled` once `resetSession()` bumps it. Read `resetSession` before adding state: every reset must stop camera tracks, revoke object URLs and zero canvases (`width = 0`), because the kiosk has to run 200+ sessions without leaking memory. Timers on screens: review prints automatically after 30 s idle; the final screen returns to the cover after 60 s idle, but only once the upload has succeeded or failed (it waits while still retrying).

**Images are made in the browser, not on the server.**
- `src/lib/booth/photo.ts`: grabs a frame, center-crops it to 4:3, keeps it unmirrored (the preview is mirrored with CSS only), and applies the dark-room brightness gain. Natural colour; there are no filters.
- `src/lib/booth/compose.ts`: draws the strip as a length of 35mm film (sprocket rails, edge numbers, a paper title card, the three photos, a details card, and a few pieces of artwork on the rails) and the 1080 × 1920 story image. Exports `PHOTO_RECTS`, which the print animation uses to position the "develop" overlays. Colours come from the party palette constants at the top. The strip is encoded as PNG, or JPEG 0.9 if the PNG is over 2.5 MB; the story is always JPEG. Strip plus story must stay under Vercel's 4.5 MB request body limit. Canvas text needs the web fonts loaded first (`preloadAssets`).

**Upload and expiry (server).** All handlers use the Node runtime.
- `POST /api/strips` (`src/app/api/strips/route.ts`): multipart `strip` plus optional `story`. Checks file types by magic bytes, rate-limits, creates a 21-character nanoid, and sets `expires_at = created_at + 48 h` on the server.
- `GET /s/[id]` (`src/app/s/[id]/route.ts`): a route handler that returns raw HTML, not a React page, so it can answer HTTP 410 for expired or unknown IDs. Markup and CSS live in `src/lib/server/download-page.ts`.
- `GET /api/strips/[id]/image`: checks expiry, then redirects to a 10-minute signed URL. `?dl=1` makes it a download and counts it; `?proxy=1` streams the bytes from this origin, which Web Share needs.
- `GET /api/health`: reports the storage settings and any setup problem (`storageProblem()` in `config.ts`), without secrets. `POST /api/strips` refuses with 503 and `x-booth-fatal: 1` when storage is misconfigured; the booth shows that message instead of retrying.
- `GET /api/cron/cleanup`: deletes expired strips. Requires `Authorization: Bearer $CRON_SECRET`. `vercel.json` runs it daily, the most Vercel Hobby allows. Expiry is still exact because every request checks `expires_at`; the bucket's 2-day lifecycle rule is the backstop.

**Storage has no database.** `src/lib/server/store.ts` selects a `Store` implementation from `STORAGE_DRIVER`:
- `s3-store.ts` (any S3-compatible bucket, e.g. R2): files at `strips/<id>.*` and `stories/<id>.*`, record at `meta/<id>.json`.
- `local-store.ts` (writes to `./.data`): for development only; it doesn't persist on Vercel. Its "signed URLs" are HMAC-signed `/api/files` links (`signing.ts`).

`rate-limit.ts` is in-memory, so on serverless it's per instance and only slows guessing down. Environment variables are listed in `.env.example`; `PUBLIC_BASE_URL` sets the domain the QR codes point to.

**Artwork.** All artwork is still; nothing flies or bobs, and there is no sound. Each booth screen places its own pieces in `Booth.tsx` (the pumpkin start button on home, witch hat on the camera screen, banjo cat and bat on review, ghost and witch on print). `src/components/Collage.tsx` (no hooks) is the phone pages' artwork: route handlers can't import `react-dom/server`, so `scripts/gen-scenery.tsx` renders it to `src/lib/server/scenery-html.ts` (generated, don't edit; it's committed). After changing `Collage.tsx`, run `npm run gen:scenery`; `dev` and `build` also run it. Phone-page CSS is the string in `download-page.ts`.

**Styling.** All booth CSS is in `src/app/globals.css`: a plain dark-brown ground with a faint paper texture and colour tokens on `:root`. Fonts come from the party poster (Metal Mania titles, Oswald labels, letter-spaced Cormorant Garamond caps), with pumpkin-orange titles and labels. Photo frames are 35mm film built from `public/decor/sprocket-*.svg`. Readable content sits in `<Card>` (paper torn by a `clip-path` on `.panel::before`). Artwork has no outlines, only a drop shadow (`.art`). The `.reduced` class (set from `prefers-reduced-motion`) disables the remaining motion (page turn, countdown pop, print feed).

**Assets.** `public/art/` holds the artwork: the surprised pumpkin (the home screen's start button), the ghost, the banjo cat, the witch hat, the witch on a broom and the bat. They are public-domain images supplied by the host, cut out of their backgrounds with their sticker outlines removed, saved as transparent WebP. Keep their sketched, colour-pencil texture; don't add outlines. `public/kit/parchment-texture.png` is the paper grain and `public/decor/sprocket-*.svg` the film rails.

**Host settings.** Party details (event name, presenter, date, day, time, doors, venue, city) live in `localStorage`, edited in a panel opened with Shift+H; defaults are in `src/lib/booth/settings.ts`. Shift+Esc resets a stuck session. Space (or clicking the pumpkin on the home screen) triggers each screen's main action, and R retakes on review (one retake per session).

## Product constraints

These come from the PRD and the party:
- Photos are saved unmirrored, and decorations on the strip must not cover faces; talismans sit on the outer margins.
- There is no QR code on the strip itself; the QR shows only on the print screen.
- Raw individual frames never leave the laptop; only the composite and the story image are uploaded.
- Default target is 1440 × 900 at full screen, and it must still work at 1280 × 800.
- Countdown: 5 seconds per photo, 3 photos, and the screen flashes white as a fill light.
