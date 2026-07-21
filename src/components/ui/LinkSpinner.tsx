"use client";

import { useLinkStatus } from "next/link";

/**
 * Immediate feedback while a <Link> navigation is in flight.
 * Must be rendered as a child of the Link it reports on.
 * (Replaces route loading.tsx skeletons — a Suspense boundary from loading.tsx
 * broke hydration testing in the embedded pane; this has no such boundary.)
 */
export function LinkSpinner({ className = "ml-auto" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className={`inline-block size-[12px] shrink-0 animate-spin rounded-full border-2 border-teal-deep border-t-transparent ${className}`}
    />
  );
}
