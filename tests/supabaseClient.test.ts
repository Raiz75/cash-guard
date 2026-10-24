/* AI-CONTEXT-NOTE:{"R":"Tests lib/supabase/client.ts — missing env vars produce a readable error and repeated calls reuse one browser client.","IDD":[{"?":"vi.resetModules + dynamic import so module-scope env reads and the cached client are re-evaluated per test"},{"?":"vi.stubEnv supplies NEXT_PUBLIC_* values without touching the developer's .env.local"}],"A":[{"!!":"lib/supabase/client.ts","CRITICAL":"config validation and singleton behavior are asserted here"}],"AB":[{"?":"vitest.config.mts","dynamic import resolution through the @/* alias"}],"E":[{"!!":"npm test -- tests/supabaseClient.test.ts"},{"?":"Missing URL or key throws /Supabase is not configured/"},{"*":"Repeated getSupabase() calls return the exact same object"}]} */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabase", () => {
  it("throws a readable error when env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const { getSupabase } = await import("@/lib/supabase/client");

    expect(() => getSupabase()).toThrow("Supabase is not configured");
  });

  it("returns the same client for repeated calls", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

    const { getSupabase } = await import("@/lib/supabase/client");

    expect(getSupabase()).toBe(getSupabase());
  });
});
