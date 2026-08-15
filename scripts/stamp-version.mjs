/**
 * FILE NAME: stamp-version.mjs
 *
 * ROLE: Build-time version stamp — reads SemVer from package.json and stamps it into public/sw.js, public/manifest.webmanifest, and a generated lib/version.ts before `next build`.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - package.json "version" is the single source of truth; every other version surface derives from it.
 * ? - sw.js VERSION presence guard AND replace are both anchored to line-start (/^const VERSION = /m and /^const VERSION = [^;]+;/m) so the header comment's identical text is never matched and a missing declaration fails loudly.
 * ? - Fails loudly (non-zero exit) on missing/invalid SemVer so a release never goes out unversioned.
 * ? - Runs only in the production build script; next dev must not stamp.
 * ? - Idempotent: same version produces byte-identical output.
 *
 * AFFECTS:
 * ! - public/sw.js (CRITICAL: VERSION rewrite is the byte change that drives the PWA update detector)
 * ? - public/manifest.webmanifest ("version" field)
 * ? - lib/version.ts (regenerated APP_VERSION constant consumed by SettingsView)
 *
 * AFFECTED BY:
 * ? - package.json ("version" field — the source of truth)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify all three targets stamp and output is idempotent across two builds
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;

if (typeof version !== "string" || !semverPattern.test(version)) {
  console.error(`[stamp-version] missing or invalid "version" in package.json: ${version}`);
  process.exit(1);
}

const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf8");
if (!/^const VERSION = /m.test(sw)) {
  console.error('[stamp-version] could not find "const VERSION = " in public/sw.js');
  process.exit(1);
}
sw = sw.replace(/^const VERSION = [^;]+;/m, `const VERSION = "${version}";`);
writeFileSync(swPath, sw);

const manifestPath = join(root, "public", "manifest.webmanifest");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const versionPath = join(root, "lib", "version.ts");
const ts = `// GENERATED FILE - do not edit. Regenerate with \`npm run build\`.\nexport const APP_VERSION = "${version}";\n`;
writeFileSync(versionPath, ts);

console.log(`[stamp-version] stamped v${version}`);
