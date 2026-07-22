"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Surface } from "@/components/shell/AppChrome";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { EmailComposer, type RecipientSuggestion } from "./EmailComposer";
import type { CrmEmail, CrmUser } from "@/lib/types";

const STATUS_META: Record<CrmEmail["status"], { label: string; color: string }> = {
  sent: { label: "Sent", color: "#00c875" },
  failed: { label: "Failed", color: "#e2445c" },
  queued: { label: "Queued", color: "#fdab3d" },
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailsView({
  profile,
  emails,
  suggestions,
}: {
  profile: CrmUser;
  emails: CrmEmail[];
  suggestions: RecipientSuggestion[];
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Surface>
      <div className="thin-scroll h-full overflow-auto px-[32px] pb-[48px] pt-[24px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="m-0 font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
              Emails
            </h1>
            <p className="mb-0 mt-[2px] font-sans text-[13px] text-ink-muted">
              Send emails to clients and developers as {profile.email} — replies arrive in your
              Zoho inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="h-[36px] rounded-[4px] bg-teal-deep px-[16px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87]"
          >
            New email
          </button>
        </div>

        <div className="mt-[20px] overflow-x-auto rounded-[8px] border border-line bg-white">
          <table className="w-full min-w-[860px] border-collapse font-sans text-[13.5px]">
            <thead>
              <tr>
                {["Sent", "From", "To", "Subject", "About", "Status"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-line bg-canvas px-[14px] py-[10px] text-left text-[12px] font-bold text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-[14px] py-[28px] text-center text-ink-muted">
                    No emails yet — send your first one with “New email”, or from a contact’s
                    panel.
                  </td>
                </tr>
              )}
              {emails.map((e) => {
                const meta = STATUS_META[e.status];
                const open = openId === e.id;
                return (
                  <tr
                    key={e.id}
                    onClick={() => setOpenId(open ? null : e.id)}
                    className="cursor-pointer border-b border-line-soft align-top last:border-b-0 hover:bg-canvas"
                  >
                    <td className="whitespace-nowrap px-[14px] py-[9px] text-ink">
                      {when(e.created_at)}
                    </td>
                    <td className="px-[14px] py-[9px] text-ink">{e.from_name ?? e.from_email}</td>
                    <td className="max-w-[220px] px-[14px] py-[9px] text-ink">
                      <span className={open ? "" : "block truncate"}>{e.to_emails.join(", ")}</span>
                    </td>
                    <td className="max-w-[280px] px-[14px] py-[9px] text-ink">
                      <span className={open ? "" : "block truncate"}>{e.subject}</span>
                      {open && (
                        <p className="m-0 mt-[6px] whitespace-pre-wrap rounded-[6px] bg-canvas p-[10px] font-sans text-[13px] leading-[19px] text-ink">
                          {e.body_text}
                        </p>
                      )}
                    </td>
                    <td className="px-[14px] py-[9px] text-ink-muted">
                      {e.related_name ? `${e.related_name}${e.related_type ? ` (${e.related_type})` : ""}` : "—"}
                    </td>
                    <td className="px-[14px] py-[9px]">
                      <span
                        className="inline-flex h-[22px] items-center rounded-[12px] px-[10px] text-[12px] text-white"
                        style={{ backgroundColor: meta.color }}
                        title={e.error ?? undefined}
                      >
                        {meta.label}
                      </span>
                      {open && e.error && (
                        <p className="m-0 mt-[4px] max-w-[180px] font-sans text-[12px] text-alert">
                          {e.error}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {composerOpen && (
        <EmailComposer
          profile={profile}
          suggestions={suggestions}
          onClose={() => setComposerOpen(false)}
          onDone={(message, tone) => {
            setToast({ message, tone });
            router.refresh();
          }}
        />
      )}
      {toast && (
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
    </Surface>
  );
}
