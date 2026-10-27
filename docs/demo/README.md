# End-to-end demo recording

[Open/download the full demo (MP4)](automotive-xr-demo.mp4)

[![Animated preview of the setup-to-execution demo](demo-preview.gif)](automotive-xr-demo.mp4)

This is a captioned, silent recording of real commands and real browser interactions. The checkout and dependency cache were already prepared; it is not a fresh-clone or clean-machine installation benchmark. A newly created, isolated PostgreSQL database was migrated and seeded for the recording, then removed afterward. Only synthetic customer details are shown.

## Video details and chapters

Duration: **2:45** · **1280 × 800** · **24 fps** · H.264 MP4 · approximately **2.7 MiB**. Captions are visible in the video; there is no audio track.

Timestamps are approximate. Machine-readable timings are in [`chapters.json`](chapters.json).

| Time  | Chapter                                |
| ----- | -------------------------------------- |
| 00:00 | Introduction                           |
| 00:07 | Install dependencies                   |
| 00:11 | Start local services                   |
| 00:15 | Generate, migrate and seed             |
| 00:24 | Test and build                         |
| 00:54 | Launch applications                    |
| 01:09 | Customer landing page                  |
| 01:22 | Configurator and authoritative pricing |
| 01:29 | Invalid option combination             |
| 01:42 | Customer sign-in                       |
| 01:48 | Save configuration                     |
| 02:00 | Dealer enquiry                         |
| 02:15 | Submitted lead in administration       |
| 02:19 | Catalog administration                 |
| 02:28 | Audit trail                            |
| 02:31 | OpenAPI documentation                  |
| 02:36 | Demo complete                          |

## What it demonstrates

- Pinned dependency installation, PostgreSQL/Redis startup, Prisma generation, migrations and seed data.
- Unit tests, production builds, API integration checks and Redis/WebSocket gateway integration.
- Starting the customer, admin, API and local OIDC services.
- Catalog browsing, vehicle details, paint/wheel/interior choices and backend price updates.
- Rejecting an incompatible trim/wheel combination before saving.
- Local OIDC sign-in, configuration persistence, signed sharing and garage retrieval.
- Submitting a consented dealer enquiry and finding it in administration.
- Catalog creation/archiving, price management, audit records and Swagger documentation.

The video uses the labelled schematic vehicle preview. It does **not** demonstrate a licensed Unreal vehicle scene, real GPU/WebRTC rendering, or an AWS deployment. The passwordless identity fixture is strictly for loopback development.

## Reproduce the recording

Prerequisites: the normal local-development prerequisites, `ffmpeg`/`ffprobe`, Chromium, and Playwright's recording encoder. The script expects the default Compose PostgreSQL user/database settings and free ports 3000, 3001, 4000, 5010 and 5098. It starts/stops its own application processes and removes only its randomly named recording database; it leaves the Compose services running.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium ffmpeg
node scripts/demo/record-demo.mjs
```

The recorder uses `/usr/bin/chromium` when present, otherwise Playwright’s installed Chromium. Set `CHROMIUM_PATH` to choose another installed browser. In this cloud workspace, activate the writable XDG configuration from `docs/local-setup.md` before running it. The recording encoder here uses the installed system FFmpeg through Playwright's expected encoder path.

Outputs:

- `automotive-xr-demo.mp4`: full H.264 video, with captions burned into the recording.
- `demo-preview.gif`: short, looping README preview.
- `demo-poster.png`: actual application screenshot.
- `chapters.json`: observed chapter timings and media metadata.

Raw WebM recordings stay under ignored `.local/demo-recording/`. The recording uses warm caches where valid; unit tests are explicitly rerun, and integration checks execute against real local services. Setup failures or failed UI assertions stop the script rather than generating a success video.

## Validation

The recording completed every setup command and browser assertion. Its unit run passed 11 tests; API integration passed 25 checks; the Redis/WebSocket integration passed. FFmpeg decoded the complete MP4 and GIF without errors. The MP4 contains one H.264 video stream and no audio. The recorder then stopped its application processes and removed its isolated database; PostgreSQL and Redis remain available.
