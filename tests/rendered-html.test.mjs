import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://jplearn.example/", { headers: { accept: "text/html", host: "jplearn.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete JPLearn landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>JPLearn — A Better Way to Learn Japanese<\/title>/i);
  assert.match(html, /Learn Japanese\.<!-- -->Keep moving forward\.|Learn Japanese\./i);
  assert.match(html, /Stop juggling apps/);
  assert.match(html, /Everything builds/);
  assert.match(html, /WORDS IN CONTEXT/);
  assert.match(html, /Know what to/);
  assert.match(html, /Practice without repeating/);
  assert.match(html, /Learn how Japanese/);
  assert.match(html, /Ask when you/);
  assert.match(html, /See the work/);
  assert.match(html, /Questions worth/);
  assert.match(html, /Follow the build/);
  assert.match(html, /Your Japanese journey/);
});

test("gives visitors a real, working call to action", async () => {
  const html = await (await render()).text();
  assert.match(html, /href="https:\/\/github\.com\/NeedMeSomeAnimeTiddy\/JPLearn\/subscription"/);
  assert.match(html, /Get notified on GitHub/);
});

test("keeps unbuilt calls to action honestly non-interactive", async () => {
  const html = await (await render()).text();
  const disabledButtons = html.match(/<button[^>]*disabled=""[^>]*>/g) ?? [];
  assert.ok(disabledButtons.length >= 3);
  assert.match(html, /Coming soon/);
  assert.doesNotMatch(html, /href=["']#["']/i);
  assert.doesNotMatch(html, /href=["']javascript:/i);
});

test("includes canonical GitHub and social metadata", async () => {
  const html = await (await render()).text();
  assert.match(html, /https:\/\/github\.com\/NeedMeSomeAnimeTiddy\/JPLearn/);
  assert.match(html, /property="og:image" content="https:\/\/jplearn\.example\/og\.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="canonical" href="https:\/\/jplearn\.example\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});
