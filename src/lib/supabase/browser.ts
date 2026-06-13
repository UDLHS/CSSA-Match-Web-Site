"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — publishable key only, never the secret key. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
