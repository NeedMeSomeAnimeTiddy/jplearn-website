import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://jplearn.example${path}`, { headers: { accept: "text/html", host: "jplearn.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Night Flight landing page", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>JPLearn — Step into Japanese<\/title>/i);
  assert.match(html, /Step into/);
  assert.match(html, /Menus you fly through, not tabs you hunt\./);
  assert.match(html, /Six islands, one route\./);
  assert.match(html, /Seventeen lanterns, one flame\./);
  assert.match(html, /Gravity for what you learn\./);
  assert.match(html, /A guide who lives here\./);
  assert.match(html, /Your sky fills in\./);
  assert.match(html, /The gate is open\./);
  assert.match(html, /Romaji Sprint/);
  assert.match(html, /Vibe Check/);
  assert.match(html, /Interleave Mix/);
});

test("paints the world still before any three.js code loads", async () => {
  const html = await (await render("/")).text();
  const still = html.match(/<img[^>]*class="w-still"[^>]*>/)?.[0] ?? "";
  const srcset = "/world-fallback-960.webp 960w, /world-fallback.webp 1920w";
  assert.match(still, /src="\/world-fallback\.webp"/);
  assert.ok(still.toLowerCase().includes(`srcset="${srcset}"`), "phones get the 960 WebP");
  // object-fit: cover draws the 16:9 still at least 16/9 of the viewport height wide.
  const sizes = "max(100vw, 177.78vh)";
  assert.ok(still.includes(`sizes="${sizes}"`), "sizes covers portrait screens");
  assert.match(still, /alt=""/);
  assert.match(still, /aria-hidden="true"/);
  assert.match(still, /fetchpriority="high"/i);
  assert.doesNotMatch(still, /loading="lazy"/);
  assert.doesNotMatch(html, /class="w-canvas/, "the canvas is client-only, so the still is all the server paints");

  // The head preload must describe the same candidates, or the still is fetched twice.
  const imagePreloads = html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g) ?? [];
  assert.equal(imagePreloads.length, 1, "one image preload for the still");
  assert.ok(imagePreloads[0].toLowerCase().includes(`imagesrcset="${srcset}"`));
  assert.ok(imagePreloads[0].toLowerCase().includes(`imagesizes="${sizes}"`));
  assert.match(imagePreloads[0], /fetchpriority="high"/i);
  assert.doesNotMatch(html, /world-fallback\.jpg/, "the JPEG is only the source for the WebPs");
});

test("loads Google Fonts without blocking first paint", async () => {
  const html = await (await render("/")).text();
  const fonts = /https:\/\/fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+JP/;
  const noscripts = html.match(/<noscript>[\s\S]*?<\/noscript>/g) ?? [];
  const outsideNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  const links = outsideNoscript.match(/<link[^>]*>/g) ?? [];
  assert.ok(!links.some((link) => /rel="stylesheet"/.test(link) && fonts.test(link)), "no blocking font stylesheet");
  assert.ok(links.some((link) => /rel="preload"/.test(link) && /as="style"/.test(link) && fonts.test(link)), "the font CSS is preloaded");
  assert.ok(links.some((link) => /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/.test(link)));
  assert.ok(links.some((link) => /rel="preconnect" href="https:\/\/fonts\.gstatic\.com"/.test(link)));
  assert.match(outsideNoscript, /<script>[^<]*l\.rel="stylesheet"[^<]*fonts\.googleapis\.com/, "a script attaches the stylesheet");
  assert.ok(noscripts.some((block) => /<link rel="stylesheet"/.test(block) && fonts.test(block)), "no-JS visitors still get the fonts");
});

test("caches hashed assets for a year and public images for a week, never the page", async () => {
  const headers = await readFile(new URL("../dist/client/_headers", import.meta.url), "utf8");
  const rules = new Map();
  let path = "";
  for (const line of headers.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    if (/^\s/.test(line)) rules.get(path).push(line.trim());
    else rules.set((path = line.trim()), []);
  }
  assert.deepEqual(rules.get("/assets/*"), ["Cache-Control: public, max-age=31536000, immutable"]);
  const week = ["Cache-Control: public, max-age=604800, stale-while-revalidate=86400"];
  for (const image of ["/world-fallback*", "/jplearn-*", "/ks-*", "/og.jpg"]) assert.deepEqual(rules.get(image), week);
  for (const pattern of rules.keys()) {
    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    assert.ok(!regex.test("/") && !regex.test("/index.html"), `${pattern} must not match the HTML page`);
  }
});

test("gives visitors a real, working call to action", async () => {
  const html = await (await render("/")).text();
  assert.match(html, /href="https:\/\/github\.com\/NeedMeSomeAnimeTiddy\/JPLearn\/subscription"/);
  assert.match(html, /Get notified on GitHub/);
});

test("keeps unbuilt calls to action honestly non-interactive", async () => {
  const html = await (await render("/")).text();
  const disabledButtons = html.match(/<button[^>]*disabled=""[^>]*>/g) ?? [];
  assert.ok(disabledButtons.length >= 1, "download button stays disabled");
  assert.match(html, /coming soon/i);
  assert.doesNotMatch(html, /href=["']#["']/i);
  assert.doesNotMatch(html, /href=["']javascript:/i);
});

test("includes canonical GitHub and social metadata", async () => {
  const html = await (await render("/")).text();
  assert.match(html, /https:\/\/github\.com\/NeedMeSomeAnimeTiddy\/JPLearn/);
  assert.match(html, /property="og:image" content="https:\/\/jplearn\.app\/og\.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="canonical" href="https:\/\/jplearn\.app\/"/);
  assert.doesNotMatch(html, /jplearn\.example|evil\.example/, "site URLs ignore the request host");
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});
