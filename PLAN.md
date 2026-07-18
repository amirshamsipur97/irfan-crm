# Irfan CRM — Project Plan

Custom lead-management CRM for Irfan Investment, replacing Zoho. Monday.com-style
UI (user supplies Figma material via HTML-to-design + step-by-step screenshots).
~10–15 agents + admin. Final domain: `crm.irfaninvest.com` (Vercel).
Later: attached to the irfanapp/NexProp dashboard as a separate extension.

## Stack

- **Frontend:** Next.js 16 (App Router, TypeScript) + Tailwind CSS 4
- **Backend/DB/Auth/Storage:** Supabase — project `owgvrxipqlusepozlujv`
  ("irfaninvest property", same project as the website leads + irfanapp, so the
  future dashboard integration is a simple join, and website leads can be
  imported via `crm_leads.website_lead_id`)
- **Deploy:** Vercel (`vercel deploy --prod --yes`), domain set at the end

## Database (DONE — migration `crm_core_schema`)

All CRM tables are prefixed `crm_` and fully RLS-protected:

| Table | Purpose |
|---|---|
| `crm_users` | agent/admin profiles (1:1 with auth.users), avatar, role, active flag |
| `crm_invites` | invite-only signup gate (admin creates; trigger validates) |
| `crm_pipelines` | boards (seeded: "Sales Pipeline") |
| `crm_stages` | Monday-style columns w/ color + position (seeded: New Lead → Contacted → Qualified → Meeting → Negotiation → Won → Lost) |
| `crm_leads` | leads: contact info, source, budget, stage, owner, priority, follow-up, `custom` jsonb, optional link to website `leads` |
| `crm_activities` | timeline: note/call/email/meeting/whatsapp/stage_change |
| `crm_tasks` | tasks with assignee, due date, status |
| `crm_lead_stage_history` | auto-logged stage transitions (funnel analytics) |

Storage: public bucket `crm-avatars` (users upload under their own uid folder).

### Auth model
- Supabase Auth email+password. Signup passes `{ app: "crm" }` metadata.
- DB trigger `crm_handle_new_auth_user`: **first CRM signup becomes admin**;
  everyone after must have an unused row in `crm_invites` (invite-only —
  strangers with the anon key cannot join).
- Roles: `admin` (sees/manages everything, invites, pipelines/stages, deletes)
  and `agent` (sees team data, edits own leads/tasks/activities).
- Privilege guard trigger: only admins can change `role` / `is_active`.

## Phases

1. ✅ **Planning + database + scaffold**
1b. ✅ **App shell + Agent Home + Workspace home** (2026-07-16) — pixel build
   from Figma `Irfan-invest` file (nodes 884-38531, 883-30112): design tokens in
   globals.css, 70+ exported assets in public/figma + map in
   src/lib/figma-icons.ts, shell (TopBar/IconRail/AnnouncementBanner/AiFloaty),
   Home widgets wired to live Supabase KPIs, CRM WorkspaceSidebar + workspace
   header/tabs/content table. GSAP entrance/hover animations (guarded by
   src/lib/motion.ts canAnimate — never animate in hidden tabs).
   Board routes (/crm/leads …) are placeholders for the next steps.
