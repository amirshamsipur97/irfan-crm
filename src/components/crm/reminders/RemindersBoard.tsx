"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Surface } from "@/components/shell/AppChrome";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { Checkbox } from "@/components/crm/leads/cells";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { TimeCell } from "@/components/crm/activities/activity-cells";
import { activityTime, parseLocalDate, todayLocalDateString } from "@/components/crm/activities/activities-config";
import {
  addLeadHistoryEntry,
  deleteLeadHistoryEntry,
  setLeadHistoryReminderDone,
} from "@/app/(app)/crm/history-actions";
import {
  deleteTrackingEntry,
  setReminderDone as setTrackingReminderDone,
  setTrackingReminderTime,
} from "@/app/(app)/crm/contacts/tracking-actions";
import {
  listReminders,
  searchReminderClients,
  setReminderTime,
  type ClientOption,
  type ReminderRow,
} from "@/app/(app)/crm/reminders/actions";
import { useDebounced, useRealtimeTable } from "@/lib/use-realtime";
import { canManageBoards } from "@/lib/permissions";
import type { CrmUser } from "@/lib/types";

type Bucket = "overdue" | "today" | "upcoming" | "done";

const BUCKETS: { key: Bucket; label: string; color: string; empty: string }[] = [
  { key: "overdue", label: "Overdue", color: "#e2445c", empty: "Nothing overdue." },
  { key: "today", label: "Today", color: "#fdab3d", empty: "Nothing due today." },
  { key: "upcoming", label: "Upcoming", color: "#579bfc", empty: "Nothing scheduled." },
  { key: "done", label: "Done (last 30 days)", color: "#00c875", empty: "Nothing ticked off yet." },
];

const COLS = { task: 380, client: 230, owner: 190, due: 190, by: 170 } as const;
const ROW_H = 40;
const CELL = "flex items-center border-b border-r border-line";

function bucketOf(row: ReminderRow, today: string): Bucket {
  if (row.reminder_done) return "done";
  const at = parseLocalDate(row.remind_at);
  if (!at) return "upcoming";
  if (at.getTime() <= Date.now()) return "overdue";
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return day === today ? "today" : "upcoming";
}

function clientOf(row: ReminderRow) {
  if (row.lead) return { kind: "Lead", name: row.lead.name, href: `/crm/leads?lead=${row.lead.id}`, owner: row.lead.owner_id };
  if (row.contact)
    return {
      kind: row.source === "offer" ? "Offer" : "Contact",
      name: row.contact.code ? `${row.contact.name} · ${row.contact.code}` : row.contact.name,
      href: `/crm/contacts?contact=${row.contact.id}`,
      owner: row.contact.owner_id,
    };
  return null;
}

/**
 * Reminders — every Lead history reminder as one to-do list, grouped by when
 * it is due. The same rows the drawers show and the Leads "next follow up"
 * column mirrors: ticking, moving or deleting one here changes it there, and
 * any change made elsewhere (by anyone) arrives here over realtime.
 */
