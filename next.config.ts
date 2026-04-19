import type { NextConfig } from "next";

const analyticsScriptOrigin = "https://www.googletagmanager.com";
const analyticsConnectOrigin = "https://www.google-analytics.com";
const analyticsRegionConnectOrigin = "https://region1.google-analytics.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin =
  supabaseUrl && URL.canParse(supabaseUrl) ? new URL(supabaseUrl).origin : null;

const connectSrc = [
  "'self'",
  analyticsScriptOrigin,
  analyticsConnectOrigin,
  analyticsRegionConnectOrigin,
  ...(supabaseOrigin ? [supabaseOrigin] : []),
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  `script-src 'self' ${analyticsScriptOrigin}`,
  `connect-src ${connectSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
