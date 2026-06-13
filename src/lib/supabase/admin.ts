import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client (secret key) — admin-user provisioning and
 * Storage management only. Server-only: importing this in client code is a
 * security bug, hence the runtime guard.
 */
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseAdminClient must never run in the browser");
  }
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey || secretKey.startsWith("YOUR_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set — paste the sb_secret_... key into .env",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
