import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { BOARD_META } from "@/lib/boards";
import {
  WorkspaceHome,
  type WorkspaceBoardRow,
  type WorkspaceUserRow,
} from "@/components/crm/WorkspaceHome";
import type { CrmUser } from "@/lib/types";

function dateLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CrmWorkspacePage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  // per-board stats: min(created_at) + max(updated_at) of the backing table
  const boardStats = Promise.all(
    BOARD_META.map(async (meta): Promise<WorkspaceBoardRow> => {
      if (!meta.table) {
        return {
          key: meta.key,
          name: meta.name,
          icon: meta.icon,
          href: meta.href,
          created: null,
          modified: null,
        };
      }
      const [{ data: first }, { data: last }] = await Promise.all([
        supabase
          .from(meta.table)
          .select("created_at")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle<{ created_at: string }>(),
        supabase
          .from(meta.table)
          .select("updated_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ updated_at: string }>(),
      ]);
      return {
        key: meta.key,
        name: meta.name,
        icon: meta.icon,
        href: meta.href,
        created: dateLabel(first?.created_at ?? null),
        modified: dateLabel(last?.updated_at ?? null),
      };
    })
  );

  const [boards, { data: pipeline }, { data: visits }, { data: favorites }, { data: users }] =
    await Promise.all([
      boardStats,
      supabase
        .from("crm_pipelines")
        .select("created_at")
        .order("position")
        .limit(1)
        .maybeSingle<{ created_at: string }>(),
      supabase
        .from("crm_board_visits")
        .select("board_key, visited_at")
        .eq("user_id", profile.id)
        .order("visited_at", { ascending: false })
        .returns<{ board_key: string; visited_at: string }[]>(),
      supabase
        .from("crm_board_favorites")
        .select("board_key")
        .eq("user_id", profile.id)
        .returns<{ board_key: string }[]>(),
      supabase
        .from("crm_users")
        .select("*")
        .eq("is_active", true)
        .order("created_at")
        .returns<CrmUser[]>(),
    ]);

  const createdLabel =
    dateLabel(pipeline?.created_at ?? null) ?? dateLabel(new Date().toISOString())!;

  // boards with no rows yet fall back to the workspace creation date
  const withFallback = boards.map((b) => ({
    ...b,
    created: b.created ?? createdLabel,
    modified: b.modified ?? b.created ?? createdLabel,
  }));

  const userRows: WorkspaceUserRow[] = (users ?? []).map((u) => ({
    id: u.id,
    name: u.full_name || u.email,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatar_url,
  }));

  return (
    <WorkspaceHome
      data={{
        fullName: profile.full_name || profile.email,
        avatarUrl: profile.avatar_url,
        createdLabel,
        boards: withFallback,
        recents: (visits ?? []).map((v) => v.board_key),
        favorites: (favorites ?? []).map((f) => f.board_key),
        users: userRows,
      }}
    />
  );
}
