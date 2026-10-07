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

## World review and screenshots

With `npm run dev` running, the optional browser check scrolls through all eight
stops at 1280×800 and 390×844, checks camera alignment and reduced motion, and
simulates WebGL failure. It writes screenshots and render counts to the ignored
`outputs/world-review/` directory.

```bash
node tests/world-scene.browser.mjs
node tests/world-scene.browser.mjs --write-fallback
```

The check needs an existing Playwright installation and defaults to Microsoft Edge.
Set `PLAYWRIGHT_MODULE` to its module name or `file:///` URL when it lives outside
this project, `BROWSER_CHANNEL` to another installed Chromium channel, and
`WORLD_URL` to use a different dev-server address. Browser tooling is not included
in the site's dependencies. `--write-fallback` captures the text-free hero at
1920×1080 into `public/world-fallback.jpg`.

In development, `window.__nightflight` exposes `setProgress(0..1)`, `snap(time)`,
`setSize(width, height)`, `resume()`, and `inspect()`. A stop's progress is its
index divided by seven. `setProgress` parks the camera until `resume()`;
`snap` freezes ambient time for inspection. The hook is absent in production.

The world batches opaque stationary geometry, instances foliage and small repeated
props, caps device pixel ratio at 1.5, and suspends continuous rendering when reduced
motion is enabled. Render counts and desktop timings do not replace a check on a
laptop with integrated graphics.
