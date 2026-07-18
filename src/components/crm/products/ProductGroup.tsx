"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmProduct, CrmProductGroup, CrmUser } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
} from "@/components/crm/leads/cells";
import { OptionCell, TextCell } from "@/components/crm/contacts/contact-cells";
import { CenterEditCell } from "@/components/crm/leads/lead-cells";
import { NumberCell } from "@/components/crm/deals/deal-cells";
import { money } from "@/components/crm/deals/deals-config";
import {
  PRODUCT_BILLING,
  PRODUCT_COLUMNS,
  PRODUCT_NAME_COL_W,
  PRODUCT_STATUSES,
} from "./products-config";

const ROW_H = 36;

export function ProductGroup({
  group,
  products,
  users,
  isNew = false,
  onToggleCollapse,
  onRenameGroup,
  onPatchProduct,
  onAddProduct,
}: {
  group: CrmProductGroup;
  products: CrmProduct[];
  users: CrmUser[];
  isNew?: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  onPatchProduct: (productId: string, patch: Partial<CrmProduct>) => void;
  onAddProduct: (name: string) => void;
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

  const statusSegments = PRODUCT_STATUSES.map((s) => ({
    color: s.color,
    count: products.filter((p) => p.status === s.key).length,
  })).filter((s) => s.count > 0);

  const totalPrice = products.reduce((s, p) => s + (Number(p.price) || 0), 0);

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
          {products.length} Items
        </span>
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit overflow-hidden">
          {/* column headers */}
          <div className="flex h-[36px] w-fit items-stretch">
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: PRODUCT_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={products.length > 0 && selected.size === products.length}
                  onChange={() =>
                    setSelected(
                      selected.size === products.length
                        ? new Set()
                        : new Set(products.map((p) => p.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Item
              </span>
            </div>
            {PRODUCT_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="relative flex items-center justify-center gap-[4px] whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
                style={{ width: col.w }}
              >
                {col.label}
              </span>
            ))}
            <span className="flex w-[40px] items-center justify-center border-b border-t border-line bg-white">
              <Icon name="tlAdd" size={16} />
            </span>
          </div>

          {/* rows */}
          {products.map((product) => (
            <div
              key={product.id}
              className="group/row flex w-fit items-stretch"
              style={{ height: ROW_H }}
            >
              <div
                className="sticky left-0 z-10 flex items-stretch bg-white"
                style={{ width: PRODUCT_NAME_COL_W }}
              >
                <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                  <Checkbox
                    label={`Select ${product.name}`}
                    checked={selected.has(product.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(product.id)) next.delete(product.id);
                        else next.add(product.id);
                        return next;
                      })
                    }
                  />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                  <InlineEdit
                    value={product.name}
                    onSave={(name) => onPatchProduct(product.id, { name })}
                    className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                  />
                  <button
                    type="button"
                    aria-label={`Open ${product.name}`}
                    className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                  >
                    <Icon name="rowOpen" size={16} />
                  </button>
                </span>
              </div>

              {PRODUCT_COLUMNS.map((col) => {
                const w = { width: col.w };
                switch (col.key) {
                  case "owner":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OwnerCell
                          owner={users.find((u) => u.id === product.owner_id)}
                          users={users}
                          onSelect={(ownerId) => onPatchProduct(product.id, { owner_id: ownerId })}
                        />
                      </span>
                    );
                  case "status":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={product.status}
                          options={PRODUCT_STATUSES}
                          onSelect={(next) => onPatchProduct(product.id, { status: next })}
                        />
                      </span>
                    );
                  case "price":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <NumberCell
                          value={product.price}
                          format={money}
                          onSave={(next) => onPatchProduct(product.id, { price: next })}
                        />
                      </span>
                    );
                  case "billing":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={product.billing}
                          options={PRODUCT_BILLING}
                          onSelect={(next) => onPatchProduct(product.id, { billing: next })}
                        />
                      </span>
                    );
                  case "sku":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <CenterEditCell
                          value={product.sku}
                          onSave={(next) => onPatchProduct(product.id, { sku: next })}
                        />
                      </span>
                    );
                  case "description":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <TextCell
                          value={product.description}
                          onSave={(next) => onPatchProduct(product.id, { description: next || null })}
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

          {/* add product row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: PRODUCT_NAME_COL_W }}
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
                      onAddProduct(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add item"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: PRODUCT_COLUMNS.reduce((s, c) => s + c.w, 0) + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span
              className="sticky left-0 z-10 block bg-white"
              style={{ width: PRODUCT_NAME_COL_W }}
            />
            {PRODUCT_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex flex-col items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "status" && statusSegments.length > 0 && (
                  <BatteryBar segments={statusSegments} />
                )}
                {col.key === "price" && totalPrice > 0 && (
                  <>
                    <span className="font-sans text-[14px] leading-[18px] text-ink">
                      {money(totalPrice)}
                    </span>
                    <span className="font-sans text-[12px] leading-[14px] text-ink-muted">sum</span>
                  </>
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
