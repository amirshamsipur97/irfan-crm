"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Surface } from "@/components/shell/AppChrome";
import { Avatar } from "@/components/ui/Avatar";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { TemperaturePill } from "@/components/crm/temperature-pill";
import { activityTime } from "@/components/crm/activities/activities-config";
import {
  cancelCollaboration,
  listCollaborationData,
  respondCollaboration,
  type CollaborationRow,
  type DuplicateAttemptRow,
  type SharedClient,
} from "@/app/(app)/crm/collaboration/actions";
import { COLLABORATION_TERMS } from "./DuplicatePhoneDialog";
import { useDebounced, useRealtimeTable } from "@/lib/use-realtime";
import type { CrmUser } from "@/lib/types";

type TabKey = "incoming" | "mine" | "shared" | "all" | "duplicates";

const STATUS: Record<CollaborationRow["status"], { label: string; color: string }> = {
  pending: { label: "Pending", color: "#fdab3d" },
  accepted: { label: "Accepted", color: "#00c875" },
  declined: { label: "Declined", color: "#e2445c" },
  cancelled: { label: "Withdrawn", color: "#c4c4c4" },
};

function StatusChip({ status }: { status: CollaborationRow["status"] }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex h-[22px] w-fit items-center justify-self-start rounded-[11px] px-[10px] font-sans text-[12px] text-white" style={{ backgroundColor: s.color }}>
      {s.label}
    </span>
  );
}

function clientHref(table: string, id: string) {
  return table === "crm_leads" ? `/crm/leads?lead=${id}` : `/crm/contacts?contact=${id}`;
}

type UserMap = Map<string, CrmUser>;

