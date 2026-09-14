import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co").hostname;
  } catch {
    return "placeholder.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }, { protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
