import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (team logos, player photos, ad creatives)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
