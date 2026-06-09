// ============================================================
// Supabase Client Setup
// ============================================================
// Two clients:
//   1. supabaseAdmin — uses service role key, bypasses RLS (for server operations)
//   2. createUserClient — creates a per-request client using the user's JWT
//
// NOTE: Clients are lazily initialized to ensure dotenv has loaded first.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

function getEnvVar(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing environment variable: ${name}. Check your .env file.`);
  }
  return val;
}

/**
 * Admin client — bypasses Row Level Security.
 * Use for server-side operations like creating profiles on signup,
 * managing storage buckets, etc.
 * Lazily initialized on first access.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      getEnvVar("SUPABASE_URL"),
      getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _supabaseAdmin;
}

// Convenience getter (backwards-compatible)
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});

/**
 * Creates a Supabase client scoped to a specific user's JWT.
 * This client respects RLS policies so users can only access their own data.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(
    getEnvVar("SUPABASE_URL"),
    getEnvVar("SUPABASE_ANON_KEY"),
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
