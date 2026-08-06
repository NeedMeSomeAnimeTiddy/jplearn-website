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
