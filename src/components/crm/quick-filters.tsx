"use client";

/**
 * Monday-style "Quick filters" for every board: the toolbar Filter button opens
 * a panel of per-column value chips with live counts. Selections within a
 * column OR together; across columns they AND. Boards declare their dimensions
 * and run rows through applyQuickFilters().
 */

import { useState } from "react";

export const BLANK = "__blank__";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface QuickFilterDim<T = any> {
  key: string;
  label: string;
  get: (row: T) => string | string[] | null | undefined;
  /** display label for a raw value (defaults to the value itself) */
  format?: (value: string) => string;
  /** dot color shown next to the value chip */
  color?: (value: string) => string | undefined;
}

export type QuickFilterState = Record<string, string[]>;

export interface QuickFiltersProp {
  dims: QuickFilterDim[];
  rows: any[];
  state: QuickFilterState;
  onToggle: (dimKey: string, value: string) => void;
  onClear: () => void;
  /** rows currently shown after ALL board filters */
  visible: number;
  /** e.g. "deals" — used in the "Showing X of N deals" line */
  noun: string;
}

function rowValues<T>(dim: QuickFilterDim<T>, row: T): string[] {
  const v = dim.get(row);
  if (v == null || v === "") return [BLANK];
  if (Array.isArray(v)) return v.length ? v.map(String) : [BLANK];
  return [String(v)];
}

export function applyQuickFilters<T>(
  rows: T[],
  dims: QuickFilterDim<T>[],
  state: QuickFilterState
): T[] {
  const active = Object.entries(state).filter(([, vals]) => vals.length > 0);
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(([key, vals]) => {
      const dim = dims.find((d) => d.key === key);
      if (!dim) return true;
      return rowValues(dim, row).some((v) => vals.includes(v));
    })
  );
}

/** Local state helper so each board wires the panel with one line. */
export function useQuickFilters() {
  const [state, setState] = useState<QuickFilterState>({});
  const toggle = (dimKey: string, value: string) =>
    setState((prev) => {
      const cur = prev[dimKey] ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [dimKey]: next };
    });
  const clear = () => setState({});
  const activeCount = Object.values(state).reduce((s, v) => s + v.length, 0);
  return { state, toggle, clear, activeCount };
}

export function countActiveFilters(state: QuickFilterState) {
  return Object.values(state).reduce((s, v) => s + v.length, 0);
}

/** The dropdown panel — render inside a relative wrapper under the Filter chip. */
export function QuickFiltersPanel({
  dims,
  rows,
  state,
  onToggle,
  onClear,
  visible,
  noun,
}: QuickFiltersProp) {
  const total = rows.length;
  const anyActive = countActiveFilters(state) > 0;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%-8px)] z-50 rounded-[8px] border border-line bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between px-[20px] pb-[6px] pt-[14px]">
        <p className="m-0 font-sans text-[15px] leading-[22px] text-ink">
          <span className="font-semibold">Quick filters</span>
          <span className="pl-[8px] text-[13px] text-ink-muted">
            {anyActive ? `Showing ${visible} of ${total} ${noun}` : `Showing all of ${total} ${noun}`}
          </span>
        </p>
        <button
          type="button"
          disabled={!anyActive}
          onClick={onClear}
          className="rounded-[4px] px-[8px] py-[3px] font-sans text-[13px] text-[#00a0a0] transition-colors hover:bg-[var(--hover-ghost)] disabled:cursor-default disabled:text-ink-disabled"
        >
          Clear all
        </button>
      </div>
      <p className="m-0 px-[20px] pb-[6px] font-sans text-[13px] font-semibold text-ink">
        All columns
      </p>
      <div className="thin-scroll flex gap-[18px] overflow-x-auto px-[20px] pb-[18px]">
        {dims.map((dim) => {
          const counts = new Map<string, number>();
          for (const row of rows) {
            for (const v of rowValues(dim, row)) counts.set(v, (counts.get(v) ?? 0) + 1);
          }
          const values = [...counts.entries()].sort((a, b) => {
            if (a[0] === BLANK) return 1;
            if (b[0] === BLANK) return -1;
            return b[1] - a[1] || a[0].localeCompare(b[0]);
          });
          const selected = state[dim.key] ?? [];
          return (
            <div key={dim.key} className="w-[172px] shrink-0">
              <p className="m-0 pb-[8px] font-sans text-[13px] leading-[18px] text-ink-muted">
                {dim.label}
              </p>
              <div className="thin-scroll flex max-h-[240px] flex-col gap-[4px] overflow-y-auto pr-[2px]">
                {values.map(([value, count]) => {
                  const active = selected.includes(value);
                  const label = value === BLANK ? "Blank" : dim.format?.(value) ?? value;
                  const dot = value === BLANK ? undefined : dim.color?.(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onToggle(dim.key, value)}
                      className={`flex h-[32px] shrink-0 items-center justify-between rounded-[4px] border px-[8px] text-left transition-colors ${
                        active
                          ? "border-[#00a0a0] bg-[#00a0a0]/10"
                          : "border-line bg-canvas hover:bg-[var(--hover-ghost)]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-[6px]">
                        {dot && (
                          <span
                            className="size-[8px] shrink-0 rounded-full"
                            style={{ backgroundColor: dot }}
                          />
                        )}
                        <span
                          className={`truncate font-sans text-[13px] leading-[18px] ${
                            value === BLANK ? "text-ink-muted" : "text-ink"
                          }`}
                        >
                          {label}
                        </span>
                      </span>
                      <span className="pl-[6px] font-sans text-[12px] text-ink-muted">{count}</span>
                    </button>
                  );
                })}
                {values.length === 0 && (
                  <p className="m-0 font-sans text-[12px] text-ink-muted">No values</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
