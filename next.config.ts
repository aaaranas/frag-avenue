import type { NextConfig } from "next";

/**
 * Content Security Policy.
 * `unsafe-inline` on script-src is required by Next 15 App Router without a
 * nonce-injection middleware; migrating to nonce-based CSP is a follow-up
 * (see docs/ROADMAP.md). Shipped as `Report-Only` first so real users don't
 * see blank pages while we tune it.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // Google sign-in: without JS the form posts here and is redirected to Google,
  // and Chromium applies form-action to that redirect.
  "form-action 'self' https://accounts.google.com",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // The Wardrobe replaced the Collection (refactor Phase 3). Old links and
  // bookmarks keep working.
  async redirects() {
    return [
      { source: "/collection", destination: "/wardrobe", permanent: true },
      { source: "/collection/:id/edit", destination: "/wardrobe/:id", permanent: true },
      // The Log flow replaced the wear journal (refactor Phase 4). Query
      // strings (e.g. ?collectionItemId=) carry over.
      { source: "/wear", destination: "/wears", permanent: true },
      { source: "/wear/new", destination: "/log", permanent: true },
      { source: "/wear/:id/edit", destination: "/wears/:id/edit", permanent: true },
      // Stats replaced the dashboard and Insights (refactor Phase 6), and the
      // Advisor was retired (Phase 8).
      { source: "/dashboard", destination: "/stats", permanent: true },
      { source: "/insights", destination: "/stats", permanent: true },
      { source: "/advisor", destination: "/stats", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default config;
