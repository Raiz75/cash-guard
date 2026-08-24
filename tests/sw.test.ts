/* AI-CONTEXT-NOTE:{"R":"Vitest tests for public/sw.js precache integrity — extracts the cache.addAll URL list and verifies every referenced static asset exists in public/, preventing install failures.","IDD":[{"?":"Parses sw.js source text instead of importing it — sw.js is a browser-only service worker (no module exports, self/caches globals absent in Node)"},{"?":"The \"/\" route is exempt from filesystem checks because it is served by Next.js, not a file in public/"},{"?":"This test exists because a stale icon path in addAll caused 'Failed to execute addAll on Cache: Request failed' and broke SW install"}],"A":[{"!!!":"public/sw.js","CRITICAL":"any rename/delete of a file listed in cache.addAll must keep this suite green or PWA installs break"}],"AB":[{"?":"public/ directory contents","missing files surface here as failing tests"},{"?":"vitest.config.mts","node:fs available for reading public/sw.js"}],"E":[{"!!":"npm test sw"},{"!!":"After editing the addAll list, run this BEFORE deploy"},{"?":"Verify manifest.webmanifest icon src matches an actual file too"},{"*":"Edge: URLs with query strings or nested folders — existsSync resolves relative to repo root + public"}]} */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const SW_PATH = resolve(ROOT, "public", "sw.js");

function extractPrecacheUrls(): string[] {
  const src = readFileSync(SW_PATH, "utf8");
  const match = src.match(/cache\.addAll\(\[([\s\S]*?)\]\)/);
  if (!match) throw new Error("No cache.addAll([...]) found in public/sw.js");
  const urls = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error("cache.addAll list is empty");
  return urls;
}

describe("service worker precache list", () => {
  it("extracts a non-empty precache list", () => {
    expect(extractPrecacheUrls().length).toBeGreaterThan(0);
  });

  it("precaches the offline app shell route /", () => {
    expect(extractPrecacheUrls()).toContain("/");
  });

  it("every precached static asset exists in public/", () => {
    const missing = extractPrecacheUrls()
      .filter((url) => url !== "/")
      .filter((url) => !existsSync(resolve(ROOT, "public", ...url.split("/").filter(Boolean))));
    expect(missing).toEqual([]);
  });

  it("manifest icon sources exist in public/", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, "public", "manifest.webmanifest"), "utf8")
    ) as { icons?: { src: string }[] };
    const missing = (manifest.icons ?? [])
      .map((icon) => icon.src)
      .filter((src) => !existsSync(resolve(ROOT, "public", ...src.split("/").filter(Boolean))));
    expect(missing).toEqual([]);
  });
});