function Person({ userById, id, label }: { userById: UserMap; id: string | null; label?: string }) {
  const u = id ? userById.get(id) : undefined;
  return (
    <span className="flex min-w-0 items-center gap-[6px]">
      {u && <Avatar name={u.full_name || u.email} src={u.avatar_url} size={22} />}
      <span className="min-w-0 truncate font-sans text-[13px] text-ink">
        {label ? <span className="text-ink-muted">{label} </span> : null}
        {u ? u.full_name || u.email : "—"}
      </span>
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="m-0 px-[14px] py-[28px] text-center font-sans text-[13.5px] text-ink-muted">{text}</p>;
}

function RequestRow({
  c,
  as,
  userById,
  onView,
  onAnswer,
  onWithdraw,
}: {
  c: CollaborationRow;
  as: "owner" | "requester" | "admin";
  userById: UserMap;
  onView: () => void;
  onAnswer: (accept: boolean) => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(170px,1.3fr)_minmax(140px,1fr)_minmax(140px,1fr)_100px_250px] items-center gap-[12px] border-b border-line px-[14px] py-[10px] last:border-b-0">
      <div className="min-w-0">
        <Link href={clientHref(c.entity_table, c.entity_id)} className="block truncate font-sans text-[14px] text-link hover:underline">
          {c.entity_name ?? "Client"}
        </Link>
        <p className="m-0 truncate font-sans text-[12px] text-ink-muted">
          {c.entity_table === "crm_leads" ? "Lead" : "Contact"} · {c.phone} · {activityTime(c.created_at)}
        </p>
      </div>
      <Person userById={userById} id={c.requester_id} label="from" />
      <Person userById={userById} id={c.owner_id} label="owner" />
      <StatusChip status={c.status} />
      <div className="flex items-center justify-end gap-[6px]">
        <button
          type="button"
          onClick={onView}
          className="h-[30px] rounded-[4px] border border-line-strong px-[10px] font-sans text-[13px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
        >
          Details
        </button>
        {c.status === "pending" && (as === "owner" || as === "admin") && (
          <>
            <button
              type="button"
              onClick={() => onAnswer(false)}
              className="h-[30px] rounded-[4px] border border-line-strong px-[10px] font-sans text-[13px] text-ink transition-colors hover:bg-[#ffe9ec]"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => onAnswer(true)}
              className="h-[30px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-colors hover:bg-[#006e87]"
            >
              Accept
            </button>
          </>
        )}
        {c.status === "pending" && as === "requester" && (
          <button
            type="button"
            onClick={onWithdraw}
            className="h-[30px] rounded-[4px] px-[10px] font-sans text-[13px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Collaboration — duplicate phone numbers turned into joint work. A member who
 * enters a number someone else registered can sign the agreement and ask the
 * owner to collaborate; the owner answers here. Developers and the CEO see
 * every request and every duplicate-number attempt, and can follow any member.
 */
export function CollaborationBoard({
  profile,
  users,
  isAdmin,
  initial,
}: {
  profile: CrmUser;
  users: CrmUser[];
  isAdmin: boolean;
  initial: { collaborations: CollaborationRow[]; attempts: DuplicateAttemptRow[]; shared: SharedClient[] };
}) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<TabKey>(isAdmin ? "all" : "incoming");
  const [person, setPerson] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);
  const [answering, setAnswering] = useState<{ row: CollaborationRow; accept: boolean } | null>(null);
  const [viewing, setViewing] = useState<CollaborationRow | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const nameOf = (id: string | null) => (id ? userById.get(id)?.full_name || userById.get(id)?.email || "—" : "—");

  const reload = async () => setData(await listCollaborationData());
  const reloadSoon = useDebounced(reload, 300);
  useRealtimeTable("crm_collaborations", reloadSoon);
  useRealtimeTable("crm_phone_duplicate_attempts", reloadSoon, isAdmin);

  const incoming = data.collaborations.filter((c) => c.owner_id === profile.id);
  const mine = data.collaborations.filter((c) => c.requester_id === profile.id);
  const involves = (c: CollaborationRow) => !person || c.requester_id === person || c.owner_id === person;
  const all = data.collaborations.filter(involves);
  const attempts = data.attempts.filter((a) => !person || a.attempted_by === person || a.existing_owner_id === person);

  const pendingIncoming = incoming.filter((c) => c.status === "pending").length;
  const pendingAll = data.collaborations.filter((c) => c.status === "pending").length;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    ...(isAdmin
      ? [
          { key: "all" as const, label: "All requests", count: pendingAll },
          { key: "duplicates" as const, label: "Duplicate numbers", count: data.attempts.length },
        ]
      : []),
    { key: "incoming", label: "Requests to me", count: pendingIncoming },
    { key: "mine", label: "My requests" },
    { key: "shared", label: "Shared clients", count: data.shared.length },
  ];

  const withdraw = async (row: CollaborationRow) => {
    const result = await cancelCollaboration(row.id);
    setToast(result.error ? { message: result.error, tone: "alert" } : { message: "Request withdrawn" });
    reloadSoon();
  };

  const list = (rows: CollaborationRow[], as: "owner" | "requester" | "admin", empty: string) => (
    <div className="rounded-[10px] border border-line bg-white">
      {rows.length === 0 ? (
        <Empty text={empty} />
      ) : (
        rows.map((c) => (
          <RequestRow
            key={c.id}
            c={c}
            as={as}
            userById={userById}
            onView={() => setViewing(c)}
            onAnswer={(accept) => setAnswering({ row: c, accept })}
            onWithdraw={() => withdraw(c)}
          />
        ))
      )}
    </div>
  );

  return (
    <Surface>
      <div className="thin-scroll flex h-full flex-col overflow-y-auto">
        <div className="px-[40px] pb-[6px] pt-[20px]">
          <h1 className="m-0 font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">Collaboration</h1>
          <p className="m-0 pt-[2px] font-sans text-[13px] text-ink-muted">
            When a phone number is already registered, members can ask its owner to work the client together.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-[12px] border-b border-line px-[40px]">
          <div className="flex">
            {tabs.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex h-[40px] items-center gap-[6px] px-[12px] font-sans text-[14px] transition-colors ${
                    active ? "border-b-2 border-teal-deep text-ink" : "text-ink-muted hover:bg-[var(--hover-ghost)]"
                  }`}
                >
                  {t.label}
                  {t.count ? (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-teal-deep px-[5px] text-[11px] font-medium tabular-nums text-white">
                      {t.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {isAdmin && (tab === "all" || tab === "duplicates") && (
            <label className="mb-[6px] flex items-center gap-[6px] font-sans text-[13px] text-ink-muted">
              Member
              <select
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className="h-[30px] rounded-[4px] border border-line-strong bg-white px-[6px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
              >
                <option value="">Everyone</option>
                {users
                  .filter((u) => u.is_active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>

        <div className="px-[40px] pb-[48px] pt-[16px]">
          {tab === "incoming" && list(incoming, "owner", "No one has asked to collaborate on your clients.")}
          {tab === "mine" && list(mine, "requester", "You have not asked anyone to collaborate yet.")}
          {tab === "all" && list(all, "admin", person ? "No requests involve this member." : "No collaboration requests yet.")}

          {tab === "shared" && (
            <div className="rounded-[10px] border border-line bg-white">
              {data.shared.length === 0 ? (
                <Empty text="No shared clients yet. Accepted collaborations appear here." />
              ) : (
                data.shared.map((s) => (
                  <div key={s.collaboration_id} className="grid grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_minmax(160px,1fr)_110px] items-center gap-[12px] border-b border-line px-[14px] py-[10px] last:border-b-0">
                    <div className="min-w-0">
                      <p className="m-0 truncate font-sans text-[14px] text-ink">{s.name}</p>
                      <p className="m-0 font-sans text-[12px] text-ink-muted">{s.entity_table === "crm_leads" ? "Lead" : "Contact"} · owner {s.owner_name}</p>
                    </div>
                    <a href={`tel:${s.country_code ?? ""}${s.phone ?? ""}`} className="truncate font-sans text-[13px] text-[#0073ea] hover:underline">
                      {s.country_code} {s.phone}
                    </a>
                    <span className="truncate font-sans text-[13px] text-ink">{s.email ?? "—"}</span>
                    <TemperaturePill value={s.temperature} />
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "duplicates" && (
            <div className="rounded-[10px] border border-line bg-white">
              <div className="grid grid-cols-[130px_minmax(150px,1fr)_140px_minmax(170px,1.2fr)_minmax(150px,1fr)_110px] gap-[12px] border-b border-line bg-canvas/50 px-[14px] py-[8px] font-sans text-[12px] font-medium text-ink-muted">
                <span>When</span>
                <span>Entered by</span>
                <span>Number</span>
                <span>Already registered as</span>
                <span>Owner</span>
                <span>Collaboration</span>
              </div>
              {attempts.length === 0 ? (
                <Empty text={person ? "No duplicate numbers involve this member." : "No duplicate numbers entered yet."} />
              ) : (
                attempts.map((a) => {
                  const collab = a.collaboration_id ? data.collaborations.find((c) => c.id === a.collaboration_id) : undefined;
                  return (
                    <div key={a.id} className="grid grid-cols-[130px_minmax(150px,1fr)_140px_minmax(170px,1.2fr)_minmax(150px,1fr)_110px] items-center gap-[12px] border-b border-line px-[14px] py-[8px] last:border-b-0">
                      <span className="font-sans text-[12.5px] text-ink-muted">{activityTime(a.created_at)}</span>
                      <Person userById={userById} id={a.attempted_by} />
                      <span className="font-sans text-[13px] tabular-nums text-ink">{a.phone}</span>
                      <Link href={clientHref(a.existing_table, a.existing_id)} className="min-w-0 truncate font-sans text-[13px] text-link hover:underline">
                        {a.existing_name ?? "Client"}{" "}
                        <span className="text-ink-muted">({a.existing_table === "crm_leads" ? "Lead" : "Contact"} · {a.board === "leads" ? "entered on Leads" : "entered on Contacts"})</span>
                      </Link>
                      <Person userById={userById} id={a.existing_owner_id} />
                      {collab ? <StatusChip status={collab.status} /> : <span className="font-sans text-[12.5px] text-ink-muted">Not requested</span>}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/30 p-[16px]" role="dialog" aria-modal="true" aria-label="Collaboration request">
          <button type="button" aria-label="Close" onClick={() => setViewing(null)} className="absolute inset-0 cursor-default" />
          <div className="relative w-[520px] max-w-full rounded-[12px] bg-white p-[22px] shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-[8px]">
              <div>
                <h3 className="m-0 font-display text-[18px] font-medium text-ink">{viewing.entity_name ?? "Client"}</h3>
                <p className="m-0 font-sans text-[12.5px] text-ink-muted">{viewing.phone}</p>
              </div>
              <StatusChip status={viewing.status} />
            </div>
            <div className="mt-[12px] grid grid-cols-2 gap-[10px]">
              <Person userById={userById} id={viewing.requester_id} label="Requested by" />
              <Person userById={userById} id={viewing.owner_id} label="Owner" />
            </div>
            {viewing.message && (
              <p className="m-0 mt-[12px] whitespace-pre-wrap rounded-[8px] bg-canvas/60 px-[12px] py-[8px] font-sans text-[13px] leading-[19px] text-ink">
                {viewing.message}
              </p>
            )}
            <div className="mt-[12px] rounded-[8px] border border-line px-[12px] py-[10px]">
              <p className="m-0 pb-[4px] font-sans text-[12px] font-semibold text-ink">Agreement ({viewing.agreement_version})</p>
              <ol className="m-0 list-decimal space-y-[2px] pl-[18px] font-sans text-[12px] leading-[17px] text-ink-muted">
                {COLLABORATION_TERMS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
              <p className="m-0 pt-[8px] font-['Brush_Script_MT','Segoe_Script',cursive] text-[22px] text-ink">{viewing.signature_name}</p>
              <p className="m-0 font-sans text-[11.5px] text-ink-muted">Signed {activityTime(viewing.signed_at)}</p>
            </div>
            {viewing.responded_at && (
              <p className="m-0 mt-[10px] font-sans text-[12.5px] text-ink">
                {STATUS[viewing.status].label} by {nameOf(viewing.responded_by)} · {activityTime(viewing.responded_at)}
                {viewing.response_note ? `: “${viewing.response_note}”` : ""}
              </p>
            )}
            <div className="mt-[14px] flex justify-end">
              <button type="button" onClick={() => setViewing(null)} className="h-[32px] rounded-[4px] border border-line-strong px-[12px] font-sans text-[14px] text-ink hover:bg-[var(--hover-ghost)]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {answering && (
        <AnswerDialog
          row={answering.row}
          accept={answering.accept}
          requesterName={nameOf(answering.row.requester_id)}
          onClose={() => setAnswering(null)}
          onDone={(message, tone) => {
            setAnswering(null);
            setToast({ message, tone });
            reloadSoon();
          }}
        />
      )}
      {toast && <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </Surface>
  );
}

function AnswerDialog({
  row,
  accept,
  requesterName,
  onClose,
  onDone,
}: {
  row: CollaborationRow;
  accept: boolean;
  requesterName: string;
  onClose: () => void;
  onDone: (message: string, tone?: "success" | "alert") => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    const result = await respondCollaboration(row.id, accept, note);
    setSaving(false);
    if (result.error) onDone(result.error, "alert");
    else onDone(accept ? `Collaboration with ${requesterName} accepted` : "Request declined");
  };
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/30 p-[16px]" role="dialog" aria-modal="true">
      <div className="w-[420px] max-w-full rounded-[10px] bg-white p-[22px] shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        <h3 className="m-0 font-display text-[18px] font-medium text-ink">
          {accept ? "Accept collaboration?" : "Decline this request?"}
        </h3>
        <p className="m-0 mt-[6px] font-sans text-[13px] leading-[19px] text-ink-muted">
          {accept
            ? `${requesterName} will work ${row.entity_name ?? "this client"} with you and can see the client's contact details. Management is notified.`
            : `${requesterName} is told the request was declined. Management is notified.`}
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Note (optional)"
          className="mt-[10px] w-full resize-none rounded-[6px] border border-line-strong px-[10px] py-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
        />
        <div className="mt-[14px] flex justify-end gap-[8px]">
          <button type="button" onClick={onClose} className="h-[32px] rounded-[4px] px-[12px] font-sans text-[14px] text-ink hover:bg-[var(--hover-ghost)]">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className={`h-[32px] rounded-[4px] px-[14px] font-sans text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              accept ? "bg-teal-deep" : "bg-alert"
            }`}
          >
            {saving ? "Saving…" : accept ? "Accept" : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}
