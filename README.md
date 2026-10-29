# JPLearn website

The landing page for [JPLearn](https://github.com/NeedMeSomeAnimeTiddy/JPLearn), a desktop
Japanese learning app. The site — "Night Flight" — is a single page rendered over a live
three.js twilight world: a floating shrine island, torii gates, paper lanterns, and drifting
sakura. Scrolling flies the camera along a spline between eight waypoints while glass
content cards pass by.

Built with Next.js (via [vinext](https://github.com/cloudflare/vinext)) and three.js,
deployed as a Cloudflare worker.

## Layout

- `app/page.tsx` — the page: eight scroll sections, flight rail, FAQ, structured data
- `app/WorldScene.tsx` — the three.js scene and scroll-driven camera (client-only chunk)
- `app/WorldDetails.ts` — block-built architecture, terrain, vegetation and spatial instance batching
- `app/world.css` — all page styling; `app/globals.css` holds the reset
- `app/content.ts` — every product fact shown on the page, kept in sync with the app
  repository's `FEATURES.md`
- `tests/rendered-html.test.mjs` — server-rendering and honesty checks (download stays
  disabled until there is a real download; the only live CTA is watching the repo)

## Commands

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev     # local development on :3000
npm run build   # production build
npm test        # build + rendered-HTML tests
npm run lint
```

## Conventions

- Product claims on the page must be traceable to the JPLearn app repository — edit
  `app/content.ts`, not copy scattered through markup.
- Reduced motion is respected everywhere: the camera parks at the hero waypoint and
  ambient animation stops.
- `public/og.jpg` is a hand-drawn 1200×630 social card matching the site's night scene.

## How the world boots

The server HTML paints `public/world-fallback.jpg` as a fixed full-viewport still
(`.w-still`) from the first frame. three.js is not imported until the page has
fired `load` and the browser reports idle time (`requestIdleCallback`, 2 s
timeout). Before mounting, `app/page.tsx` probes a throwaway WebGL context with
`failIfMajorPerformanceCaveat`; when there is no hardware context, or the renderer
string names a software rasteriser (SwiftShader, llvmpipe, softpipe, Microsoft
Basic Render, anything "Software"), the scene never mounts and the still stays.
`WorldScene` asks for the same caveat when it creates its renderer, builds the
world in stages that yield to the browser, and awaits `compileAsync` before the
first frame. Only then does the canvas fade in, and the still fades out with it.
Reduced motion follows the same path and replaces the still with one parked frame.

In development, `?world=force` skips the software check (and the renderer's
caveat), so headless browsers on SwiftShader can still run the live scene. Like
the dev hook below, it is absent from production builds.

## World review and screenshots

With `npm run dev` running, the optional browser check confirms that a software
renderer keeps the still without fetching three.js, then loads `?world=force` to
scroll through all eight stops at 1280×800 and 390×844, check camera alignment
and reduced motion, and simulate WebGL failure. It writes screenshots and render
counts to the ignored `outputs/world-review/` directory.

```bash
node tests/world-scene.browser.mjs
node tests/world-scene.browser.mjs --write-fallback
```

The check needs an existing Playwright installation and defaults to Microsoft Edge.
Set `PLAYWRIGHT_MODULE` to its module name or `file:///` URL when it lives outside
this project, `BROWSER_CHANNEL` to another installed Chromium channel, and
`WORLD_URL` to use a different dev-server address. Browser tooling is not included
in the site's dependencies. Set `WORLD_OUTPUT_DIRECTORY` to keep separate review passes.
`--write-fallback` captures the text-free hero at
1920×1080 into `public/world-fallback.jpg`.

In development, `window.__nightflight` exposes `setProgress(0..1)`, `snap(time)`,
`setSize(width, height)`, `resume()`, and `inspect()`. A stop's progress is its
index divided by seven. `setProgress` parks the camera until `resume()`;
`snap` freezes ambient time for inspection. The hook is absent in production.

The world batches opaque stationary geometry, instances foliage and small repeated
props, caps device pixel ratio at 1.5 and the framebuffer at 2.5 million pixels, and suspends
continuous rendering when reduced motion is enabled. Thousands of decorative blocks
share spatial instance batches; lantern bodies and halos use two draws; star twinkle
runs in the vertex shader. The browser check enforces 140 draw calls and 175,000
triangles per captured waypoint, including phone views. The three.js library is split
from scene art for caching while retaining the 600 kB chunk warning threshold.

Renderer creation failure and `webglcontextlost` show the hero still. Recovery resumes
rendering only once `webglcontextrestored` arrives; resize, visibility and motion
callbacks cannot restart a lost context. This carries forward the scene recovery
handling from Claude branch commit `8df52c4`. The browser check exercises actual
context loss/restoration using `WEBGL_lose_context`, as well as initial renderer failure.
Render counts and desktop timings do not replace a check on a laptop with integrated
graphics. For a production Worker smoke test, run
`npx wrangler dev --config dist/server/wrangler.json --port 3001` after building.
