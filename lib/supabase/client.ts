/* AI-CONTEXT-NOTE:{"R":"Browser-only Supabase client factory: reads NEXT_PUBLIC_* env at module scope, validates config, and caches one SupabaseClient instance (lazy creation).","IDD":[{"?":"Module-scope env reads let Next.js statically inline NEXT_PUBLIC_* at build time"},{"?":"Lazy singleton avoids creating a client when env is missing and reuses one instance across calls"},{"?":"No @supabase/ssr — there is no server data layer; RLS is the security boundary"}],"A":[{"!!":"lib/db/types.ts","shared row types used by repositories"},{"!!":"components/providers/QueryProvider.tsx","auth/session context for queries"},{"?":"tests/supabaseClient.test.ts","config validation and singleton behavior"}],"AB":[{"?":"process.env.NEXT_PUBLIC_SUPABASE_URL","required public URL"},{"?":"process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","required publishable key"}],"E":[{"!!":"npm test -- tests/supabaseClient.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Missing env throws /Supabase is not configured/"},{"*":"Repeated getSupabase() returns the same object"}]} */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
