"use client";

/** Small in-system message dialog — delivers into the member's Messages inbox. */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";

export function MessageDialog({
  toId,
  toName,
  toAvatar,
  onClose,
  onDone,
}: {
  toId: string;
  toName: string;
  toAvatar?: string | null;
  onClose: () => void;
  onDone: (message: string, tone?: "success" | "alert") => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("crm_send_dm", {
      p_to: toId,
      p_body: text,
    });
    setBusy(false);
    const result = (data ?? {}) as { ok?: boolean; error?: string };
    if (rpcError || result.error) {
      setError(rpcError?.message ?? result.error ?? "failed");
      return;
    }
    onDone(`Message sent to ${toName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center">
      <button
        type="button"
        aria-label="Close message dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30"
      />
      <div className="relative w-[420px] max-w-[calc(100vw-48px)] rounded-[10px] bg-white p-[18px] shadow-[0px_12px_40px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-[10px]">
          <Avatar name={toName} src={toAvatar} size={34} />
          <p className="m-0 min-w-0 flex-1 truncate font-display text-[16px] font-semibold leading-[22px] text-ink">
            Message {toName}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-[28px] shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Write a message… it arrives in their Messages inbox instantly."
          className="mt-[12px] w-full resize-none rounded-[6px] border border-line-strong px-[10px] py-[8px] font-sans text-[13px] leading-[20px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
        />
        <div className="mt-[10px] flex items-center justify-between">
          {error ? <p className="m-0 font-sans text-[12px] text-alert">{error}</p> : <span />}
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={send}
            className="h-[34px] rounded-[4px] bg-teal-deep px-[16px] font-sans text-[14px] text-white transition-opacity disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
