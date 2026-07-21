"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { CrmNotification, NotificationType } from "@/lib/types";

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
};

function rowText(n: CrmNotification) {
  if (n.actor_name) return `${n.actor_name} ${n.title}`;
  // system rows (cron expiry etc.) already read as full sentences
  return n.title.charAt(0).toUpperCase() + n.title.slice(1);
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
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
      .limit(40);
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

  const visible = tab === "unread" ? items.filter((n) => !n.read_at) : items;

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
        <div className="absolute right-0 top-[44px] z-50 flex w-[420px] flex-col rounded-[8px] border border-line bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between px-[16px] pb-[4px] pt-[12px]">
            <p className="font-sans text-[16px] font-semibold leading-[24px] text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-[4px] px-[6px] py-[2px] font-sans text-[13px] leading-[20px] text-[#00a0a0] hover:bg-[var(--hover-ghost)]"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="flex gap-[16px] border-b border-line-soft px-[16px]">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 pb-[6px] pt-[4px] font-sans text-[13px] leading-[20px] capitalize ${
                  tab === t
                    ? "border-[#00a0a0] font-medium text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-[440px] overflow-y-auto py-[4px]">
            {loading && items.length === 0 ? (
              <p className="px-[16px] py-[24px] text-center font-sans text-[13px] text-ink-muted">Loading…</p>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-[6px] px-[16px] py-[32px]">
                <span className="flex size-[40px] items-center justify-center rounded-full bg-[#eceef2]">
                  <Icon name="bell" size={20} />
                </span>
                <p className="font-sans text-[13px] leading-[20px] text-ink-muted">
                  {tab === "unread" ? "You're all caught up" : "No notifications yet"}
                </p>
              </div>
            ) : (
              visible.map((n) => {
                const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.assigned;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.read_at) markRead(n.id);
                      setOpen(false);
                      if (n.link) router.push(n.link);
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
                      <span className="block font-sans text-[13px] leading-[19px] text-ink">{rowText(n)}</span>
                      {n.body && (
                        <span className="mt-px block truncate font-sans text-[13px] font-medium leading-[19px] text-ink">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-[2px] block font-sans text-[12px] leading-[16px] text-ink-muted">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {!n.read_at && <span className="mt-[6px] size-[8px] shrink-0 rounded-full bg-[#00a0a0]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
