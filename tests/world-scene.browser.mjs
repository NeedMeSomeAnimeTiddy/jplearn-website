/** Optional real-browser regression/capture check against `npm run dev`.
 * Supply Playwright through PLAYWRIGHT_MODULE (a package name or file URL).
 * No browser tooling is shipped in the app. Run with --write-fallback to
 * regenerate public/world-fallback.jpg from the text-free 1920x1080 hero,
 * then rebuild its WebP versions with the command in the README.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const origin = process.env.WORLD_URL || "http://localhost:3000";
const directory = process.env.WORLD_OUTPUT_DIRECTORY || "outputs/world-review";
const results = [];
const errors = [];
const hideCopy = ".w main,.w-nav,.w-rail { visibility:hidden !important; } .w-canvas,.w-still { transition:none !important; }";
// Headless Edge usually renders WebGL with SwiftShader, which the page refuses
// without the dev-only override, so live-scene passes load with ?world=force.
const forced = `${origin}/?world=force`;
// Requests that would mean the scene chunk or three.js was fetched (dev and build URLs).
const sceneChunk = /WorldScene|\/three[./@-]|deps\/three/;
const stillFile = /\/world-fallback[^/]*$/;
await fs.mkdir(directory, { recursive: true });

// The head preload and the <img> must agree on one candidate, so a load fetches the still once.
function trackStill(page) {
  const requests = [];
  page.on("request", (request) => { if (stillFile.test(new URL(request.url()).pathname)) requests.push(request.url()); });
  return requests;
}

async function open(options) {
  const page = await browser.newPage({ deviceScaleFactor: 1, ...options });
  const stillRequests = trackStill(page);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto(forced, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__nightflight);
  await page.waitForSelector(".w-canvas.is-on:not(.is-fallback)");
  const { width } = page.viewportSize();
  const expected = width * (options.deviceScaleFactor ?? 1) <= 960 ? /\/world-fallback-960\.webp$/ : /\/world-fallback\.webp$/;
  assert.equal(stillRequests.length, 1, `the still loads once at ${width}px: ${stillRequests.join(", ")}`);
  assert.match(stillRequests[0], expected);
  await page.addStyleTag({ content: "html { scroll-behavior:auto !important; }" });
  return page;
}

try {
  // Report what headless Edge actually renders with; the page itself never sees this.
  const probe = await browser.newPage();
  await probe.goto(`${origin}/world-fallback.jpg`);
  const nativeRenderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no webgl2";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  });
  console.log(`Headless renderer: ${nativeRenderer}`);
  await probe.close();
  if (!/swiftshader|llvmpipe|softpipe|microsoft basic render|software/i.test(nativeRenderer)) {
    // Hardware WebGL: the scene must boot on its own with no override.
    const hardware = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    hardware.on("pageerror", (error) => errors.push(error.message));
    await hardware.goto(origin, { waitUntil: "load" });
    await hardware.waitForSelector(".w-canvas.is-on:not(.is-fallback)");
    await hardware.close();
  }

  // Without the override, a software renderer must never load three.js: the
  // server-rendered still stays visible and no canvas mounts.
  const software = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  software.on("pageerror", (error) => errors.push(error.message));
  const softwareStillRequests = trackStill(software);
  const sceneRequests = [];
  software.on("request", (request) => { if (sceneChunk.test(request.url())) sceneRequests.push(request.url()); });
  await software.addInitScript(() => {
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = context.prototype.getParameter;
      context.prototype.getParameter = function (name) {
        // RENDERER and UNMASKED_RENDERER_WEBGL
        if (name === 0x1f01 || name === 0x9246) return "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)";
        return original.call(this, name);
      };
    }
  });
  await software.goto(origin, { waitUntil: "networkidle" });
  await software.waitForTimeout(3500);
  assert.equal(await software.locator(".w-canvas").count(), 0, "a software renderer must not mount the scene");
  assert.deepEqual(sceneRequests, [], "a software renderer must not fetch three.js or the scene chunk");
  assert.equal(await software.evaluate(() => window.__nightflight), undefined);
  const softwareStill = await software.locator(".w-still").evaluate((image) => ({
    src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0, opacity: getComputedStyle(image).opacity,
  }));
  assert.match(softwareStill.src, /\/world-fallback\.webp$/);
  assert.ok(softwareStill.loaded, "the still must load");
  assert.deepEqual(softwareStillRequests, [softwareStill.src], "the still loads once");
  assert.equal(softwareStill.opacity, "1", "the still stays visible without a live scene");
  await software.screenshot({ path: `${directory}/software-still.png` });
  await software.close();

  for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 390, 844]]) {
    const page = await open({ viewport: { width, height } });
    assert.equal(await page.locator("[data-stop]").count(), 8);
    // The live canvas is alpha over the sky, so the still must actually fade out.
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".w-still")).opacity === "0");
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
      assert.ok(natural.calls <= 140, `${name} stop ${stop} exceeds the 140 draw-call budget`);
      assert.ok(natural.triangles <= 175_000, `${name} stop ${stop} exceeds the 175k triangle budget`);
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
    console.log("Wrote public/world-fallback.jpg; regenerate the WebP stills with the README command.");
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
  // A real driver-context loss must cancel rendering and survive preference/resize
  // callbacks. Restoring the same context must re-upload the instanced geometry.
  const supportsLoss = await page.evaluate(() => {
    const extension = document.querySelector(".w-canvas").getContext("webgl2").getExtension("WEBGL_lose_context");
    window.__contextLossTest = extension;
    if (extension) extension.loseContext();
    return Boolean(extension);
  });
  assert.ok(supportsLoss, "browser must expose WEBGL_lose_context for this regression check");
  await page.waitForSelector(".w-canvas.is-fallback");
  assert.equal(await page.evaluate(() => window.__nightflight.inspect().contextLost), true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".w-canvas").evaluate((canvas) => canvas.classList.contains("is-fallback")), true);
  await page.evaluate(() => window.__contextLossTest.restoreContext());
  await page.waitForSelector(".w-canvas.is-on:not(.is-fallback)");
  assert.equal(await page.evaluate(() => window.__nightflight.inspect().contextLost), false);
  assert.ok(await page.evaluate(() => window.__nightflight.inspect().calls > 0));
  await page.close();

  const reduced = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await reduced.addStyleTag({ content: hideCopy });
  await reduced.waitForTimeout(300);
  assert.equal(await reduced.evaluate(() => window.__nightflight.inspect().pixelRatio), 1.5);
  const initialStill = await reduced.screenshot();
  await reduced.evaluate(() => window.scrollTo({ top: 5000, behavior: "instant" }));
  await reduced.waitForTimeout(300);
  assert.ok(initialStill.equals(await reduced.screenshot()), "initial reduced-motion scene must stay still");
  await reduced.setViewportSize({ width: 2560, height: 1440 });
  await reduced.waitForTimeout(200);
  const pixels = await reduced.locator(".w-canvas").evaluate((canvas) => canvas.width * canvas.height);
  assert.ok(pixels <= 2_500_000, "large displays respect the total framebuffer pixel budget");
  await reduced.close();

  const fallback = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  // Forced past the probe so WorldScene's own renderer-failure path is exercised.
  await fallback.goto(forced, { waitUntil: "networkidle" });
  await fallback.waitForSelector(".w-canvas.is-fallback.is-on");
  assert.match(await fallback.locator(".w-canvas").evaluate((element) => getComputedStyle(element).backgroundImage), /world-fallback\.webp/);
  assert.equal(await fallback.locator(".w-still").evaluate((image) => getComputedStyle(image).opacity), "1");
  for (const file of ["world-fallback.jpg", "world-fallback.webp", "world-fallback-960.webp"]) {
    assert.equal((await fallback.request.get(`${origin}/${file}`)).status(), 200, file);
  }
  await fallback.screenshot({ path: `${directory}/fallback-check.png` });
  assert.deepEqual(errors, [], "no application errors during browser checks");
  await fs.writeFile(`${directory}/stats.json`, JSON.stringify(results, null, 2));
  console.log("PASS: software-renderer still, 16 waypoint captures, scroll alignment, DPR cap, reduced motion, resume, WebGL fallback/context recovery, and framebuffer budget.");
} finally {
  await browser.close();
}
