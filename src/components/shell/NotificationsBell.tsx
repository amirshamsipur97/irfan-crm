"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { CrmNotification, CrmUser, NotificationType } from "@/lib/types";

const POLL_MS = 60_000;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Today / Yesterday / date — Monday-style day sections. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/** board chip from the notification link, e.g. /crm/deals -> Deals */
function boardChip(link: string | null): string | null {
  if (!link) return null;
  const seg = link.split("/").filter(Boolean)[1];
  if (!seg) return null;
  const names: Record<string, string> = {
    leads: "Leads",
    deals: "Deals",
    contacts: "Contacts",
    accounts: "Accounts",
    projects: "Client Projects",
    activities: "Activities",
    developments: "Developments",
    units: "Units",
    viewings: "Viewings",
    emails: "Emails",
  };
  return names[seg] ?? null;
}

const TYPE_STYLE: Record<NotificationType, { bg: string; glyph: React.ReactNode }> = {
  assigned: {
    bg: "#00a0a0",
    glyph: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="2.6" />
        <path d="M2.8 13.4c.9-2.3 2.8-3.5 5.2-3.5s4.3 1.2 5.2 3.5" />
      </svg>
    ),
  },
  stage: {
    bg: "#a25ddc",
    glyph: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 14V2.5" />
        <path d="M3.5 3h8.6l-2 3 2 3H3.5" />
      </svg>
    ),
  },
  reservation: {
    bg: "#fdab3d",
    glyph: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 4.8V8l2.2 1.6" />
      </svg>
    ),
  },
  offer: {
    bg: "#0086c0",
    glyph: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 1.8h5.2L12 4.6v9.6H4z" />
        <path d="M6 7h4M6 9.5h4" />
      </svg>
    ),
  },
  role: {
    bg: "#00c875",
    glyph: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.8l4.8 1.8v3.6c0 3.2-2 5.6-4.8 6.9-2.8-1.3-4.8-3.7-4.8-6.9V3.6z" />
        <path d="M5.8 8l1.5 1.5L10.4 6.4" />
      </svg>
    ),
  },
  message: {
    bg: "#579bfc",
    glyph: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3.5h12v7.5H8.5L5 13.8v-2.8H2z" />
      </svg>
    ),
  },
};

function rowText(n: CrmNotification) {
  if (n.actor_name) return `${n.actor_name} ${n.title}`;
  return n.title.charAt(0).toUpperCase() + n.title.slice(1);
}

