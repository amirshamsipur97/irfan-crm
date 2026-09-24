/** Fewer digits than this matches half the book, so the search waits for more. */
export const MIN_PHONE_DIGITS = 4;

/** Digits only, and "00968…" is the same as "+968…" (the stored key drops both). */
export function phoneQueryDigits(query: string): string {
  return query.replace(/\D/g, "").replace(/^00/, "");
}
