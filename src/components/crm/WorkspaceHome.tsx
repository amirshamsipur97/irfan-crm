"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Surface } from "@/components/shell/AppChrome";
import { type IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";
import { isFullAccess, ROLE_LABELS } from "@/lib/permissions";
import { toggleBoardFavorite } from "@/app/(app)/crm/actions";
import { MessageDialog } from "@/components/crm/message-dialog";
import { SuccessToast } from "@/components/ui/SuccessToast";

export interface WorkspaceBoardRow {
  key: string;
  name: string;
  icon: IconName;
  href: string;
  created: string | null;
  modified: string | null;
}

export interface WorkspaceUserRow {
  id: string;
  name: string;
  email: string;
  role: import("@/lib/types").CrmRole;
  avatarUrl: string | null;
}

export interface WorkspaceHomeData {
  currentUserId: string;
  fullName: string;
  avatarUrl: string | null;
  createdLabel: string;
  boards: WorkspaceBoardRow[];
  /** board keys ordered by last visit, newest first */
  recents: string[];
  favorites: string[];
  users: WorkspaceUserRow[];
}

const TABS: { label: string; icon: IconName; disabled?: boolean }[] = [
  { label: "Recents", icon: "tabRecents" },
  { label: "Content", icon: "tabContent" },
  { label: "Collaborators", icon: "tabCollaborators" },
];

function StarButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="flex size-[32px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 3.6l2.53 5.13 5.66.82-4.1 3.99.97 5.64L12 16.52l-5.06 2.66.97-5.64-4.1-3.99 5.66-.82L12 3.6z"
          fill={active ? "#ffcb00" : "none"}
          stroke={active ? "#ffcb00" : "#676879"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function WorkspaceHome({ data }: { data: WorkspaceHomeData }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Recents");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set(data.favorites));
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<WorkspaceUserRow | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);

  useGSAP(
    () => {
      if (!canAnimate()) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.from(".ws-icon-tile", { scale: 0.7, opacity: 0, duration: 0.4, ease: "back.out(1.6)" })
        .from(".ws-title-block", { y: 12, opacity: 0, duration: 0.35 }, "-=0.2")
        .from(".ws-tabs", { y: 10, opacity: 0, duration: 0.3 }, "-=0.15");
    },
    { scope: rootRef }
  );

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".ws-row", {
        opacity: 0,
        y: 10,
        duration: 0.25,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef, dependencies: [activeTab] }
  );

  const toggleRow = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleFavorite = (key: string) => {
    const nextOn = !favorites.has(key);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (nextOn) next.add(key);
      else next.delete(key);
      return next;
    });
    toggleBoardFavorite(key, nextOn);
  };

  const byKey = new Map(data.boards.map((b) => [b.key, b]));
  // recents: visited boards first (newest visit first), then the rest in default order
  const recentBoards = [
    ...data.recents.map((k) => byKey.get(k)).filter((b): b is WorkspaceBoardRow => !!b),
    ...data.boards.filter((b) => !data.recents.includes(b.key)),
  ];

  const filteredBoards = data.boards.filter((b) =>
    b.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const admins = data.users.filter((u) => isFullAccess(u.role));
  const creator = admins[0] ?? data.users[0];

  return (
    <Surface>
      <div ref={rootRef} className="thin-scroll h-full overflow-y-auto">
        {/* cover */}
        <div className="h-[180px] w-full bg-[#f5f6f8]" />

        {/* workspace header */}
        <div className="-mt-[37px] flex items-start px-[64px]">
          <div className="pr-[20px]">
            <div className="ws-icon-tile relative rounded-[24px] border-4 border-white bg-white p-[4px] drop-shadow-[0px_2px_3px_rgba(0,0,0,0.2)]">
              <div className="relative flex size-[100px] items-center justify-center rounded-[20px] bg-azure">
                <span className="font-sans text-[52px] font-medium leading-[78px] text-white">
                  C
                </span>
                <Icon
                  name="hdrHomeBadge"
                  size={40}
                  className="absolute -bottom-[10px] left-[76px]"
                />
              </div>
            </div>
          </div>

          <div className="ws-title-block flex min-w-0 flex-1 items-start justify-between pt-[42px]">
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-[4px] pt-[8px]">
                <h1 className="rounded-[4px] border border-transparent px-[5px] py-px font-display text-[32px] font-medium leading-[40px] tracking-[-0.5px] text-ink transition-colors hover:border-line-strong">
                  CRM
                </h1>
                <IconButton icon="hdrEdit" size={32} label="Change icon" />
              </div>
              <p className="mt-[4px] w-fit cursor-text rounded-[4px] border border-transparent px-[5px] py-px font-sans text-[16px] leading-[22px] text-ink-muted transition-colors hover:border-line-strong">
                Add workspace description
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-[8px] pt-[12px]">
              <span onClick={() => setActiveTab("Collaborators")}>
                <Button variant="outline">Members</Button>
              </span>
            </div>
          </div>
        </div>

        {/* tabs + content */}
        <div className="ws-tabs relative px-[64px] pb-[48px] pt-[24px]">
          <div className="relative flex h-[40px] w-full">
            <span className="absolute inset-x-0 bottom-0 h-[2px] bg-line-soft" />
            {TABS.map((tab) => {
              const active = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && setActiveTab(tab.label)}
                  className={`relative flex h-[38px] items-center gap-[8px] px-[16px] py-[4px] font-sans text-[16px] leading-[22px] transition-colors ${
                    tab.disabled
                      ? "cursor-not-allowed text-ink-disabled"
                      : "text-ink hover:bg-[var(--hover-ghost)]"
                  } rounded-t-[4px]`}
                >
                  <Icon name={tab.icon} size={18} className={tab.disabled ? "opacity-40" : ""} />
                  {tab.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-teal-deep" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ------- Recents ------- */}
          {activeTab === "Recents" && (
            <div className="flex flex-col pt-[16px]">
              {recentBoards.map((board) => (
                <div
                  key={board.key}
                  className="ws-row flex h-[56px] items-center justify-between border-b border-line transition-colors hover:bg-canvas"
                >
                  <Link
                    href={board.href}
                    className="flex h-full min-w-0 flex-1 items-center gap-[12px] px-[16px]"
                  >
                    <Icon name={board.icon} size={18} />
                    <span className="truncate font-sans text-[15px] leading-[22px] text-ink">
                      {board.name}
                    </span>
                  </Link>
                  <span className="px-[8px]">
                    <StarButton
                      active={favorites.has(board.key)}
                      onToggle={() => toggleFavorite(board.key)}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ------- Content ------- */}
          {activeTab === "Content" && (
            <div className="flex flex-col gap-[8px] pt-[8px]">
              {/* toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  {searchOpen ? (
                    <span className="flex h-[32px] items-center gap-[6px] rounded-[4px] border border-teal-deep bg-white px-[8px]">
                      <Icon name="tblSearch" size={16} />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onBlur={() => {
                          if (!search.trim()) setSearchOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearch("");
                            setSearchOpen(false);
                          }
                        }}
                        placeholder="Search this workspace"
                        className="w-[200px] bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
                      />
                    </span>
                  ) : (
                    <span onClick={() => setSearchOpen(true)}>
                      <Button icon="tblSearch">Search</Button>
                    </span>
                  )}
                </div>
              </div>

              {/* content table */}
              <div className="rounded-[8px] border border-line p-px">
                <div className="thin-scroll overflow-x-auto rounded-[8px] bg-white">
                  <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                      <tr className="h-[40px] border-b border-line">
                        <th className="w-[380px] px-[16px] text-left">
                          <span className="flex items-center">
                            <span className="flex items-center pr-[8px]">
                              <input
                                type="checkbox"
                                aria-label="Select all"
                                className="size-[16px] cursor-pointer appearance-none rounded-[2px] border border-line-strong bg-check checked:border-teal checked:bg-teal"
                                checked={
                                  filteredBoards.length > 0 &&
                                  filteredBoards.every((b) => checked.has(b.name))
                                }
                                onChange={() =>
                                  setChecked((prev) => {
                                    const next = new Set(prev);
                                    const allOn = filteredBoards.every((b) => next.has(b.name));
                                    filteredBoards.forEach((b) =>
                                      allOn ? next.delete(b.name) : next.add(b.name)
                                    );
                                    return next;
                                  })
                                }
                              />
                            </span>
                            <span className="pl-[8px] font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                              Asset name
                            </span>
                          </span>
                        </th>
                        <th className="w-[110px] px-[16px] text-left font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                          Creator
                        </th>
                        <th className="w-[150px] px-[16px] text-left font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                          Creation date
                        </th>
                        <th className="w-[145px] px-[16px] text-left font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                          Last modified
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBoards.map((board, i) => (
                        <tr
                          key={board.key}
                          className={`ws-row h-[40px] transition-colors hover:bg-canvas ${
                            i === filteredBoards.length - 1 ? "" : "border-b border-line"
                          }`}
                        >
                          <td className="px-[16px]">
                            <span className="flex items-center">
                              <span className="flex items-center pr-[8px]">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${board.name}`}
                                  className="size-[16px] cursor-pointer appearance-none rounded-[2px] border border-line-strong bg-check checked:border-teal checked:bg-teal"
                                  checked={checked.has(board.name)}
                                  onChange={() => toggleRow(board.name)}
                                />
                              </span>
                              <Link
                                href={board.href}
                                className="flex items-center gap-[8px] pl-[8px] hover:underline"
                              >
                                <Icon name={board.icon} size={16} />
                                <span className="font-sans text-[15px] leading-[22.5px] text-ink">
                                  {board.name}
                                </span>
                              </Link>
                            </span>
                          </td>
                          <td className="px-[16px]">
                            <Avatar
                              name={creator?.name ?? data.fullName}
                              src={creator?.avatarUrl ?? data.avatarUrl}
                              size={28}
                            />
                          </td>
                          <td className="px-[16px] font-sans text-[14px] leading-[20px] text-ink">
                            {board.created ?? "—"}
                          </td>
                          <td className="px-[16px] font-sans text-[14px] leading-[20px] text-ink">
                            {board.modified ?? "—"}
                          </td>
                        </tr>
                      ))}
                      {filteredBoards.length === 0 && (
                        <tr className="h-[64px]">
                          <td
                            colSpan={4}
                            className="px-[16px] text-center font-sans text-[14px] text-ink-muted"
                          >
                            No boards match “{search}”
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------- Collaborators ------- */}
          {activeTab === "Collaborators" && (
            <div className="flex flex-col pt-[24px]">
              {/* Users */}
              <h2 className="ws-row font-display text-[20px] font-medium leading-[28px] tracking-[-0.1px] text-ink">
                Users
              </h2>
              <div className="ws-row mt-[12px] flex h-[36px] items-center border-b border-line">
                <span className="w-[38%] font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                  User name &amp; title
                </span>
                <span className="w-[38%] font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                  Email
                </span>
                <span className="flex-1 font-sans text-[14px] font-semibold leading-[20px] text-ink-muted">
                  Workspace role
                </span>
              </div>
              {data.users.map((user) => (
                <div
                  key={user.id}
                  className="ws-row flex h-[56px] items-center border-b border-line"
                >
                  <span className="flex w-[38%] items-center gap-[10px]">
                    <Avatar name={user.name} src={user.avatarUrl} size={32} />
                    <span className="truncate font-sans text-[15px] leading-[22px] text-ink">
                      {user.name}
                    </span>
                  </span>
                  <span className="w-[38%] truncate font-sans text-[14px] leading-[20px] text-ink">
                    {user.email}
                  </span>
                  <span className="flex flex-1 items-center gap-[6px]">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M2.5 5.5l2.7 2.2L8 3.9l2.8 3.8 2.7-2.2-.9 6H3.4l-.9-6z"
                        stroke="#676879"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="font-sans text-[14px] leading-[20px] text-ink">
                      {ROLE_LABELS[user.role]}
                    </span>
                    {user.id !== data.currentUserId && (
                      <button
                        type="button"
                        onClick={() => setMsgTarget(user)}
                        className="ml-auto rounded-[4px] border border-line-strong px-[10px] py-[3px] font-sans text-[12px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                      >
                        Message
                      </button>
                    )}
                  </span>
                </div>
              ))}
              <p className="ws-row pt-[16px] text-center font-sans text-[13px] leading-[18px] text-ink-muted">
                All members of Irfan Invest are members in this workspace
              </p>
            </div>
          )}
        </div>
      </div>
      {msgTarget && (
        <MessageDialog
          toId={msgTarget.id}
          toName={msgTarget.name}
          toAvatar={msgTarget.avatarUrl}
          onClose={() => setMsgTarget(null)}
          onDone={(message, tone) => setToast({ message, tone })}
        />
      )}
      {toast && (
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
      <AiFloaty />
    </Surface>
  );
}
