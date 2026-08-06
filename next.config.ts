import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray ~/package-lock.json makes Turbopack infer the wrong workspace root.
  turbopack: { root: __dirname },
  // Firebase's signInWithPopup needs to talk to the popup it opened. Chrome's
  // default cross-origin isolation severs that handshake and the popup reports
  // itself closed, so sign-in fails for reasons that have nothing to do with
  // the credentials.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }],
      },
    ];
  },
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
