/**
 * Entrance animations are an enhancement — never run them when the tab is
 * hidden (rAF is paused there, which would freeze content at opacity 0).
 */
export function canAnimate(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}
