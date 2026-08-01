"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { CrmMessage, CrmUser } from "@/lib/types";

const BADGE_POLL_MS = 60_000;
const OPEN_POLL_MS = 15_000;

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay)
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * TopBar Messages inbox — the one home for member-to-member chat.
 * The list groups every conversation; opening one shows both sides of the
 * history (crm_messages is readable by both participants) and marks what
 * they sent as read. Notifications stay in the bell; nothing arrives twice.
 */
export function MessagesInbox({ profile }: { profile: CrmUser }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<CrmUser[]>([]);
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [threadWith, setThreadWith] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(createClient);

  const fetchUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from("crm_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .is("read_at", null);
    if (typeof count === "number") setUnread(count);
  }, [supabase, profile.id]);

  const fetchAll = useCallback(async () => {
    const [{ data: msgs }, { data: users }] = await Promise.all([
      supabase
        .from("crm_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(400),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("full_name"),
    ]);
    if (msgs) {
      const list = (msgs as CrmMessage[]).slice().reverse(); // oldest first
      setMessages(list);
      setUnread(list.filter((m) => m.recipient_id === profile.id && !m.read_at).length);
    }
    if (users) setMembers((users as CrmUser[]).filter((u) => u.id !== profile.id));
  }, [supabase, profile.id]);

  useEffect(() => {
    fetchUnreadCount();
    const t = setInterval(fetchUnreadCount, BADGE_POLL_MS);
    return () => clearInterval(t);
  }, [fetchUnreadCount]);

  // keep an open panel fresh so a reply shows up without reopening
  useEffect(() => {
    if (!open) return;
    const t = setInterval(fetchAll, OPEN_POLL_MS);
    return () => clearInterval(t);
  }, [open, fetchAll]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // the newest message should be in view whenever the thread changes
  useEffect(() => {
    if (threadWith && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [threadWith, messages.length]);

  const openPanel = () => {
    setOpen(true);
    setThreadWith(null);
    fetchAll();
  };

  const openThread = async (memberId: string) => {
    setThreadWith(memberId);
    setError(null);
    const hadUnread = messages.some(
      (m) => m.sender_id === memberId && m.recipient_id === profile.id && !m.read_at
    );
    if (!hadUnread) return;
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) =>
        m.sender_id === memberId && m.recipient_id === profile.id && !m.read_at
          ? { ...m, read_at: now }
          : m
      )
    );
    setUnread((c) =>
      Math.max(
        0,
        c -
          messages.filter(
            (m) => m.sender_id === memberId && m.recipient_id === profile.id && !m.read_at
          ).length
      )
    );
    await supabase.rpc("crm_mark_dm_read", { p_from: memberId });
  };

  const send = async () => {
    if (!threadWith || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    const body = draft.trim();
    const { data, error: rpcError } = await supabase.rpc("crm_send_dm", {
      p_to: threadWith,
      p_body: body,
    });
    setSending(false);
    const result = (data ?? {}) as { ok?: boolean; id?: string; error?: string };
    if (rpcError || result.error || !result.ok) {
      setError(rpcError?.message ?? result.error ?? "could not send");
      return;
    }
    setDraft("");
    setMessages((prev) => [
      ...prev,
      {
        id: result.id ?? `local-${Date.now()}`,
        sender_id: profile.id,
        recipient_id: threadWith,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
      },
    ]);
  };

  const conversationWith = (memberId: string) =>
    messages.filter(
      (m) =>
        (m.sender_id === memberId && m.recipient_id === profile.id) ||
        (m.sender_id === profile.id && m.recipient_id === memberId)
    );

  const unreadFrom = (memberId: string) =>
    messages.filter(
      (m) => m.sender_id === memberId && m.recipient_id === profile.id && !m.read_at
    ).length;

  // conversations with history first (newest activity on top), then the rest
  const sortedMembers = [...members].sort((a, b) => {
    const la = conversationWith(a.id).at(-1)?.created_at ?? "";
    const lb = conversationWith(b.id).at(-1)?.created_at ?? "";
    if (la !== lb) return la > lb ? -1 : 1;
    return (a.full_name || a.email).localeCompare(b.full_name || b.email);
  });

  const activeMember = threadWith ? members.find((m) => m.id === threadWith) : null;
  const thread = threadWith ? conversationWith(threadWith) : [];

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label="Messages"
        title="Messages"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`flex size-[40px] items-center justify-center rounded-[4px] transition-colors duration-150 hover:bg-[var(--hover-ghost)] ${
          open ? "bg-[var(--hover-ghost)]" : ""
        }`}
      >
        <Icon name="inbox" size={20} />
      </button>
      {unread > 0 && (
        <span className="pointer-events-none absolute -top-[3px] right-[-3px] flex min-w-[18px] items-center justify-center rounded-[30px] bg-alert px-[6px] font-sans text-[12px] leading-[18px] text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-[44px] z-50 flex h-[520px] w-[380px] flex-col rounded-[8px] border border-line bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
          {/* header */}
          <div className="flex items-center gap-[8px] border-b border-line-soft px-[14px] py-[10px]">
            {activeMember ? (
              <>
                <button
                  type="button"
                  aria-label="Back to conversations"
                  onClick={() => setThreadWith(null)}
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M8.5 2.5L4 7l4.5 4.5" />
                  </svg>
                </button>
                <Avatar
                  name={activeMember.full_name || activeMember.email}
                  src={activeMember.avatar_url}
                  size={28}
                />
                <p className="m-0 min-w-0 flex-1 truncate font-sans text-[15px] font-semibold leading-[22px] text-ink">
                  {activeMember.full_name || activeMember.email}
                </p>
              </>
            ) : (
              <p className="m-0 font-sans text-[17px] font-semibold leading-[24px] text-ink">
                Messages
              </p>
            )}
          </div>

          {/* conversation list */}
          {!activeMember && (
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto py-[6px]">
              {sortedMembers.length === 0 && (
                <p className="m-0 px-[16px] py-[12px] font-sans text-[13px] text-ink-muted">
                  No other active members yet.
                </p>
              )}
              {sortedMembers.map((m) => {
                const last = conversationWith(m.id).at(-1);
                const n = unreadFrom(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openThread(m.id)}
                    className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
                  >
                    <Avatar name={m.full_name || m.email} src={m.avatar_url} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-[8px]">
                        <span className={`truncate font-sans text-[14px] leading-[20px] text-ink ${n > 0 ? "font-semibold" : ""}`}>
                          {m.full_name || m.email}
                        </span>
                        {last && (
                          <span className="shrink-0 font-sans text-[11.5px] leading-[16px] text-ink-muted">
                            {timeLabel(last.created_at)}
                          </span>
                        )}
                      </span>
                      <span className={`block truncate font-sans text-[12.5px] leading-[18px] ${n > 0 ? "font-medium text-ink" : "text-ink-muted"}`}>
                        {last
                          ? `${last.sender_id === profile.id ? "You: " : ""}${last.body}`
                          : "Start a conversation"}
                      </span>
                    </span>
                    {n > 0 && (
                      <span className="flex min-w-[20px] shrink-0 items-center justify-center rounded-[10px] bg-alert px-[6px] font-sans text-[11.5px] leading-[18px] text-white">
                        {n > 9 ? "9+" : n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* thread */}
          {activeMember && (
            <>
              <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-[14px] py-[10px]">
                {thread.length === 0 && (
                  <p className="m-0 py-[12px] text-center font-sans text-[13px] text-ink-muted">
                    No messages yet — say hello.
                  </p>
                )}
                {thread.map((m) => {
                  const mine = m.sender_id === profile.id;
                  return (
                    <div key={m.id} className={`flex pb-[8px] ${mine ? "justify-end" : "justify-start"}`}>
                      <span
                        className={`max-w-[78%] whitespace-pre-wrap break-words rounded-[12px] px-[12px] py-[7px] font-sans text-[13.5px] leading-[19px] ${
                          mine
                            ? "rounded-br-[4px] bg-teal-deep text-white"
                            : "rounded-bl-[4px] bg-canvas text-ink"
                        }`}
                        title={new Date(m.created_at).toLocaleString("en-GB")}
                      >
                        {m.body}
                        <span className={`mt-[2px] block text-right text-[10.5px] leading-[13px] ${mine ? "text-white/70" : "text-ink-muted"}`}>
                          {timeLabel(m.created_at)}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-line-soft p-[10px]">
                {error && <p className="m-0 pb-[6px] font-sans text-[12px] text-alert">{error}</p>}
                <div className="flex items-end gap-[8px]">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder={`Message ${activeMember.full_name || activeMember.email}…`}
                    className="min-h-[38px] w-full resize-none rounded-[6px] border border-line-strong px-[10px] py-[8px] font-sans text-[13px] leading-[19px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
                  />
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={send}
                    className="h-[38px] shrink-0 rounded-[6px] bg-teal-deep px-[14px] font-sans text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
