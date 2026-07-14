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
  },
  // Tambahkan header CSP khusus untuk halaman checkout
  async headers() {
    return [
      {
        source: "/checkout/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "script-src 'self' 'unsafe-inline' https://app.sandbox.midtrans.com https://api.sandbox.midtrans.com https://snap-assets.sandbox.midtrans.com https://pay.google.com https://gwk.gopayapi.com https://www.googletagmanager.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;