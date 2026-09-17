"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DUPLICATE_PHONE_EVENT } from "@/components/crm/persist";
import { requestCollaboration, type DuplicatePhoneInfo } from "@/app/(app)/crm/collaboration/actions";

/** The terms a member signs when asking to work a client together (version v1). */
export const COLLABORATION_TERMS = [
  "The member who registered this client first stays the owner of the client.",
  "Both of us may follow up with the client once the owner accepts, and we coordinate every contact so the client hears one voice.",
  "Commission on any deal with this client is shared as decided by management.",
  "This request, my signature and the owner's answer are recorded and visible to management.",
];

/**
 * App-wide: listens for a board save that hit the duplicate-phone guard. The
 * attempt is already logged and management already alerted (database). Here
 * the member sees who holds the number and can sign the collaboration
 * agreement and send a request to that owner.
 */
export function DuplicatePhoneHost({ fullName }: { fullName: string }) {
  const [info, setInfo] = useState<DuplicatePhoneInfo | null>(null);

  useEffect(() => {
    const onDup = (e: Event) => setInfo((e as CustomEvent<DuplicatePhoneInfo>).detail);
    window.addEventListener(DUPLICATE_PHONE_EVENT, onDup);
    return () => window.removeEventListener(DUPLICATE_PHONE_EVENT, onDup);
  }, []);

  if (!info) return null;
  return <DuplicatePhoneDialog key={info.attemptId} info={info} fullName={fullName} onClose={() => setInfo(null)} />;
}

function DuplicatePhoneDialog({
  info,
  fullName,
  onClose,
}: {
  info: DuplicatePhoneInfo;
  fullName: string;
  onClose: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | "sent" | "already">(null);
  const [today] = useState(() =>
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSend = agreed && signature.trim().length >= 3 && !saving;

  const send = async () => {
    if (!canSend) return;
    setSaving(true);
    setError(null);
    const result = await requestCollaboration({ attemptId: info.attemptId, message, signature, agreed });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(result.already ? "already" : "sent");
  };

  return (
    <div className="fixed inset-0 z-[97] flex items-center justify-center bg-black/35 p-[16px]" role="dialog" aria-modal="true" aria-label="Phone number already registered">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="thin-scroll relative max-h-[92vh] w-[520px] max-w-full overflow-y-auto rounded-[12px] bg-white shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        {/* alert */}
        <div className="flex items-start gap-[12px] border-b border-line px-[22px] pb-[14px] pt-[18px]">
          <span className="mt-[2px] flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#e2445c]/12 text-[18px]" aria-hidden>
            ☎️
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 font-display text-[18px] font-medium leading-[24px] text-ink">
              This number is already registered
            </h3>
            <p className="m-0 pt-[4px] font-sans text-[13.5px] leading-[20px] text-ink">
              It belongs to a client in <b>{info.boardLabel}</b>, owned by <b>{info.ownerName}</b>. Your change was not
              saved.
            </p>
            <p className="m-0 pt-[4px] font-sans text-[12px] leading-[18px] text-ink-muted">
              Management has been notified that this number was entered again.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[6px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
          >
            ✕
          </button>
        </div>

        <div className="px-[22px] pb-[20px] pt-[14px]">
          {info.isOwn ? (
            <p className="m-0 font-sans text-[13px] text-ink-muted">You already own that client. Open it from your board instead.</p>
          ) : sent ? (
            <div className="rounded-[10px] border border-[#00c875]/40 bg-[#00c875]/8 px-[14px] py-[12px]">
              <p className="m-0 font-sans text-[14px] font-medium text-ink">
                {sent === "already" ? "You already have a request for this client." : `Request sent to ${info.ownerName}.`}
              </p>
              <p className="m-0 pt-[2px] font-sans text-[12.5px] text-ink-muted">
                You will be notified when they answer. Track it on the{" "}
                <Link href="/crm/collaboration" onClick={onClose} className="text-link hover:underline">
                  Collaboration
                </Link>{" "}
                page.
              </p>
            </div>
          ) : !asking ? (
            <div className="flex flex-wrap items-center justify-between gap-[10px]">
              <p className="m-0 font-sans text-[13px] leading-[19px] text-ink-muted">
                Working with this client too? Ask {info.ownerName} for a joint collaboration.
              </p>
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="h-[34px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87]"
              >
                Request collaboration
              </button>
            </div>
          ) : (
            <>
              <h4 className="m-0 pb-[6px] font-display text-[14px] font-semibold text-ink">Request joint collaboration</h4>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={`Message to ${info.ownerName}, e.g. The client called me directly about a 2BHK…`}
                className="w-full resize-none rounded-[6px] border border-line-strong px-[10px] py-[8px] font-sans text-[13px] leading-[19px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
              />

              <div className="mt-[10px] rounded-[8px] border border-line bg-canvas/50 px-[12px] py-[10px]">
                <p className="m-0 pb-[6px] font-sans text-[12.5px] font-semibold text-ink">Collaboration agreement</p>
                <ol className="m-0 list-decimal space-y-[3px] pl-[18px] font-sans text-[12.5px] leading-[18px] text-ink">
                  {COLLABORATION_TERMS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
                <label className="mt-[10px] flex cursor-pointer items-start gap-[8px] font-sans text-[13px] leading-[19px] text-ink">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-[2px] size-[16px] shrink-0 accent-[#00718a]"
                  />
                  I have read and agree to this collaboration agreement.
                </label>
              </div>

              <label className="mt-[10px] block">
                <span className="font-sans text-[12px] text-ink-muted">Signature: type your full name</span>
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder={fullName || "Full name"}
                  className="mt-[3px] h-[40px] w-full rounded-[6px] border border-line-strong px-[10px] font-['Brush_Script_MT','Segoe_Script',cursive] text-[22px] text-ink outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-ink-muted focus:border-teal-deep"
                />
                <span className="font-sans text-[11.5px] text-ink-muted">
                  Signed {today}
                </span>
              </label>

              {error && <p className="m-0 pt-[8px] font-sans text-[13px] text-alert">{error}</p>}

              <div className="mt-[14px] flex justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[34px] rounded-[4px] px-[12px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={send}
                  className="h-[34px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-40"
                >
                  {saving ? "Sending…" : "Sign & send request"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
