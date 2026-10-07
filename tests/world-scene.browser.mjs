/** Optional real-browser regression/capture check against `npm run dev`.
 * Supply Playwright through PLAYWRIGHT_MODULE (a package name or file URL).
 * No browser tooling is shipped in the app. Run with --write-fallback to
 * regenerate public/world-fallback.jpg from the text-free 1920x1080 hero.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const origin = process.env.WORLD_URL || "http://localhost:3000";
const directory = "outputs/world-review";
const results = [];
const errors = [];
const hideCopy = ".w main,.w-nav,.w-rail { visibility:hidden !important; } .w-canvas { transition:none !important; }";
await fs.mkdir(directory, { recursive: true });

async function open(options) {
  const page = await browser.newPage({ deviceScaleFactor: 1, ...options });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__nightflight);
  await page.addStyleTag({ content: "html { scroll-behavior:auto !important; }" });
  return page;
}

try {
  for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 390, 844]]) {
    const page = await open({ viewport: { width, height } });
    assert.equal(await page.locator("[data-stop]").count(), 8);
    for (let stop = 0; stop < 8; stop++) {
      await page.evaluate((index) => {
        window.__nightflight.resume();
        window.scrollTo({ top: window.__nightflight.inspect().sectionAnchors[index], behavior: "instant" });
      }, stop);
      await page.waitForTimeout(1800);
      const natural = await page.evaluate(() => window.__nightflight.inspect());
      // Check actual scroll positioning before using the dev hook as the reference.
      await page.screenshot({ path: `${directory}/${name}-${stop}.png` });
      const exact = await page.evaluate((index) => {
        window.__nightflight.setProgress(index / 7);
        window.__nightflight.snap(0);
        return window.__nightflight.inspect();
      }, stop);
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(Math.abs(natural.position[axis] - exact.position[axis]) < 0.08, `${name} stop ${stop} camera must settle at its waypoint`);
      }
      assert.ok(natural.pixelRatio <= 1.5);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no horizontal overflow");
      results.push({ viewport: name, stop, ...natural });
    }
    await page.close();
  }

  const page = await open({ viewport: { width: 1920, height: 1080 } });
  await page.addStyleTag({ content: hideCopy });
  await page.evaluate(() => {
    window.__nightflight.setSize(1920, 1080);
    window.__nightflight.setProgress(0);
    window.__nightflight.snap(0);
  });
  await page.waitForTimeout(300);
  if (process.argv.includes("--write-fallback")) {
    await page.screenshot({ path: "public/world-fallback.jpg", type: "jpeg", quality: 92 });
  }
  await page.evaluate(() => { window.__nightflight.setProgress(5 / 7); window.__nightflight.resume(); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  const hero = await page.evaluate(() => window.__nightflight.inspect());
  assert.deepEqual(hero.position, [-2, 6.8, 24], "a live preference change restores the hero");
  const still = await page.screenshot();
  await page.evaluate(() => window.scrollTo({ top: 6000, behavior: "instant" }));
  await page.mouse.move(1800, 900);
  await page.waitForTimeout(500);
  assert.deepEqual((await page.evaluate(() => window.__nightflight.inspect())).position, hero.position);
  assert.ok(still.equals(await page.screenshot()), "ambient scene pixels must stop changing");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(1800);
  assert.notDeepEqual((await page.evaluate(() => window.__nightflight.inspect())).position, hero.position);
  await page.close();

  const reduced = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await reduced.addStyleTag({ content: hideCopy });
  await reduced.waitForTimeout(300);
  assert.equal(await reduced.evaluate(() => window.__nightflight.inspect().pixelRatio), 1.5);
  const initialStill = await reduced.screenshot();
  await reduced.evaluate(() => window.scrollTo({ top: 5000, behavior: "instant" }));
  await reduced.waitForTimeout(300);
  assert.ok(initialStill.equals(await reduced.screenshot()), "initial reduced-motion scene must stay still");
  await reduced.close();

  const fallback = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto(origin, { waitUntil: "networkidle" });
  await fallback.waitForSelector(".w-canvas.is-fallback.is-on");
  assert.match(await fallback.locator(".w-canvas").evaluate((element) => getComputedStyle(element).backgroundImage), /world-fallback.jpg/);
  assert.equal((await fallback.request.get(`${origin}/world-fallback.jpg`)).status(), 200);
  await fallback.screenshot({ path: `${directory}/fallback-check.png` });
  assert.deepEqual(errors, [], "no application errors during browser checks");
  await fs.writeFile(`${directory}/stats.json`, JSON.stringify(results, null, 2));
  console.log("PASS: 16 waypoint captures, scroll alignment, DPR cap, reduced motion, resume, and WebGL fallback.");
} finally {
  await browser.close();
}
