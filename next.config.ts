import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pisqegfpvzjbswvcqjak.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // 🔥 HAPUS unoptimized untuk production
    // unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;