import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    serverActions: { bodySizeLimit: "5mb" }, // CSV-Import
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
