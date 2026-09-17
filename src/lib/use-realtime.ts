"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, unknown>;

/**
 * Listen to INSERT / UPDATE / DELETE on a public table. Realtime applies the
 * table's SELECT policy per subscriber, so a member only hears about rows
 * they could read anyway. The latest `onChange` is always the one called, so
 * callers can pass an inline function without resubscribing every render.
 *
 * A DELETE payload carries only the primary key in `old` (default replica
 * identity) — match deletes by id.
 */
export function useRealtimeTable(
  table: string,
  onChange: (payload: RealtimePostgresChangesPayload<Row>) => void,
  enabled = true
) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) =>
        handler.current(payload as RealtimePostgresChangesPayload<Row>)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, enabled]);
}

/** A trailing debounce for realtime bursts (one save can touch several rows). */
export function useDebounced(fn: () => void, ms = 300) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(), ms);
  };
}
