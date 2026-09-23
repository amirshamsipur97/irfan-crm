import type { NextConfig } from "next";

/**
 * Security headers for every response.
 *
 * The CRM holds a real client book, and it shipped with none of these: it could
 * be framed by any page (a click-jacked "Delete group" is one invisible iframe
 * away), browsers were free to sniff content types, and full URLs leaked to
 * third parties through the referrer. HSTS keeps the session cookie off plain
 * http. The CSP here is deliberately narrow: frame-ancestors only, because a
 * full policy has to be measured against the app's own inline styles first.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    // Client-cache page segments so board-to-board navigation is instant.
    // Server actions still revalidatePath, and boards keep optimistic local
    // state, so 30s of staleness is never user-visible.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
