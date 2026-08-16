// AI-CONTEXT-NOTE:{"R":"Build-time version stamp — reads SemVer from package.json and stamps it into public/sw.js, public/manifest.webmanifest, and a generated lib/version.ts before `next build`.","IDD":[{"?":"package.json \"version\" is the single source of truth; every other version surface derives from it."},{"?":"sw.js VERSION presence guard AND replace are both anchored to line-start (/^const VERSION = /m and /^const VERSION = [^;]+;/m) so the header comment's identical text is never matched and a missing declaration fails loudly."},{"?":"Fails loudly (non-zero exit) on missing/invalid SemVer so a release never goes out unversioned."},{"?":"Runs only in the production build script; next dev must not stamp."},{"?":"Idempotent: same version produces byte-identical output."}],"A":[{"!!!":"public/sw.js","CRITICAL":"VERSION rewrite is the byte change that drives the PWA update detector"},{"?":"public/manifest.webmanifest","version field"},{"?":"lib/version.ts","Regenerated APP_VERSION constant consumed by SettingsView"}],"AB":[{"?":"package.json","version field — the source of truth"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify all three targets stamp and output is idempotent across two builds"}]}
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
