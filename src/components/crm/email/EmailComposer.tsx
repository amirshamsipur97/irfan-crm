"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { canAnimate } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import type { CrmUser } from "@/lib/types";

export interface EmailTarget {
  /** what this email is about — stored on the log row */
  type?: "contact" | "account" | "lead" | "deal";
  id?: string;
  name?: string;
}

export interface RecipientSuggestion {
  email: string;
  name: string;
  kind: "contact" | "account";
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** label + inline value row, Monday-composer style */
function FieldRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-[46px] items-center gap-[14px] border-b border-line-soft px-[20px] ${className}`}>
      <span className="w-[52px] shrink-0 font-sans text-[14px] leading-[20px] text-ink-muted">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Monday-style email composer — sends through the crm-send-email edge
 * function (Resend; From = the agent's work address, replies go to Zoho)
 * and logs to crm_emails.
 */
export function EmailComposer({
  profile,
  to = [],
  subject: initialSubject = "",
  target,
  suggestions = [],
  onClose,
  onDone,
}: {
  profile: CrmUser;
  to?: string[];
  subject?: string;
  target?: EmailTarget;
  suggestions?: RecipientSuggestion[];
  onClose: () => void;
  onDone: (message: string, tone?: "success" | "alert") => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [toRaw, setToRaw] = useState(to.join(", "));
  const [ccOpen, setCcOpen] = useState(false);
  const [ccRaw, setCcRaw] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toFocused, setToFocused] = useState(false);

  useGSAP(
    () => {
      if (!canAnimate() || !panelRef.current) return;
      gsap.from(panelRef.current, {
        y: 18,
        scale: 0.97,
        opacity: 0,
        duration: 0.28,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: panelRef }
  );

  const toList = parseEmails(toRaw);
  const ccList = parseEmails(ccRaw);
  const invalid = [...toList, ...ccList].find((e) => !EMAIL_RE.test(e));
  const canSend =
    !sending && toList.length > 0 && !invalid && subject.trim() !== "" && message.trim() !== "";

  const senderEmail = profile.sender_email || profile.email;
  const senderName = profile.full_name || profile.email;

  const send = async () => {
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke("crm-send-email", {
      body: {
        to: toList,
        cc: ccList,
        subject: subject.trim(),
        text: message,
        related: target,
      },
    });
    // supabase-js wraps non-2xx in FunctionsHttpError — pull the server message
    if (fnError) {
      let serverMessage = fnError.message;
      const ctx = (fnError as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          serverMessage = (await ctx.json())?.error ?? serverMessage;
        } catch {
          /* keep default */
        }
      }
      setError(serverMessage);
      setSending(false);
      return;
    }
    if ((data as { error?: string })?.error) {
      setError((data as { error: string }).error);
      setSending(false);
      return;
    }
    onDone(`Email sent to ${toList.join(", ")}`);
    onClose();
  };

  const lastToken = toRaw.split(/[,;]/).pop()!.trim().toLowerCase();
  const matching = suggestions.filter(
    (s) =>
      s.email &&
      !toList.includes(s.email.toLowerCase()) &&
      (lastToken === "" ||
        s.name.toLowerCase().includes(lastToken) ||
        s.email.toLowerCase().includes(lastToken))
  );
  const showSuggestions = toFocused && suggestions.length > 0 && matching.length > 0;

  const inputBase =
    "w-full bg-transparent font-sans text-[14px] leading-[20px] text-ink outline-none placeholder:text-ink-muted";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-[24px]">
      <button
        type="button"
        aria-label="Close composer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/35"
      />
      <div
        ref={panelRef}
        className="relative flex max-h-full w-[680px] max-w-full flex-col overflow-hidden rounded-[12px] bg-white shadow-[0px_18px_60px_rgba(0,0,0,0.35)]"
      >
        {/* title bar */}
        <div className="flex items-center justify-between bg-[#f5f6f8] px-[16px] py-[10px]">
          <div className="flex items-center gap-[10px]">
            <span className="flex size-[28px] items-center justify-center rounded-[6px] bg-[#579bfc]">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="3.8" width="14" height="10.4" rx="1.6" />
                <path d="M2.6 4.6L9 9.6l6.4-5" />
              </svg>
            </span>
            <p className="m-0 font-display text-[16px] font-semibold leading-[22px] text-ink">
              Email
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-[28px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* From */}
        <FieldRow label="From">
          <div className="flex items-center gap-[8px]">
            <Avatar name={senderName} src={profile.avatar_url} size={26} />
            <p className="m-0 truncate font-sans text-[14px] leading-[20px] text-ink">
              {senderName}
              <span className="pl-[6px] text-ink-muted">({senderEmail})</span>
            </p>
          </div>
        </FieldRow>

        {/* To */}
        <FieldRow label="To" className="relative">
          <div className="flex items-center gap-[8px]">
            <input
              value={toRaw}
              onChange={(e) => setToRaw(e.target.value)}
              onFocus={() => setToFocused(true)}
              onBlur={() => setTimeout(() => setToFocused(false), 180)}
              placeholder="client@example.com, developer@company.com"
              className={inputBase}
            />
            {!ccOpen && (
              <button
                type="button"
                onClick={() => setCcOpen(true)}
                className="shrink-0 rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)] hover:text-ink"
              >
                CC
              </button>
            )}
          </div>
          {showSuggestions && (
            <div className="absolute inset-x-[20px] top-full z-20 max-h-[168px] overflow-y-auto rounded-[8px] border border-line bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.18)]">
              {matching.slice(0, 6).map((s) => (
                <button
                  key={`${s.kind}-${s.email}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const parts = toRaw.split(/[,;]/).slice(0, -1).map((p) => p.trim()).filter(Boolean);
                    setToRaw([...parts, s.email].join(", "));
                  }}
                  className="flex w-full items-center justify-between px-[12px] py-[7px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  <span className="min-w-0 truncate font-sans text-[13px] text-ink">
                    {s.name}
                    <span className="pl-[6px] text-ink-muted">{s.email}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-[10px] px-[8px] py-px pl-[8px] font-sans text-[11px] uppercase tracking-wide ${
                      s.kind === "account" ? "bg-[#a25ddc]/15 text-[#7a3fb8]" : "bg-cyan-tint text-ink"
                    }`}
                  >
                    {s.kind === "account" ? "developer" : "client"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </FieldRow>

        {/* CC */}
        {ccOpen && (
          <FieldRow label="CC">
            <input
              autoFocus
              value={ccRaw}
              onChange={(e) => setCcRaw(e.target.value)}
              placeholder="cc@irfaninvest.com"
              className={inputBase}
            />
          </FieldRow>
        )}

        {/* Subject */}
        <FieldRow label="Subject">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className={`${inputBase} font-medium`}
          />
        </FieldRow>

        {/* body */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi,\n\n…\n\nBest regards,\n${senderName}`}
          className="thin-scroll min-h-[220px] w-full flex-1 resize-none px-[20px] py-[14px] font-sans text-[14px] leading-[22px] text-ink outline-none placeholder:text-ink-muted"
        />

        {(invalid || error) && (
          <p className="m-0 border-t border-line-soft px-[20px] py-[8px] font-sans text-[13px] text-alert">
            {invalid ? `Invalid email: ${invalid}` : error}
          </p>
        )}

        {/* footer */}
        <div className="flex items-center justify-between border-t border-line px-[16px] py-[10px]">
          <div className="flex min-w-0 items-center gap-[10px]">
            {target?.name && (
              <span className="flex min-w-0 items-center gap-[6px] rounded-[6px] bg-[#eceef2] px-[10px] py-[4px]">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#676879" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="8" cy="4" r="2" />
                  <circle cx="3.5" cy="12" r="2" />
                  <circle cx="12.5" cy="12" r="2" />
                  <path d="M7 5.6L4.4 10M9 5.6l2.6 4.4M5.5 12h5" />
                </svg>
                <span className="truncate font-sans text-[12px] leading-[16px] text-ink">
                  {target.name}
                  <span className="pl-[4px] text-ink-muted">({target.type})</span>
                </span>
              </span>
            )}
            <span className="hidden font-sans text-[12px] leading-[16px] text-ink-muted sm:block">
              Replies go to {senderEmail}
            </span>
          </div>
          <button
            type="button"
            disabled={!canSend}
            onClick={send}
            className={`h-[36px] shrink-0 rounded-[6px] px-[20px] font-sans text-[14px] transition-colors ${
              canSend
                ? "bg-teal-deep text-white hover:bg-[#006e87]"
                : "cursor-default bg-[#eceef2] text-ink-disabled"
            }`}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
