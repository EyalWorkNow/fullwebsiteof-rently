import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray ~/package-lock.json makes Turbopack infer the wrong workspace root.
  turbopack: { root: __dirname },
  // Same-origin proxy to the prod API so browser fetches avoid CORS.
  async rewrites() {
    return [
      {
        source: "/api/rently/:path*",
        destination: "https://g7b9nx11sk.execute-api.us-east-1.amazonaws.com/prod/:path*",
      },
    ];
  },
};

export default nextConfig;
