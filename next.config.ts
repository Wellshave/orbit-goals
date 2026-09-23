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
  experimental: {
    // Een pagina die je net bezocht (of via hover al ophaalde) mag 30 s uit de routercache komen:
    // terug- en heen-klikken voelt direct. Server actions met revalidatePath legen deze cache.
    staleTimes: { dynamic: 30, static: 30 },
    // Menulinks met unstable_dynamicOnHover halen de volledige pagina al op zodra je erover beweegt.
    dynamicOnHover: true,
  },
};

export default nextConfig;
