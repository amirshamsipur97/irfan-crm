"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/shell/AppChrome";
import { Avatar } from "@/components/ui/Avatar";
import { TemperaturePill } from "@/components/crm/temperature-pill";
import { activityTime } from "@/components/crm/activities/activities-config";
import { searchPhones, type PhoneHit } from "@/app/(app)/crm/phone-search/actions";
import { MIN_PHONE_DIGITS as MIN_DIGITS, phoneQueryDigits } from "@/lib/phone-search";
import { downloadXlsx } from "@/lib/xlsx";
import type { CrmUser } from "@/lib/types";
import { phoneFileName, phoneSheet } from "./phone-export";

function hitHref(h: PhoneHit) {
  return h.table === "crm_leads" ? `/crm/leads?lead=${h.id}` : `/crm/contacts?contact=${h.id}`;
}

function formatPhone(h: PhoneHit) {
  return [h.country_code, h.phone].filter(Boolean).join(" ") || "—";
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; hits: PhoneHit[]; truncated: boolean }
  | { kind: "error"; message: string };

const GRID =
  "grid grid-cols-[minmax(170px,1.4fr)_90px_minmax(150px,1fr)_minmax(140px,1fr)_minmax(120px,0.8fr)_100px_130px] gap-[12px]";

/**
 * Admin lookup: type any part of a number, or pick an agent to list every
 * number they hold (the digits then narrow it). The Excel file is exactly the
 * rows on screen.
 */
export function PhoneSearch({
  users,
  search = searchPhones,
}: {
  users: CrmUser[];
  /** the lookup; swapped only by a fixture page */
  search?: typeof searchPhones;
}) {
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  // active members first; a deactivated agent can still own clients, so they stay pickable
  const agents = useMemo(
    () =>
      [...users].sort(
        (a, b) => Number(b.is_active) - Number(a.is_active) || (a.full_name || a.email).localeCompare(b.full_name || b.email)
      ),
    [users]
  );
  const [query, setQuery] = useState("");
  const [agentId, setAgentId] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const seq = useRef(0);
  const digits = phoneQueryDigits(query);
  const active = Boolean(agentId) || digits.length >= MIN_DIGITS;
  const agent = agentId ? userById.get(agentId) : undefined;

  const onChange = (nextQuery: string, nextAgent: string) => {
    setQuery(nextQuery);
    setAgentId(nextAgent);
    seq.current++; // any answer still in flight is for an older search
    const willSearch = Boolean(nextAgent) || phoneQueryDigits(nextQuery).length >= MIN_DIGITS;
    setState({ kind: willSearch ? "loading" : "idle" });
  };

  // search as the number is typed; only the newest answer is shown
  useEffect(() => {
    if (!active) return;
    const mine = seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await search({ query: digits, agentId: agentId || null });
        if (mine !== seq.current) return;
        setState(res.ok ? { kind: "done", hits: res.hits, truncated: res.truncated } : { kind: "error", message: res.error });
      } catch {
        if (mine === seq.current) setState({ kind: "error", message: "The search could not reach the server. Check the connection and try again." });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [active, digits, agentId, search]);

  const hits = state.kind === "done" ? state.hits : [];
  const leadCount = hits.filter((h) => h.table === "crm_leads").length;
  const contactCount = hits.length - leadCount;

  const status =
    digits.length > 0 && digits.length < MIN_DIGITS && !agentId
      ? `Type at least ${MIN_DIGITS} digits, or pick an agent`
      : state.kind === "loading"
        ? "Searching…"
        : state.kind === "done"
          ? `${hits.length} ${hits.length === 1 ? "number" : "numbers"} · ${contactCount} in Contacts · ${leadCount} in Leads${
              state.truncated ? " (showing the newest per board, type more digits to narrow)" : ""
            }`
          : "Spaces, dashes and a leading + or 00 are ignored";

  return (
    <Surface>
      <div className="thin-scroll flex h-full flex-col overflow-y-auto">
        <div className="px-[40px] pb-[14px] pt-[20px]">
          <h1 className="m-0 font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">Phone search</h1>
          <p className="m-0 pt-[2px] font-sans text-[13px] text-ink-muted">
            Find every lead and contact that holds a number, or pick an agent to see all of their numbers and export them.
          </p>
        </div>

        <div className="border-b border-line px-[40px] pb-[16px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            <input
              autoFocus
              type="search"
              inputMode="tel"
              value={query}
              onChange={(e) => onChange(e.target.value, agentId)}
              placeholder="e.g. +968 9123 4567 or 91234567"
              aria-label="Phone number"
              className="h-[40px] w-full max-w-[380px] rounded-[4px] border border-line-strong bg-white px-[12px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
            />
            <select
              value={agentId}
              onChange={(e) => onChange(query, e.target.value)}
              aria-label="Agent"
              className="h-[40px] min-w-[220px] rounded-[4px] border border-line-strong bg-white px-[10px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
            >
              <option value="">All agents</option>
              {agents.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.full_name || u.email) + (u.is_active ? "" : " (inactive)")}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={state.kind !== "done" || hits.length === 0}
              onClick={() => downloadXlsx(phoneFileName(agent, digits), [phoneSheet(hits, userById)])}
              className="flex h-[40px] items-center rounded-[4px] bg-teal-deep px-[16px] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Excel
            </button>
          </div>
          <p className="m-0 pt-[6px] font-sans text-[12px] text-ink-muted">{status}</p>
        </div>

        {state.kind === "error" && (
          <p className="m-0 px-[40px] py-[20px] font-sans text-[13.5px] text-[#e2445c]">{state.message}</p>
        )}

        {state.kind === "done" && hits.length === 0 && (
          <p className="m-0 px-[40px] py-[28px] font-sans text-[13.5px] text-ink-muted">
            {agent
              ? `${agent.full_name || agent.email} has no numbers${digits.length >= MIN_DIGITS ? ` containing ${digits}` : ""}.`
              : `No lead or contact has a number containing ${digits}.`}
          </p>
        )}

        {hits.length > 0 && (
          <div className="px-[40px] py-[16px]">
            <div className="overflow-hidden rounded-[8px] border border-line">
              <div className={`${GRID} border-b border-line bg-[var(--hover-ghost)] px-[14px] py-[8px] font-sans text-[12px] font-medium text-ink-muted`}>
                <span>Client</span>
                <span>Board</span>
                <span>Phone</span>
                <span>Owner</span>
                <span>Group</span>
                <span>Temperature</span>
                <span>Added</span>
              </div>
              {hits.map((h) => {
                const owner = h.owner_id ? userById.get(h.owner_id) : undefined;
                return (
                  <div key={`${h.table}:${h.id}`} className={`${GRID} items-center border-b border-line px-[14px] py-[9px] last:border-b-0`}>
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
