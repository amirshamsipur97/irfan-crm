/**
 * The single editable-cell affordance for every board.
 *
 * Cells used to differ per board: some had a click target the size of their
 * text, some gave no hint that they were editable at all, and their editors
 * were small boxes floating inside the cell. This is the shape the Leads board
 * settled on — the whole cell is the target, hovering tints it, and the editor
 * fills the same box so nothing shifts when it opens.
 *
 * Import these instead of writing cell classes by hand.
 */

/** Resting state of an editable cell (a <button> filling the cell). */
export const CELL_BUTTON =
  "flex size-full items-center justify-center truncate rounded-[4px] border border-transparent px-[8px] font-sans text-[14px] leading-[20px] text-ink transition-colors hover:border-line-strong hover:bg-[var(--hover-ghost)]";

/** Same box, in edit mode. */
export const CELL_INPUT =
  "size-full rounded-[4px] border border-teal-deep bg-white px-[8px] text-center font-sans text-[14px] leading-[20px] text-ink outline-none";

/**
 * Cells whose content is a link or chip rather than plain text still want the
 * hover hint, but keep their own inner layout.
 */
export const CELL_HOVER = "transition-colors hover:bg-[var(--hover-ghost)]";
