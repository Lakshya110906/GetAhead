import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

// Deliberately permissive on img-src/connect-src (any https host, since
// answer-sheet files and generated screenshots can live at Vercel Blob or
// any storage host) but locked down everywhere else.
//
// script-src needs 'unsafe-inline': Next.js's App Router injects inline
// bootstrap scripts to stream RSC payloads and hydrate the page, with or
// without any app code writing literal <script> tags. Without it, every
// one of those inline scripts is blocked and the page never finishes
// hydrating — no onClick handler anywhere on the site fires (verified:
// this is why the dark-mode toggle silently did nothing). The documented
// alternative is a per-request nonce (see Next's content-security-policy
// guide), but that requires forcing every page — including this app's
// statically-generated marketing pages — into dynamic rendering, which is
// a real performance/cost tradeoff, not a drop-in fix. 'unsafe-inline' on
// style-src is required by Tailwind's runtime style injection and inline
// style props used across this app.
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' is dev-only: React's dev mode uses eval() to reconstruct
  // server error stacks in the browser; neither React nor Next.js use it
  // in production (Next's own CSP guide documents this same isDev split).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source map upload needs an auth token; without one this is a no-op
  // rather than a failed build — same fail-open shape as the rest of this
  // app's optional integrations.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  widenClientFileUpload: true,
});
