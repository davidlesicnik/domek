import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isProduction = process.env.NODE_ENV === "production";
const connectSrc = ["'self'"].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  "img-src 'self' data: blob: https:",
  `script-src 'self' 'unsafe-inline' ${isProduction ? "" : "'unsafe-eval' "}`.replace(
    /\s+/g,
    " ",
  ).trim(),
  `connect-src ${connectSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
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

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "edge-pouring-poster.ngrok-free.dev",
    "192.168.10.119",
  ],
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./content/**", "./messages/**"],
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
