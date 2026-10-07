import assert from "node:assert/strict";
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
