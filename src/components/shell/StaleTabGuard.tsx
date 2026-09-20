"use client";

import { useEffect } from "react";

/** one automatic recovery per tab per minute — never a reload loop */
const COOLDOWN_MS = 60_000;
const KEY = "crm:last-stale-reload";

/**
 * The CRM is left open all day, and a deploy replaces the build it was loaded
 * from: its script chunks stop existing under those names. The tab then dies in
 * a way that looks like "the site went down" — a board never finishes loading,
 * or a click does nothing at all.
 *
 * This listens for exactly that failure (a /_next/static asset that will not
 * load, or a chunk import that rejects) and reloads the page once, which pulls
 * the current build. Guarded by a one-minute cooldown in sessionStorage, so a
 * genuinely broken asset can never put the tab in a reload loop.
 *
 * It is the safety net, not the fix: Skew Protection on the Vercel project is
 * what keeps an open tab talking to the build it was served.
 */
export function StaleTabGuard() {
  useEffect(() => {
    const recover = (why: string) => {
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(KEY) ?? 0);
      } catch {
        // private windows can refuse storage; one reload is still better than a dead tab
      }
      if (Date.now() - last < COOLDOWN_MS) return;
      try {
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {}
      console.warn(`[crm] reloading: ${why}`);
      window.location.reload();
    };

    // a <script>/<link> for this build that the server no longer has
    const onAssetError = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el || (el.tagName !== "SCRIPT" && el.tagName !== "LINK")) return;
      const url = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href || "";
      if (url.includes("/_next/static/")) recover(`asset missing (${url})`);
    };

    // a lazy import that cannot be fetched any more
    const onRejection = (e: PromiseRejectionEvent) => {
      const message = String((e.reason as { message?: string })?.message ?? e.reason ?? "");
      if (
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk") ||
        message.includes("dynamically imported module")
      ) {
        recover(message);
      }
    };

    window.addEventListener("error", onAssetError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onAssetError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
