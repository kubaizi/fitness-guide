import type { NextConfig } from "next";

/**
 * Next.js configuration — deliberately empty.
 *
 * Everything this app does works on Next's defaults, and an empty config is a
 * feature rather than an oversight: each option added here is one more thing
 * that has to be understood before the build can be reasoned about.
 *
 * ── When you WOULD add something ──
 *   images.remotePatterns   to allow next/image to load from another domain.
 *                           Not needed here: gym photos are served from
 *                           apps/web/public/gyms/, i.e. our own origin.
 *   redirects / rewrites    permanent URL moves, or proxying an API.
 *   env                     rarely — .env files are the normal route, and
 *                           SESSION_SECRET is read via process.env directly.
 *
 * ── Why the file is .ts rather than .js ──
 * The `NextConfig` type annotation means a mistyped option is a compile error
 * rather than a setting that is silently ignored — which is the usual way a
 * misspelled config key wastes an afternoon.
 *
 * Note that this file runs in Node during the build, NOT in the browser, and
 * it is not part of the app's module graph.
 */
const nextConfig: NextConfig = {/* config options here */};

// Default export, as Next.js requires — it loads this file by convention and
// reads whatever the default export is.
export default nextConfig;