1i. ✅ **Client Projects board** (2026-07-17, no dedicated Figma frame — built
   on the shared board pattern per HANDOFF): /crm/projects — groups Active
   Projects (#579bfc) / Completed Projects (#00c875) seeded; columns Owner
   (member picker) / Status (OptionCell: Planning #a25ddc, In Progress
   #fdab3d, Done #00c875, Stuck #e2445c; battery footer) / Timeline (NEW
   TimelineRangeCell — group-colored range pill "Jul 6 – Aug 14", popover with
   start/end date pickers) / Priority (High/Medium/Low) / Project value
   (money, sum footer) / Account (connected chip, green underline) / Notes.
   DB: migration `crm_projects_schema` (crm_project_groups + crm_projects,
   full RLS crm_is_member/crm_is_admin) + 4 demo rows. Reuses OwnerCell,
   OptionCell, ChipCell, NumberCell, TextCell, generic BoardHeader.
1h. ✅ **Sales Dashboard** (2026-07-17, light-mode): /crm/dashboard — 10 live
   widgets computed from real board data: Annual/Monthly Target (gauge + scale
   bar, targets stored in `crm_dashboard_settings`: annual_target,
   monthly_target, forecast_goal — admin-editable), Average Deal Value, Active
   deals Forecast, Deal status pie (stage colors), Actual Revenue by Month
   (won deals by close date), Pipeline conversion funnel (reached-stage
   counts + % pills + Conversion-to-Won), Activity tracker (stacked bars per
   member from crm_activity_items, functional 7D/30D toggle), Forecasted
   Revenue by month (+ dashed Goal line) and by Stage. All charts are custom
   SVG/CSS — no chart library, no PHP/Python needed (Next.js server computes).
1g. ✅ **Activities board** (2026-07-17, from user screenshot; built light-mode
   per instruction): group Account Activities; columns Owner / Activity Type
   (Call summary #fdab3d, Meeting #579bfc, Email, Note) / Start & End time
   ("Jun 30, 7:00 PM" format, native datetime picker overlay) / Status (Done
   lime #9cd326, Scheduled, Canceled; lime battery footer) / Related item
   (bordered chip linking a deal by name). Header without Import
   (BoardHeader gained showImport prop). DB: migration
   `crm_activity_items_schema` (crm_activity_groups + crm_activity_items —
   separate from the per-lead crm_activities timeline log) + demo rows.
1f. ✅ **Accounts board** (2026-07-17) — Figma node 897-40595: tabs Main View /
   Main table; group Companies (#579bfc) seeded; columns Domain (external
   link, inline edit) / Industry (multi-tag text[] chips + dark "+N" overflow,
   comma-separated inline edit) / Description / No. of employees / HQ location
   / timeline / **Contacts + Deals (computed live by account_name, green
   connected underline)**. DB: migration `crm_accounts_schema`.
   FIX across all boards: editable cells now commit on Enter directly
   (commit() shared by Enter + blur) — blur-only saving was fragile.
1e. ✅ **Contacts board** (2026-07-17) — Figma node 883-29298: groups Active
   Contacts (#00c875) / Inactive Contacts (#bb3354); columns Email (link,
   inline edit) / timeline / Accounts chip / **Deals + Deals value (computed
   live from crm_deals by contact name, green connected-column underline
   #037f4c, "+N" overflow chips)** / Phone (flag) / Title tag chip / Type
   (Customer #66ccff, Partner #fdab3d, Prospect, Vendor) / Priority (High
   #ff642e, Medium, Low; battery footer incl. gray empties) / Comments text.
   DB: migration `crm_contacts_schema` (crm_contact_groups seeded + RLS).
   New reusable cells: OptionCell / TitleCell / TextCell / DealsChipCell.
1d. ✅ **Deals board** (2026-07-17) — Figma node 883-28495: THREE functional
   views behind the shared BoardHeader tabs — Main table (groups Active Deals /
   Closed Won, columns: timeline/Stage/Owner/Deal Value/Contacts/Accounts/
   Expected Close Date (done-toggle + strikethrough)/Close Probability/Forecast
   Value (computed value×probability)/Last interaction/Quotes/Forecast
   categories; sum + battery footers), Sales report (live KPI tiles + by-stage
   and by-category value bars), Pipeline (kanban per deal stage w/ move-to-stage
   menu). DB: migration `crm_deals_schema` (crm_deal_stages seeded
   Discovery/Proposal/Negotiation/Won/Lost, crm_deal_groups seeded Active
   Deals/Closed Won, crm_deals w/ RLS). BoardHeader is now generic
   (title/tabs/newLabel props); InlineEdit+Checkbox moved to leads/cells.tsx.
1c. ✅ **Leads board** (2026-07-17) — Figma node 883-28125: board header
   (title/views tabs/toolbar w/ #007f9b New lead split button), grouped main
   table (color stripe, sticky name column, Status & Owner popover editors,
   activities timeline bars, Move to Contacts, source tags, footer summary
   batteries), inline add/rename for leads+groups, GSAP group collapse.
   DB: migration `crm_lead_groups` (+ crm_leads.group_id/title) and
   `crm_fix_stage_change_trigger` (stage logging moved to AFTER UPDATE —
   BEFORE trigger + activity touch caused pg error 27000).
2. **Auth & team** — polish login/signup per Figma, profile page w/ avatar
   upload, admin "Team" page (invite agents, activate/deactivate, photos)
3. **Leads board (core)** — Monday-style board: grouped table + kanban by
   stage, drag between stages, inline edit, lead detail drawer (timeline,
   notes, tasks), filters/search/sort
4. **Tasks & follow-ups** — my-tasks view, due dates, overdue indicators
5. **Admin dashboard** — stats: leads per agent, funnel conversion
   (`crm_lead_stage_history`), sources, response times, activity leaderboard
6. **Website lead import** — pull rows from public `leads` (192 rows) into
   `crm_leads` (source = website/ads/AI-chat), optional auto-sync trigger
7. **Deploy** — Vercel prod + `crm.irfaninvest.com` DNS
8. **Dashboard extension** — surface CRM data inside irfanapp (same Supabase,
   read via existing service-role API routes)

UI phase (2→5) is driven by the user's Monday screenshots + Figma MCP,
built step by step, one section at a time.

## UI Map (from Monday CRM screenshots — 2026-07-16)

User is extracting 5 main Monday pages into Figma via html.to.design:
interfaces + step-by-step data screenshots + a components/design-system section.
Build only when the Figma link/material for each part arrives.

### Layout skeleton (shared by every page)
1. **Global top bar** — product logo, global search ("Search for anything…"),
   icon cluster: notifications (red badge), inbox (badge), invite member,
   apps, settings, help, avatar menu.
2. **Icon rail** (far-left, ~72px) — Home, CRM, (Monday also: Sidekick, Agents,
   Tools, Notetaker, More — ours will start with Home + CRM and grow).
   Active item = filled/tinted state.
3. **Contextual sidebar** (only inside CRM section, collapsible) — workspace
   switcher dropdown + add, search, Content tree: Workspace home, Contacts,
   Deals, Leads, Accounts, Client Projects, Products & Services, Activities,
   Sales Dashboard. Bottom: sync/import status panel.
4. **Main content area** — page-specific.

### Page 1 — Home (per-user panel)
- Date line + time-aware greeting ("Good afternoon, Amir") from crm_users.full_name.
- Top-right: quick-add (+) and Customize.
- Widget: **Sales pipeline** card — tabs All/Deals, expand; KPI tiles:
  *Total pipeline value* (sum of open-lead budget) + "N open deals" chip,
  *Closed won (this month)* (stage.is_won transitions this month from
  crm_lead_stage_history).
- Widget: **Meetings** — calendar connect (Google/Outlook). v1 = skip or
  placeholder "not connected" state.
- More widgets below the fold (await next screenshots).

### Page 2 — CRM workspace home
- Workspace hero: avatar tile, name, editable description, actions
  (Members, …); tabs: Recents / Content / Collaborators / Permissions.
- Recents tab = list of boards (Leads, Deals, Contacts, Activities,
  Products & Services) each with favorite star.
- Boards map to our data: Leads→crm_leads, Activities→crm_activities,
  Sales Dashboard→admin stats. Contacts/Accounts/Deals/Products = decision
  pending (see below).

### Data-model decisions flagged
- **Deals vs Leads**: Monday splits lead → deal (deal carries the $ value that
  feeds Home KPIs). Our v1 keeps a single crm_leads with `budget` + won/lost
  stages; a separate crm_deals (+ conversion) can be added later without
  breaking the board UI. Confirm with user before building the Deals board.
- Contacts/Accounts/Client Projects/Products & Services boards: later phases,
  only if user wants full Monday parity.
- Favorites, Recents, workspace description, board permissions → small
  support tables when we reach that step (e.g. crm_user_favorites).
- Notifications/inbox icons: v1 static; real notifications = later phase.

### Component inventory expected from the Figma design-system section
top bar, icon-rail item, sidebar tree item, workspace switcher, tabs, primary/
secondary buttons, icon button w/ badge, KPI card, widget card w/ header
actions, chip/pill, favorite star row, avatar (+status), dropdown menu,
search input, empty/connect states.

### Build order (each step waits for its Figma material)
1. App shell: top bar + icon rail + CRM sidebar + routing (`/` Home, `/crm`,
   `/crm/boards/[id]`) — everything else plugs into this.
2. Home page widgets wired to real Supabase data.
3. CRM workspace home (board list + hero + tabs).
4. Leads board — Monday-style grouped table (the core screen).
5. Lead detail drawer/page + activities timeline + tasks.
6. Sales Dashboard (admin) + Team/Members page (invites, avatars).

## Conventions

- All CRM objects live in `public` schema with `crm_` prefix — never touch
  the website/irfanapp tables from this app except the read-only import.
- Every new table ships with RLS enabled + policies in the same migration.
- Types in `src/lib/types.ts` mirror the DB; update together with migrations.
- Server components query Supabase directly; mutations via server actions.

## Env

`.env.local` (already written, not committed):
- `NEXT_PUBLIC_SUPABASE_URL=https://owgvrxipqlusepozlujv.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_H93…` (default publishable key)