export function RemindersBoard({
  profile,
  initialReminders,
  users,
}: {
  profile: CrmUser;
  initialReminders: ReminderRow[];
  users: CrmUser[];
}) {
  const [rows, setRows] = useState(initialReminders);
  // an agent's list is their own follow-ups; managers and developers start on the whole team
  const [scope, setScope] = useState<"mine" | "all">(canManageBoards(profile.role) ? "all" : "mine");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<Bucket, boolean>>({
    overdue: false,
    today: false,
    upcoming: false,
    done: true,
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);
  const { pending: toDelete, ask: askDelete, close: closeDelete } = useConfirm<ReminderRow>();
  // edits in flight: a realtime echo must not overwrite an optimistic row mid-save
  const busy = useRef(0);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const reload = async () => {
    const fresh = await listReminders();
    if (busy.current === 0) setRows(fresh);
  };
  const reloadSoon = useDebounced(reload, 250);

  useRealtimeTable("crm_lead_history", reloadSoon);
  useRealtimeTable("crm_offer_tracking", reloadSoon);
  // a renamed lead or a new owner changes what a row shows
  useRealtimeTable("crm_leads", (payload) => {
    const id = (payload.new as { id?: string })?.id;
    if (id && rows.some((r) => r.lead?.id === id)) reloadSoon();
  });

  const run = async (optimistic: () => void, rollback: () => void, save: () => Promise<{ error?: string }>) => {
    busy.current += 1;
    optimistic();
    const result = await save();
    busy.current -= 1;
    if (result.error) {
      rollback();
      setToast({ message: result.error, tone: "alert" });
    }
    // the database may have touched other rows too (a replaced follow-up is ticked off)
    reloadSoon();
  };

  // ids are only unique per table: a row is its source + id
  const same = (a: ReminderRow, b: ReminderRow) => a.id === b.id && a.source === b.source;
  const patchRow = (row: ReminderRow, patch: Partial<ReminderRow>) =>
    setRows((prev) => prev.map((r) => (same(r, row) ? { ...r, ...patch } : r)));

  const toggleDone = (row: ReminderRow) =>
    run(
      () => patchRow(row, { reminder_done: !row.reminder_done }),
      () => patchRow(row, { reminder_done: row.reminder_done }),
      () =>
        row.source === "offer"
          ? setTrackingReminderDone(row.id, !row.reminder_done)
          : setLeadHistoryReminderDone(row.id, !row.reminder_done)
    );

  const moveTime = (row: ReminderRow, iso: string | null) => {
    if (!iso) return;
    run(
      () => patchRow(row, { remind_at: iso, reminder_done: false }),
      () => patchRow(row, { remind_at: row.remind_at, reminder_done: row.reminder_done }),
      () => (row.source === "offer" ? setTrackingReminderTime(row.id, iso) : setReminderTime(row.id, iso))
    );
  };

  const remove = (row: ReminderRow) => {
    const before = rows;
    run(
      () => setRows((prev) => prev.filter((r) => !same(r, row))),
      () => setRows(before),
      () =>
        row.source === "offer"
          ? deleteTrackingEntry(row.id, row.storage_path)
          : deleteLeadHistoryEntry(row.id, row.storage_path)
    );
  };

  const today = todayLocalDateString();
  const q = search.trim().toLowerCase();
  const visible = rows.filter((r) => {
    const client = clientOf(r);
    if (scope === "mine" && r.created_by !== profile.id && client?.owner !== profile.id) return false;
    if (!q) return true;
    return r.note.toLowerCase().includes(q) || (client?.name.toLowerCase().includes(q) ?? false);
  });
  const grouped = BUCKETS.map((b) => {
    const list = visible.filter((r) => bucketOf(r, today) === b.key);
    // done: most recent first; everything else: soonest first
    if (b.key === "done") list.reverse();
    return { ...b, list };
  });
  const openCount = grouped.filter((g) => g.key !== "done").reduce((n, g) => n + g.list.length, 0);

  const tableW = 6 + COLS.task + COLS.client + COLS.owner + COLS.due + COLS.by + 40;

  return (
    <Surface>
      <div className="flex h-full flex-col">
        <BoardHeader
          profile={profile}
          title="To-do list"
          tabs={["Reminders"]}
          activeTab="Reminders"
          onTabChange={() => {}}
          newLabel="New reminder"
          onNew={() => setComposerOpen((v) => !v)}
          showImport={false}
          searchValue={search}
          onSearch={setSearch}
        />

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-[12px] pb-[12px] pl-[40px] pr-[30px]">
          <div className="flex h-[32px] items-center rounded-[6px] border border-line-strong p-[2px]" role="tablist">
            {(
              [
                ["mine", "My reminders"],
                ["all", "Everyone I can see"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={scope === key}
                onClick={() => setScope(key)}
                className={`h-full rounded-[4px] px-[10px] font-sans text-[13px] leading-[20px] transition-colors ${
                  scope === key ? "bg-[var(--active-nav)] text-ink" : "text-ink-muted hover:bg-[var(--hover-ghost)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="font-sans text-[13px] text-ink-muted">
            {openCount} open {openCount === 1 ? "reminder" : "reminders"} · next follow ups from the Leads and
            Contacts tables, their side panels and offer Lead tracking
          </span>
        </div>

        {composerOpen && (
          <ReminderComposer
            onCancel={() => setComposerOpen(false)}
            onSaved={() => {
              setComposerOpen(false);
              setToast({ message: "Reminder added" });
              reload();
            }}
            onError={(message) => setToast({ message, tone: "alert" })}
          />
        )}

        <div className="thin-scroll min-h-0 flex-1 overflow-auto bg-white pl-[40px] pr-[30px] pt-[8px]">
          {grouped.map((group) => {
            const isCollapsed = collapsed[group.key];
            return (
              <section key={group.key} className="group pb-[24px]" style={{ minWidth: tableW }}>
                <div className="flex h-[40px] items-center">
                  <button
                    type="button"
                    aria-label={isCollapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
                    onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !c[group.key] }))}
                    className="mx-[2px] flex size-[22px] items-center justify-center rounded-[4px] transition-transform duration-200 hover:bg-[var(--hover-ghost)]"
                    style={{ transform: isCollapsed ? "none" : "rotate(90deg)" }}
                  >
                    <Icon name="grpChevron" size={22} />
                  </button>
                  <h2
                    className="m-0 px-[4px] font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px]"
                    style={{ color: group.color }}
                  >
                    {group.label}
                  </h2>
                  <span className="pl-[4px] font-sans text-[14px] leading-[22px] text-ink-muted">
                    {group.list.length}
                  </span>
                </div>

                {!isCollapsed && (
                  <div className="w-fit">
                    <div className="flex h-[36px] items-stretch bg-white">
                      <span className="w-[6px] shrink-0 rounded-tl-[6px]" style={{ backgroundColor: group.color }} />
                      <span className={`${CELL} border-t pl-[36px] font-sans text-[14px] text-ink`} style={{ width: COLS.task }}>
                        Task
                      </span>
                      {(
                        [
                          ["client", "Client"],
                          ["owner", "Owner"],
                          ["due", "Due"],
                          ["by", "Set by"],
                        ] as const
                      ).map(([key, label]) => (
                        <span
                          key={key}
                          className={`${CELL} justify-center border-t font-sans text-[14px] text-ink`}
                          style={{ width: COLS[key] }}
                        >
                          {label}
                        </span>
                      ))}
                      <span className="w-[40px]" />
                    </div>

                    {group.list.length === 0 && (
                      <div className="flex items-stretch" style={{ height: ROW_H }}>
                        <span className="w-[6px] shrink-0" style={{ backgroundColor: `${group.color}55` }} />
                        <span
                          className={`${CELL} pl-[36px] font-sans text-[13px] text-ink-muted`}
                          style={{ width: COLS.task + COLS.client + COLS.owner + COLS.due + COLS.by }}
                        >
                          {group.empty}
                        </span>
                      </div>
                    )}

                    {group.list.map((row) => {
                      const client = clientOf(row);
                      const owner = client?.owner ? userById.get(client.owner) : undefined;
                      const author = row.created_by ? userById.get(row.created_by) : undefined;
                      return (
                        <div key={`${row.source}-${row.id}`} className="group/row flex items-stretch" style={{ height: ROW_H }}>
                          <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                          <span
                            className={`${CELL} min-w-0 gap-[10px] px-[10px] transition-colors group-hover/row:bg-canvas`}
                            style={{ width: COLS.task }}
                          >
                            <Checkbox
                              label={row.reminder_done ? "Mark as not done" : "Mark as done"}
                              checked={row.reminder_done}
                              onChange={() => toggleDone(row)}
                            />
                            <span
                              title={row.offer ? `${row.offer.label}: ${row.note}` : row.note}
                              className={`min-w-0 flex-1 truncate font-sans text-[14px] leading-[20px] ${
                                row.reminder_done ? "text-ink-muted line-through" : "text-ink"
                              }`}
                            >
                              {row.note}
                            </span>

                            {row.followup_source && !row.reminder_done && (
                              <span
                                title="Shown in the Leads table as next follow up"
                                className="shrink-0 rounded-[10px] bg-teal-deep/10 px-[8px] py-[1px] font-sans text-[11.5px] leading-[16px] text-teal-deep"
                              >
                                next follow up
                              </span>
                            )}
                          </span>
                          <span className={`${CELL} min-w-0 gap-[6px] px-[10px]`} style={{ width: COLS.client }}>
                            {client ? (
                              <>
                                <span className="shrink-0 rounded-[4px] bg-canvas px-[5px] font-sans text-[11px] leading-[16px] text-ink-muted">
                                  {client.kind}
                                </span>
                                <Link
                                  href={client.href}
                                  title={row.offer ? `${row.offer.label} (open ${client.name})` : `Open ${client.name}`}
                                  className="min-w-0 truncate font-sans text-[14px] leading-[20px] text-link hover:underline"
                                >
                                  {client.name}
                                </Link>
                              </>
                            ) : (
                              <span className="font-sans text-[13px] text-ink-muted">—</span>
                            )}
                          </span>
                          <span className={`${CELL} min-w-0 gap-[6px] px-[10px]`} style={{ width: COLS.owner }}>
                            {owner ? (
                              <>
                                <Avatar name={owner.full_name || owner.email} src={owner.avatar_url} size={24} />
                                <span className="min-w-0 truncate font-sans text-[14px] text-ink">{owner.full_name}</span>
                              </>
                            ) : (
                              <span className="font-sans text-[13px] text-ink-muted">No owner</span>
                            )}
                          </span>
                          <span className="block border-b border-r border-line" style={{ width: COLS.due }}>
                            <TimeCell
                              value={row.remind_at}
                              label={`Due time for ${row.note.slice(0, 40)}`}
                              format={activityTime}
                              onChange={(iso) => moveTime(row, iso)}
                            />
                          </span>
                          <span className={`${CELL} min-w-0 gap-[6px] px-[10px]`} style={{ width: COLS.by }}>
                            {author ? (
                              <>
                                <Avatar name={author.full_name || author.email} src={author.avatar_url} size={22} />
                                <span className="min-w-0 truncate font-sans text-[13px] text-ink-muted">{author.full_name}</span>
                              </>
                            ) : (
                              <span className="font-sans text-[13px] text-ink-muted">System</span>
                            )}
                          </span>
                          <span className="flex w-[40px] items-center justify-center">
                            <button
                              type="button"
                              aria-label="Delete reminder"
                              title="Delete reminder"
                              onClick={() => askDelete(row)}
                              className="flex size-[26px] items-center justify-center rounded-[4px] font-sans text-[13px] text-alert opacity-0 transition-opacity hover:bg-[#ffe9ec] focus-visible:opacity-100 group-hover/row:opacity-100"
                            >
                              ✕
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete this reminder?"
          message={
            toDelete.source === "offer"
              ? "The entry is removed from this offer's Lead tracking trail for everyone, attachment included. This can't be undone."
              : "The entry is removed from the client's Lead history for everyone, attachment included. This can't be undone."
          }
          confirmLabel="Delete"
          onCancel={closeDelete}
          onConfirm={() => {
            const row = toDelete;
            closeDelete();
            remove(row);
          }}
        />
      )}
      {toast && <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </Surface>
  );
}

/** Pick a client, write the task, pick when — saved as a Lead history reminder. */
function ReminderComposer({
  onCancel,
  onSaved,
  onError,
}: {
  onCancel: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [client, setClient] = useState<ClientOption | null>(null);
  const [note, setNote] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  const lookUp = useDebounced(async () => {
    const mine = ++seq.current;
    const found = await searchReminderClients(query);
    if (mine === seq.current) setOptions(found);
  }, 200);

  const canSave = Boolean(client && note.trim() && due) && !saving;

  const save = async () => {
    if (!client || !due || !note.trim()) return;
    setSaving(true);
    const result = await addLeadHistoryEntry({
      leadId: client.kind === "lead" ? client.id : null,
      contactId: client.kind === "contact" ? client.id : null,
      entryType: "note",
      durationMin: null,
      entryDate: todayLocalDateString(),
      note,
      remindAt: due,
      file: null,
    });
    setSaving(false);
    if (result.error) {
      onError(result.error);
      return;
    }
    onSaved();
  };

  return (
    <div className="mx-[30px] mb-[12px] ml-[40px] flex shrink-0 flex-wrap items-center gap-[8px] rounded-[8px] border border-line bg-canvas/50 p-[10px]">
      <span className="relative">
        {client ? (
          <button
            type="button"
            onClick={() => {
              setClient(null);
              setQuery("");
              setOptions([]);
            }}
            title="Change client"
            className="flex h-[32px] max-w-[240px] items-center gap-[6px] rounded-[4px] border border-teal-deep bg-white px-[8px] font-sans text-[14px] text-ink"
          >
            <span className="rounded-[4px] bg-canvas px-[5px] text-[11px] text-ink-muted">
              {client.kind === "lead" ? "Lead" : "Contact"}
            </span>
            <span className="truncate">{client.name}</span>
            <span aria-hidden className="text-ink-muted">✕</span>
          </button>
        ) : (
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              lookUp();
            }}
            placeholder="Search a lead or contact…"
            aria-label="Client"
            className="h-[32px] w-[240px] rounded-[4px] border border-line-strong bg-white px-[10px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
          />
        )}
        {!client && query.trim().length >= 2 && (
          <div className="absolute left-0 top-[36px] z-[70] max-h-[280px] w-[300px] overflow-auto rounded-[8px] border border-line bg-white py-[4px] shadow-[0px_6px_20px_rgba(0,0,0,0.2)]">
            {options.length === 0 ? (
              <p className="m-0 px-[12px] py-[8px] font-sans text-[13px] text-ink-muted">No matching client.</p>
            ) : (
              options.map((o) => (
                <button
                  key={`${o.kind}-${o.id}`}
                  type="button"
                  onClick={() => setClient(o)}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[6px] text-left font-sans text-[14px] text-ink hover:bg-[var(--hover-ghost)]"
                >
                  <span className="shrink-0 rounded-[4px] bg-canvas px-[5px] text-[11px] text-ink-muted">
                    {o.kind === "lead" ? "Lead" : "Contact"}
                  </span>
                  <span className="truncate">{o.code ? `${o.name} · ${o.code}` : o.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </span>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSave) save();
        }}
        maxLength={4000}
        placeholder="What needs doing? e.g. Call back about the 2BHK"
        aria-label="Task"
        className="h-[32px] min-w-[220px] flex-1 rounded-[4px] border border-line-strong bg-white px-[10px] font-sans text-[14px] text-ink outline-none focus:border-teal-deep"
      />
      <span className="block h-[32px] w-[190px] overflow-hidden rounded-[4px] border border-line-strong bg-white">
        <TimeCell
          value={due}
          label="Due"
          format={(v) => (v ? activityTime(v) : "Pick date & time")}
          onChange={(iso) => setDue(iso)}
        />
      </span>
      <button
        type="button"
        disabled={!canSave}
        onClick={save}
        className="h-[32px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-40"
      >
        {saving ? "Saving…" : "Add reminder"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-[32px] rounded-[4px] px-[10px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
      >
        Cancel
      </button>
    </div>
  );
}
