/* AI-CONTEXT-NOTE:{"R":"Vitest configuration (ESM .mts) — test runner (npm test) with happy-dom env, native tsconfig path aliasing, excluding build artifacts.","IDD":[{"?":"Uses .mts so ESM syntax loads without a 'type:module' package.json requirement"},{"?":"resolve.tsconfigPaths: true reads tsconfig.json @/* alias natively, no extra plugin"},{"?":"Globals enabled so tests import { describe, it, expect } without verbose imports"}],"A":[{"?":"package.json","exposes the test script npm test"},{"?":"tests/*.test.ts","test files exercising lib/format.ts, lib/csv.ts, lib/db/repository.ts, lib/validations/transaction.ts"}],"AB":[{"?":"tsconfig.json","@/* alias must be defined here"}],"E":[{"!!":"npm test","run full suite after any change"},{"!!":"npm run build","ensure no type regressions"},{"?":"Tests must not pollute .next or node_modules folders"}]} */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  },
  resolve: {
    tsconfigPaths: true,
  },
});
