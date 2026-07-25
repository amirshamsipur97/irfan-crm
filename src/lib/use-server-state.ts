"use client";

import { useState } from "react";

/**
 * Board state that is seeded from the server and re-adopts the server value
 * whenever the page re-renders with fresh data (after a server action calls
 * `revalidatePath`), while local optimistic edits stay in charge in between.
 *
 * The boards used `useEffect(() => setLocalRows(rows), [rows])` for this, which
 * renders the stale list once, commits, then renders again — visible as a flash
 * on slower machines, and flagged by react-hooks/set-state-in-effect. Adjusting
 * state during render is the pattern React documents for exactly this case: the
 * re-render happens before the browser paints, so nothing stale is shown.
 *
 * @see https://react.dev/reference/react/useState#storing-information-from-previous-renders
 */
export function useServerState<T>(serverValue: T) {
  const [value, setValue] = useState(serverValue);
  const [synced, setSynced] = useState(serverValue);

  if (serverValue !== synced) {
    setSynced(serverValue);
    setValue(serverValue);
  }

  return [value, setValue] as const;
}
