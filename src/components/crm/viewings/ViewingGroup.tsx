"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmUser, CrmViewing, CrmViewingGroup } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
} from "@/components/crm/leads/cells";
import { OptionCell, TextCell } from "@/components/crm/contacts/contact-cells";
import { CONNECTED_UNDERLINE } from "@/components/crm/contacts/contacts-config";
import { ConnectPicker, type PickerOption } from "@/components/crm/deals/connect-picker";
import { TimeCell } from "@/components/crm/activities/activity-cells";
import { VIEWING_COLUMNS, VIEWING_NAME_COL_W, VIEWING_STATUSES } from "./viewings-config";

const ROW_H = 36;

export function ViewingGroup({
  group,
  viewings,
  users,
  contactOptions,
  unitOptions,
  isNew = false,
  onToggleCollapse,
  onRenameGroup,
  onPatch,
  onAdd,
  onCreateContact,
  onCreateUnit,
}: {
  group: CrmViewingGroup;
  viewings: CrmViewing[];
  users: CrmUser[];
  contactOptions: PickerOption[];
  unitOptions: PickerOption[];
  isNew?: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  onPatch: (id: string, patch: Partial<CrmViewing>) => void;
  onAdd: (name: string) => void;
  onCreateContact: (viewingId: string, name: string) => void;
  onCreateUnit: (viewingId: string, name: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDraft, setAddDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: bodyRef });

  const toggleCollapse = contextSafe(() => {
    const next = !collapsed;
    onToggleCollapse(next);
    if (!bodyRef.current) {
      setCollapsed(next);
      return;
    }
    if (next) {
      gsap.to(bodyRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: () => setCollapsed(true),
      });
    } else {
      setCollapsed(false);
      requestAnimationFrame(() => {
        if (!bodyRef.current) return;
        gsap.from(bodyRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
          clearProps: "all",
        });
      });
    }
  });

  const statusSegments = VIEWING_STATUSES.map((s) => ({
    color: s.color,
    count: viewings.filter((v) => v.status === s.key).length,
  })).filter((s) => s.count > 0);

  const cellBorder = "border-b border-r border-line";

  return (
    <section className="group pb-[24px]">
      <div className="sticky left-0 z-20 flex h-[40px] w-fit items-center pl-[5px]">
        <button
          type="button"
          aria-label={collapsed ? "Expand group" : "Collapse group"}
          onClick={toggleCollapse}
          className="mx-[2px] flex size-[22px] items-center justify-center rounded-[4px] transition-transform duration-200 hover:bg-[var(--hover-ghost)]"
          style={{ transform: collapsed ? "none" : "rotate(90deg)" }}
        >
          <Icon name="grpChevron" size={22} />
        </button>
        <InlineEdit
          value={group.name}
          onSave={onRenameGroup}
          autoEdit={isNew}
          placeholder="New Group"
          className="font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px]"
          style={{ color: group.color }}
        />
        <span className="pl-[4px] font-sans text-[14px] leading-[22px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
          {viewings.length} Viewings
        </span>
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit overflow-hidden">
          {/* column headers */}
          <div className="flex h-[36px] w-fit items-stretch">
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: VIEWING_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={viewings.length > 0 && selected.size === viewings.length}
                  onChange={() =>
                    setSelected(
                      selected.size === viewings.length
                        ? new Set()
                        : new Set(viewings.map((v) => v.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Viewing
              </span>
            </div>
            {VIEWING_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="relative flex items-center justify-center gap-[4px] whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
                style={{ width: col.w }}
              >
                {col.label}
                {col.connected && (
                  <span
                    className="absolute inset-x-0 bottom-[-1px] h-[2px]"
                    style={{ backgroundColor: CONNECTED_UNDERLINE }}
                  />
                )}
              </span>
            ))}
            <span className="flex w-[40px] items-center justify-center border-b border-t border-line bg-white">
              <Icon name="tlAdd" size={16} />
            </span>
          </div>

          {/* rows */}
          {viewings.map((viewing) => (
            <div
              key={viewing.id}
              className="group/row flex w-fit items-stretch"
              style={{ height: ROW_H }}
            >
              <div
                className="sticky left-0 z-10 flex items-stretch bg-white"
                style={{ width: VIEWING_NAME_COL_W }}
              >
                <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                  <Checkbox
                    label={`Select ${viewing.name}`}
                    checked={selected.has(viewing.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(viewing.id)) next.delete(viewing.id);
                        else next.add(viewing.id);
                        return next;
                      })
                    }
                  />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                  <InlineEdit
                    value={viewing.name}
                    onSave={(name) => onPatch(viewing.id, { name })}
                    className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                  />
                  <button
                    type="button"
                    aria-label={`Open ${viewing.name}`}
                    className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                  >
                    <Icon name="rowOpen" size={16} />
                  </button>
                </span>
              </div>

              {VIEWING_COLUMNS.map((col) => {
                const w = { width: col.w };
                switch (col.key) {
                  case "agent":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OwnerCell
                          owner={users.find((u) => u.id === viewing.agent_id)}
                          users={users}
                          onSelect={(ownerId) => onPatch(viewing.id, { agent_id: ownerId })}
                        />
                      </span>
                    );
                  case "contact":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <ConnectPicker
                          value={viewing.contact_name}
                          options={contactOptions}
                          entityLabel="contact"
                          kind="contact"
                          onPick={(name) => onPatch(viewing.id, { contact_name: name })}
                          onClear={() => onPatch(viewing.id, { contact_name: null })}
                          onCreate={(name) => onCreateContact(viewing.id, name)}
                        />
                      </span>
                    );
                  case "unit":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <ConnectPicker
                          value={viewing.unit_name}
                          options={unitOptions}
                          entityLabel="unit"
                          kind="account"
                          onPick={(name) => onPatch(viewing.id, { unit_name: name })}
                          onClear={() => onPatch(viewing.id, { unit_name: null })}
                          onCreate={(name) => onCreateUnit(viewing.id, name)}
                        />
                      </span>
                    );
                  case "start":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <TimeCell
                          value={viewing.scheduled_start}
                          label={`Start time for ${viewing.name}`}
                          onChange={(iso) => onPatch(viewing.id, { scheduled_start: iso })}
                        />
                      </span>
                    );
                  case "status":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={viewing.status}
                          options={VIEWING_STATUSES}
                          onSelect={(next) => onPatch(viewing.id, { status: next ?? "scheduled" })}
                        />
                      </span>
                    );
                  case "feedback":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <TextCell
                          value={viewing.feedback}
                          onSave={(next) => onPatch(viewing.id, { feedback: next || null })}
                        />
                      </span>
                    );
                  default:
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w} />
                    );
                }
              })}
              <span className="w-[40px] border-b border-line bg-white" />
            </div>
          ))}

          {/* add row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: VIEWING_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-bl-[6px] opacity-50"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                <Checkbox label="disabled" disabled />
              </span>
              <span className="flex flex-1 items-center border-b border-line px-[10px]">
                <input
                  value={addDraft}
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addDraft.trim()) {
                      onAdd(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add viewing"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: VIEWING_COLUMNS.reduce((s, c) => s + c.w, 0) + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span
              className="sticky left-0 z-10 block bg-white"
              style={{ width: VIEWING_NAME_COL_W }}
            />
            {VIEWING_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex flex-col items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "status" && statusSegments.length > 0 && (
                  <BatteryBar segments={statusSegments} />
                )}
              </span>
            ))}
            <span className="w-[40px] border-b border-line bg-white" />
          </div>
        </div>
      )}
    </section>
  );
}
