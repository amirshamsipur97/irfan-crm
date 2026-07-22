"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

const inputCls =
  "h-[34px] w-full rounded-[4px] border border-line-strong px-[10px] font-sans text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep";

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Modal composer — sends through the crm-send-email edge function and logs to crm_emails. */
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
  const [toRaw, setToRaw] = useState(to.join(", "));
  const [ccRaw, setCcRaw] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toList = parseEmails(toRaw);
  const ccList = parseEmails(ccRaw);
  const invalid = [...toList, ...ccList].find((e) => !EMAIL_RE.test(e));
  const canSend =
    !sending && toList.length > 0 && !invalid && subject.trim() !== "" && message.trim() !== "";

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

  const matching = suggestions.filter(
    (s) =>
      s.email &&
      !toList.includes(s.email.toLowerCase()) &&
      (toRaw.trim() === "" ||
        s.name.toLowerCase().includes(toRaw.split(",").pop()!.trim().toLowerCase()) ||
        s.email.toLowerCase().includes(toRaw.split(",").pop()!.trim().toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center">
      <button
        type="button"
        aria-label="Close composer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30"
      />
      <div className="relative flex w-[560px] max-w-[calc(100vw-48px)] flex-col rounded-[10px] bg-white shadow-[0px_12px_40px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b border-line px-[20px] py-[14px]">
          <h3 className="m-0 font-display text-[17px] font-semibold leading-[24px] text-ink">
            New email
            {target?.name && (
              <span className="pl-[8px] font-sans text-[13px] font-normal text-ink-muted">
                re: {target.name}
              </span>
            )}
          </h3>
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

        <div className="flex flex-col gap-[10px] px-[20px] py-[16px]">
          <div>
            <label className="block pb-[4px] font-sans text-[12px] text-ink-muted">To</label>
            <input
              value={toRaw}
              onChange={(e) => setToRaw(e.target.value)}
              placeholder="client@example.com, developer@company.com"
              className={inputCls}
            />
            {suggestions.length > 0 && matching.length > 0 && toRaw.trim() !== "" && (
              <div className="mt-[4px] max-h-[130px] overflow-y-auto rounded-[6px] border border-line">
                {matching.slice(0, 6).map((s) => (
                  <button
                    key={`${s.kind}-${s.email}`}
                    type="button"
                    onClick={() => {
                      const parts = parseEmails(toRaw);
                      parts.pop();
                      setToRaw([...parts, s.email].join(", "));
                    }}
                    className="flex w-full items-center justify-between px-[10px] py-[6px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
                  >
                    <span className="min-w-0 truncate font-sans text-[13px] text-ink">
                      {s.name}
                      <span className="pl-[6px] text-ink-muted">{s.email}</span>
                    </span>
                    <span className="shrink-0 pl-[8px] font-sans text-[11px] uppercase tracking-wide text-ink-muted">
                      {s.kind}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block pb-[4px] font-sans text-[12px] text-ink-muted">
              CC (optional)
            </label>
            <input
              value={ccRaw}
              onChange={(e) => setCcRaw(e.target.value)}
              placeholder="cc@irfaninvest.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block pb-[4px] font-sans text-[12px] text-ink-muted">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block pb-[4px] font-sans text-[12px] text-ink-muted">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder={`Hi,\n\n…\n\nBest regards,\n${profile.full_name || ""}`}
              className="w-full resize-y rounded-[4px] border border-line-strong px-[10px] py-[8px] font-sans text-[13px] leading-[20px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
            />
          </div>
          {(invalid || error) && (
            <p className="m-0 font-sans text-[13px] text-alert">
              {invalid ? `Invalid email: ${invalid}` : error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-[20px] py-[12px]">
          <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
            Sends as {profile.full_name || profile.email} · {profile.email}
            <br />
            Replies arrive in your Zoho inbox
          </p>
          <button
            type="button"
            disabled={!canSend}
            onClick={send}
            className="h-[36px] rounded-[4px] bg-teal-deep px-[18px] font-sans text-[14px] text-white transition-opacity disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
