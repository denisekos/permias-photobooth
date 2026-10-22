# Sebelum Uber Menjemput — storybook photobooth

A laptop photobooth that takes 3 photos, prints them as a storybook strip with a slot-and-drop animation, and hands guests a QR code to download the strip for 48 hours. Built from `PRD_Haunted_Storybook_Photobooth.md` with the original illustration kit in `public/kit/`.

## Look

A vintage photo album with a Halloween edge. The backdrop is a black album page scattered with ephemera: a vintage camera, a record, a cassette, a clock stuck at midnight, red bows, foil stars, a ticket, a matchbox and a disco ball, plus polaroids of the haunted door and of "mr. & mrs. bones", skulls, pumpkins, bats and a witch flying past. Every photo frame is 35mm film. The live preview sits in a film frame, the captured photos fill a short length of film, and the printed strip is a film strip with a title card, the three photos and a details card, stickers on its rails. The QR comes taped into a polaroid. The party poster's red title lettering and details stay. Readable text sits on aged paper clipped over ticking and gingham fabric.

The collage lives in `src/components/Collage.tsx` and the illustrations in `public/decor/`. `npm run gen:scenery` renders the collage for the phone pages and runs before `dev` and `build`.

Poster details (presenter, date, day, time, doors, venue, city) are editable in host settings (Shift+H).

## Run it

```bash
npm install
cp .env.example .env.local   # then edit
npm run dev                  # http://localhost:3000
```

The camera works on `localhost` or HTTPS only. QR codes point to `PUBLIC_BASE_URL`, so on the night the booth must be the **deployed** site. A QR pointing at `localhost` won't open on guests' phones.

## Deploy (Vercel + Cloudflare R2 or S3)

1. Create a **private** bucket. Add a lifecycle rule that deletes objects older than **2 days** (this is the backstop; the app itself enforces 48 hours).
2. Create an access key limited to that bucket.
3. In Vercel, set the env vars from `.env.example` with `STORAGE_DRIVER=s3`, plus the `S3_*` values, `PUBLIC_BASE_URL`, `SIGNING_SECRET` and `CRON_SECRET`.
4. Deploy. `vercel.json` registers a daily cleanup cron (`/api/cron/cleanup`), the most often Vercel's Hobby plan allows. Expiry is still exact: every request checks `expires_at`, and the bucket rule removes files after 2 days. On Vercel Pro you can change the schedule to hourly (`0 * * * *`).

`STORAGE_DRIVER=local` writes to `./.data`. Use it for development, or for a single always-on server. It does not work on serverless.

No database is needed: each strip's record is a small JSON object stored next to its image (`meta/<id>.json`).

## On the night

- Open the site in Chrome, allow the camera once, then press **Shift+H** for host settings: event name, date, subtitle, default sound, full screen.
- For a real kiosk: `google-chrome --kiosk --app=https://your-domain`.
- **Shift+Esc** resets a stuck session from any screen.
- **Space** runs the main action on every page (open, begin, print). **R** retakes on the review page.

## How it maps to the PRD

| Area | Where |
| --- | --- |
| Screens, timers, retake, auto-print (30 s), auto-reset (60 s), keyboard | `src/components/Booth.tsx` |
| Strip 1200×3600, story 1080×1920, PNG→JPEG fallback over 2.5 MB | `src/lib/booth/compose.ts` |
| 4:3 centre crop, unmirrored save, filters, dark-room gain | `src/lib/booth/photo.ts` |
| Print animation (whirr, 3-pull feed, develop, settle, tag swing), reduced motion | `src/app/globals.css` (`.print` section) |
| Upload `POST /api/strips` (5 MB, PNG/JPEG sniffed, nanoid 21) | `src/app/api/strips/route.ts` |
| `GET /s/:id` phone page / 410 "faded into the mist" | `src/app/s/[id]/route.ts`, `src/lib/server/download-page.ts` |
| `GET /api/strips/:id/image` → 10-minute signed URL, counts downloads | `src/app/api/strips/[id]/image/route.ts` |
| Hourly cleanup | `src/app/api/cron/cleanup/route.ts` |
| Synthesized sounds (muted by default) | `src/lib/booth/sound.ts` |
| Album collage and stickers | `src/components/Collage.tsx`, `public/decor/` |

P1 items included: host event details, story-format image, Web Share, sound. Photos are taken in natural colour (the filter and chapter pickers were removed), each after a 5-second countdown.

## Behaviour worth knowing

- If an upload fails, the tag shows "Waiting for the spirits", retries every 5 s and offers **Save on this laptop**. The 60-second auto-reset is held until the upload succeeds, so the strip isn't lost.
- Rate limits (uploads per device and IP, lookups per IP) are in-memory. On serverless they slow down ID guessing but don't hard-block it.
- `download_count` and `view_count` (QR scans) live on each record; there is no admin page yet (open question in the PRD).