const TABS = [
  { key: "all", label: "All" },
  { key: "message", label: "Messages" },
  { key: "assigned", label: "Assigned to me" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function NotificationsBell({ profile }: { profile: CrmUser }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [msgTo, setMsgTo] = useState("");
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [members, setMembers] = useState<CrmUser[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const fetchCount = useCallback(async () => {
    const { count } = await supabase
      .from("crm_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (typeof count === "number") setUnread(count);
  }, [supabase]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (data) {
      setItems(data as CrmNotification[]);
      setUnread((data as CrmNotification[]).filter((n) => !n.read_at).length);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(t);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    if (!composeOpen || members.length > 0) return;
    supabase
      .from("crm_users")
      .select("*")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => setMembers((data ?? []) as CrmUser[]));
  }, [composeOpen, members.length, supabase]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const markRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)));
      setUnread((c) => Math.max(0, c - 1));
      await supabase.from("crm_notifications").update({ read_at: now }).eq("id", id).is("read_at", null);
    },
    [supabase]
  );

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnread(0);
    await supabase.from("crm_notifications").update({ read_at: now }).is("read_at", null);
  }, [supabase]);

  const sendMessage = async () => {
    setMsgBusy(true);
    setMsgError(null);
    const { data, error } = await supabase.rpc("crm_send_message", {
      p_to: msgTo,
      p_text: msgText,
    });
    setMsgBusy(false);
    const result = (data ?? {}) as { ok?: boolean; error?: string };
    if (error || result.error) {
      setMsgError(error?.message ?? result.error ?? "failed");
      return;
    }
    setComposeOpen(false);
    setMsgTo("");
    setMsgText("");
  };

  const q = search.trim().toLowerCase();
  const visible = items.filter(
    (n) =>
      (tab === "all" || n.type === tab) &&
      (!unreadOnly || !n.read_at) &&
      (!q ||
        rowText(n).toLowerCase().includes(q) ||
        (n.body ?? "").toLowerCase().includes(q) ||
        (boardChip(n.link) ?? "").toLowerCase().includes(q))
  );

  const teammates = members.filter((m) => m.id !== profile.id && m.is_active);

  let lastDay = "";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={`flex size-[40px] items-center justify-center rounded-[4px] hover:bg-[var(--hover-ghost)] ${
          open ? "bg-[var(--hover-ghost)]" : ""
        }`}
      >
        <Icon name="bell" size={20} />
      </button>
      {unread > 0 && (
        <span className="pointer-events-none absolute -top-[3px] right-[-3px] flex min-w-[18px] items-center justify-center rounded-[30px] bg-alert px-[6px] font-sans text-[12px] leading-[18px] text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-[44px] z-50 flex w-[520px] flex-col rounded-[8px] border border-line bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
          {/* header */}
          <div className="flex items-center justify-between px-[16px] pb-[4px] pt-[12px]">
            <p className="font-sans text-[18px] font-semibold leading-[26px] text-ink">
              Notifications
            </p>
            <div className="flex items-center gap-[4px]">
              <button
                type="button"
                onClick={() => setComposeOpen((v) => !v)}
                className={`rounded-[4px] px-[8px] py-[3px] font-sans text-[13px] transition-colors ${
                  composeOpen
                    ? "bg-[var(--active-nav)] text-ink"
                    : "text-[#00a0a0] hover:bg-[var(--hover-ghost)]"
                }`}
              >
                New message
              </button>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-[4px] px-[8px] py-[3px] font-sans text-[13px] text-[#00a0a0] hover:bg-[var(--hover-ghost)]"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* message composer */}
          {composeOpen && (
            <div className="mx-[16px] mb-[6px] rounded-[8px] border border-line bg-canvas p-[10px]">
              <select
                value={msgTo}
                onChange={(e) => setMsgTo(e.target.value)}
                className="h-[32px] w-full rounded-[4px] border border-line-strong bg-white px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
              >
                <option value="">Send a message to…</option>
                {teammates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                rows={2}
                placeholder="Write a message…"
                className="mt-[6px] w-full resize-none rounded-[4px] border border-line-strong bg-white px-[8px] py-[6px] font-sans text-[13px] leading-[19px] text-ink outline-none focus:border-teal-deep"
              />
              <div className="mt-[6px] flex items-center justify-between">
                {msgError ? (
                  <p className="m-0 font-sans text-[12px] text-alert">{msgError}</p>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={msgBusy || !msgTo || !msgText.trim()}
                  onClick={sendMessage}
                  className="h-[30px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
                >
                  {msgBusy ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* tabs */}
          <div className="flex gap-[16px] border-b border-line-soft px-[16px]">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 pb-[6px] pt-[4px] font-sans text-[13px] leading-[20px] ${
                  tab === t.key
                    ? "border-[#00a0a0] font-medium text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* search + unread toggle */}
          <div className="flex items-center gap-[10px] px-[16px] py-[8px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications by people, boards, and more…"
              className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-line-strong px-[10px] font-sans text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
            />
            <button
              type="button"
              role="switch"
              aria-checked={unreadOnly}
              onClick={() => setUnreadOnly((v) => !v)}
              className="flex shrink-0 items-center gap-[6px]"
            >
              <span
                className={`flex h-[16px] w-[28px] items-center rounded-[100px] p-[2px] transition-colors ${
                  unreadOnly ? "bg-[#00a0a0]" : "bg-line-strong"
                }`}
              >
                <span
                  className={`block size-[12px] rounded-full bg-white transition-transform ${
                    unreadOnly ? "translate-x-[12px]" : ""
                  }`}
                />
              </span>
              <span className="font-sans text-[13px] text-ink">Unread only</span>
            </button>
          </div>

          {/* list */}
          <div className="max-h-[440px] overflow-y-auto pb-[6px]">
            {loading && items.length === 0 ? (
              <p className="px-[16px] py-[24px] text-center font-sans text-[13px] text-ink-muted">
                Loading…
              </p>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-[6px] px-[16px] py-[32px]">
                <span className="flex size-[40px] items-center justify-center rounded-full bg-[#eceef2]">
                  <Icon name="bell" size={20} />
                </span>
                <p className="font-sans text-[13px] leading-[20px] text-ink-muted">
                  {unreadOnly || q || tab !== "all"
                    ? "Nothing matches these filters"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              visible.map((n) => {
                const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.assigned;
                const chip = boardChip(n.link);
                const day = dayLabel(n.created_at);
                const showDay = day !== lastDay;
                lastDay = day;
                return (
                  <div key={n.id}>
                    {showDay && (
                      <p className="m-0 px-[16px] pb-[2px] pt-[10px] font-sans text-[12px] font-semibold text-ink-muted">
                        {day}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read_at) markRead(n.id);
                        if (n.link) {
                          setOpen(false);
                          router.push(n.link);
                        }
                      }}
                      className={`flex w-full items-start gap-[10px] px-[16px] py-[10px] text-left hover:bg-[var(--hover-ghost)] ${
                        n.read_at ? "" : "bg-[rgba(0,160,160,0.06)]"
                      }`}
                    >
                      <span className="relative mt-px shrink-0">
                        {n.actor_name ? (
                          <Avatar name={n.actor_name} size={30} />
                        ) : (
                          <span
                            className="flex size-[30px] items-center justify-center rounded-full"
                            style={{ background: style.bg }}
                          >
                            {style.glyph}
                          </span>
                        )}
                        <span
                          className="absolute -bottom-[2px] -right-[2px] flex size-[14px] items-center justify-center rounded-full border border-white"
                          style={{ background: style.bg }}
                        >
                          <span className="scale-[0.6]">{style.glyph}</span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[13px] leading-[19px] text-ink">
                          <span className="font-medium">{rowText(n)}</span>
                          {n.level !== "info" && (
                            <span
                              className={`pl-[6px] font-medium ${
                                n.level === "critical" ? "text-alert" : "text-[#e2445c]"
                              }`}
                            >
                              ⚠ Notice
                            </span>
                          )}
                        </span>
                        {n.body && (
                          <span
                            className={`mt-px block font-sans text-[13px] leading-[19px] text-ink ${
                              n.type === "message" ? "whitespace-pre-wrap" : "truncate font-medium"
                            }`}
                          >
                            {n.body}
                          </span>
                        )}
                        <span className="mt-[3px] flex items-center gap-[8px]">
                          {chip && (
                            <span className="rounded-[10px] bg-[#eceef2] px-[8px] py-px font-sans text-[11px] leading-[16px] text-ink">
                              {chip}
                            </span>
                          )}
                          <span className="font-sans text-[12px] leading-[16px] text-ink-muted">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </span>
                      {!n.read_at && (
                        <span className="mt-[6px] size-[8px] shrink-0 rounded-full bg-[#00a0a0]" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
