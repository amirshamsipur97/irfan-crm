"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/shell/AppChrome";
import { Avatar } from "@/components/ui/Avatar";
import { TemperaturePill } from "@/components/crm/temperature-pill";
import { activityTime } from "@/components/crm/activities/activities-config";
import { searchPhones, type PhoneHit } from "@/app/(app)/crm/phone-search/actions";
import { MIN_PHONE_DIGITS as MIN_DIGITS, phoneQueryDigits } from "@/lib/phone-search";
import type { CrmUser } from "@/lib/types";

function hitHref(h: PhoneHit) {
  return h.table === "crm_leads" ? `/crm/leads?lead=${h.id}` : `/crm/contacts?contact=${h.id}`;
}

function formatPhone(h: PhoneHit) {
  return [h.country_code, h.phone].filter(Boolean).join(" ") || "—";
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; hits: PhoneHit[]; truncated: boolean; query: string }
  | { kind: "error"; message: string };

/** Admin lookup: type any part of a number, see every lead and contact holding it. */
export function PhoneSearch({
  users,
  search = searchPhones,
}: {
  users: CrmUser[];
  /** the lookup; swapped only by a fixture page */
  search?: typeof searchPhones;
}) {
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const seq = useRef(0);
  const digits = phoneQueryDigits(query);

  const onType = (next: string) => {
    setQuery(next);
    seq.current++; // any answer still in flight is for an older number
    setState({ kind: phoneQueryDigits(next).length < MIN_DIGITS ? "idle" : "loading" });
  };

  // search as the number is typed; only the newest answer is shown
  useEffect(() => {
    if (digits.length < MIN_DIGITS) return;
    const mine = seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await search(digits);
        if (mine !== seq.current) return;
        setState(res.ok ? { kind: "done", hits: res.hits, truncated: res.truncated, query: digits } : { kind: "error", message: res.error });
      } catch {
        if (mine === seq.current) setState({ kind: "error", message: "The search could not reach the server. Check the connection and try again." });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [digits, search]);

  return (
    <Surface>
      <div className="thin-scroll flex h-full flex-col overflow-y-auto">
        <div className="px-[40px] pb-[14px] pt-[20px]">
          <h1 className="m-0 font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">Phone search</h1>
          <p className="m-0 pt-[2px] font-sans text-[13px] text-ink-muted">
            Find every lead and contact that holds a number. Type part of it, with or without the country code.
          </p>
        </div>

        <div className="border-b border-line px-[40px] pb-[16px]">
          <input
            autoFocus
            type="search"
            inputMode="tel"
            value={query}
            onChange={(e) => onType(e.target.value)}
            placeholder="e.g. +968 9123 4567 or 91234567"
            aria-label="Phone number"
            className="h-[40px] w-full max-w-[460px] rounded-[4px] border border-line-strong bg-white px-[12px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
          />
          <p className="m-0 pt-[6px] font-sans text-[12px] text-ink-muted">
            {digits.length > 0 && digits.length < MIN_DIGITS
              ? `Type at least ${MIN_DIGITS} digits`
              : state.kind === "loading"
                ? "Searching…"
                : state.kind === "done"
                  ? `${state.hits.length} ${state.hits.length === 1 ? "match" : "matches"}${state.truncated ? " (showing the newest 50 per board, type more digits to narrow)" : ""}`
                  : "Spaces, dashes and a leading + or 00 are ignored"}
          </p>
        </div>

        {state.kind === "error" && (
          <p className="m-0 px-[40px] py-[20px] font-sans text-[13.5px] text-[#e2445c]">{state.message}</p>
        )}

        {state.kind === "done" && state.hits.length === 0 && (
          <p className="m-0 px-[40px] py-[28px] font-sans text-[13.5px] text-ink-muted">
            No lead or contact has a number containing {state.query}.
          </p>
        )}

        {state.kind === "done" && state.hits.length > 0 && (
          <div className="px-[40px] py-[16px]">
            <div className="overflow-hidden rounded-[8px] border border-line">
              <div className="grid grid-cols-[minmax(170px,1.4fr)_90px_minmax(150px,1fr)_minmax(140px,1fr)_minmax(120px,0.8fr)_100px_130px] gap-[12px] border-b border-line bg-[var(--hover-ghost)] px-[14px] py-[8px] font-sans text-[12px] font-medium text-ink-muted">
                <span>Client</span>
                <span>Board</span>
                <span>Phone</span>
                <span>Owner</span>
                <span>Group</span>
                <span>Temperature</span>
                <span>Added</span>
              </div>
              {state.hits.map((h) => {
                const owner = h.owner_id ? userById.get(h.owner_id) : undefined;
                return (
                  <div
                    key={`${h.table}:${h.id}`}
                    className="grid grid-cols-[minmax(170px,1.4fr)_90px_minmax(150px,1fr)_minmax(140px,1fr)_minmax(120px,0.8fr)_100px_130px] items-center gap-[12px] border-b border-line px-[14px] py-[9px] last:border-b-0"
                  >
                    <div className="min-w-0">
                      <Link href={hitHref(h)} className="block truncate font-sans text-[14px] text-link hover:underline">
                        {h.name || "Unnamed client"}
                      </Link>
                      {(h.converted_contact_id || h.is_archived) && (
                        <p className="m-0 truncate font-sans text-[12px] text-ink-muted">
                          {h.converted_contact_id ? (
                            <Link href={`/crm/contacts?contact=${h.converted_contact_id}`} className="hover:underline">
                              Moved to contact
                            </Link>
                          ) : null}
                          {h.converted_contact_id && h.is_archived ? " · " : null}
                          {h.is_archived ? "Archived" : null}
                        </p>
                      )}
                    </div>
                    <span className="font-sans text-[13px] text-ink">{h.table === "crm_leads" ? "Lead" : "Contact"}</span>
                    <span className="truncate font-sans text-[13px] tabular-nums text-ink" dir="ltr">
                      {formatPhone(h)}
                    </span>
                    <span className="flex min-w-0 items-center gap-[6px]">
                      {owner && <Avatar name={owner.full_name || owner.email} src={owner.avatar_url} size={22} />}
                      <span className="min-w-0 truncate font-sans text-[13px] text-ink">
                        {owner ? owner.full_name || owner.email : "—"}
                      </span>
                    </span>
                    <span className="truncate font-sans text-[13px] text-ink">{h.group_name ?? "—"}</span>
                    <span>
                      <TemperaturePill value={h.temperature} />
                    </span>
                    <span className="font-sans text-[12px] text-ink-muted">{activityTime(h.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Surface>
  );
}
