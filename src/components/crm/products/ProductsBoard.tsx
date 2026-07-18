"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { canAnimate } from "@/lib/motion";
import type { CrmProduct, CrmProductGroup, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { ProductGroup } from "./ProductGroup";
import {
  addProduct,
  addProductGroup,
  renameProductGroup,
  setProductGroupCollapsed,
  updateProduct,
} from "@/app/(app)/crm/products/actions";

export function ProductsBoard({
  profile,
  groups,
  products,
  users,
}: {
  profile: CrmUser;
  groups: CrmProductGroup[];
  products: CrmProduct[];
  users: CrmUser[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localProducts, setLocalProducts] = useState(products);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  useEffect(() => setLocalProducts(products), [products]);
  useEffect(() => setLocalGroups(groups), [groups]);

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".board-anim", {
        y: 14,
        opacity: 0,
        duration: 0.35,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  const patchProduct = (productId: string, patch: Partial<CrmProduct>) => {
    const prevRow = localProducts.find((p) => p.id === productId);
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...patch } : p))
    );
    updateProduct(productId, patch as Record<string, unknown>);
    if (prevRow) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevRow[k as keyof CrmProduct] ?? null])
      ) as Partial<CrmProduct>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          setLocalProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, ...previous } : p))
          );
          updateProduct(productId, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleAddProduct = async (groupId: string, name: string) => {
    setLocalProducts((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New product",
        group_id: groupId,
        owner_id: null,
        status: null,
        price: null,
        billing: null,
        sku: null,
        description: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addProduct(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addProductGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Products & Services"
            tabs={["Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New item"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddProduct(first.id, "New product");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <ProductGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              products={localProducts.filter(
                (p) =>
                  p.group_id === group.id &&
                  (!search.trim() ||
                    p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (p.sku ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                    (p.description ?? "")
                      .toLowerCase()
                      .includes(search.trim().toLowerCase())) &&
                  (!personFilter || p.owner_id === personFilter)
              )}
              users={users}
              onToggleCollapse={(collapsed) => {
                setProductGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameProductGroup(group.id, name);
              }}
              onPatchProduct={patchProduct}
              onAddProduct={(name) => handleAddProduct(group.id, name)}
            />
          ))}

          <div className="sticky left-0 w-fit pb-[40px] pt-[8px]">
            <button
              type="button"
              onClick={handleAddGroup}
              className="flex h-[32px] items-center gap-[8px] rounded-[4px] border border-line-strong px-[9px] py-[5px] font-sans text-[14px] leading-[22px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="grpAdd" size={20} />
              Add new group
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <SuccessToast
          message={toast.message}
          onUndo={toast.undo}
          onClose={() => setToast(null)}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
