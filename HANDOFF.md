# Irfan CRM — Session Handoff

> Read this + `PLAN.md` first. This file is the single source of truth for
> continuing the build in a new session. Updated: 2026-07-18 (end of the big
> 07-18 session; all work checkpointed in git commit a18c1cd).

## CURRENT STATE SNAPSHOT (2026-07-18 end)

- **LIVE**: https://irfan-crm.vercel.app (Vercel project `irfan-crm`, scope
  amirshamsipurs-projects; deploy = `npx vercel deploy --prod --yes`).
  Local dev: preview_start `irfan-crm`, port 3070; /preview auto-login works
  locally only (DEMO_* not on Vercel → 404 in prod, by design).
- **Auth is DONE end-to-end**: Figma login/signup pages (AuthShell +
  "Power By NeXPROP" footer), registration = company domain
  (irfaninvest.com, kioskoman.com in `crm_registration_settings`) OR
  `crm_invites` row, 20-active-agent cap, Google OAuth enabled + verified,
  `crm_claim_membership()` RPC heals invited-after-signin users,
  /auth/callback + /auth/denied, proxy lets /auth/* through.
  Members: preview admin (dev), amiralishamsipur@gmail.com (ADMIN — user's
  real account), amirshamsipur1997@kioskoman.com (admin),
  korooshkhaleghi72@gmail.com (agent). Unused admin invites:
  amirshamsipur1997@gmail.com, a.shamsipour@irfaninvest.com.
- **All 6 boards + dashboard functional**; cross-board features: activity
  logging (+ on timeline → menu/composer) on leads/deals/contacts/accounts;
  ConnectPicker (find-or-create) for deals contacts+accounts AND contacts
  accounts; SuccessToast w/ real undo on cell edits (leads/deals/contacts/
  accounts); board Search + Person filters; popovers are fixed-positioned
  (never clipped — see memory gotcha, always use Popover/anchorFixedPos).
- **Data**: user is entering REAL company data now (Google/Apple/Amazon/
  Irfaninvest/Microsoft accounts, deals with values). DO NOT wipe.
- **Deepest detail lives in the auto-memory file** (irfan-crm entry) —
  per-feature notes, testing gotchas (hidden-tab freezes, 0-viewport
  webview, '.ws-tabs button' selectors), and the NEXT list.

## What this project is

Custom Monday.com-style CRM for Irfan Investment (replaces Zoho). ~10–15 agents
+ admin. Design is pixel-copied from the user's Figma file
`6miTfu9ktj3SlAFCmSSER8` ("Irfan invest", built via html.to.design from their
green-branded Monday instance). **The word "monday" must never appear in the
product.** Final deploy: Vercel → `crm.irfaninvest.com` (NOT done yet). Later it
gets attached as an extension to the irfanapp/NexProp dashboard.

## Stack & how to run

- Next.js 16.2 (App Router, TS, `src/`, Tailwind 4), React 19, GSAP 3.15 +
  `@gsap/react`, `@supabase/ssr`.
- Dev: launch.json name `irfan-crm`, port **3070** (`npm run dev`).
- Supabase project `owgvrxipqlusepozlujv` (SAME project as whitewill website +
  irfanapp — shared `leads` table lives there too, 192 website leads to import
  later via `crm_leads.website_lead_id`).
- Env in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (sb_publishable_H93…), plus DEMO_* (below).
- Next 16 notes: middleware is `src/proxy.ts` (renamed convention), `cookies()`
  is async, params are Promises.

## Auth model

- Supabase email+password, signup passes `{app:'crm', full_name}` metadata.
- DB trigger `crm_handle_new_auth_user`: FIRST signup → admin; others need an
  unused row in `crm_invites`. Privilege-guard trigger blocks non-admin
  role/is_active changes.
- ⚠️ **PREVIEW MODE ACTIVE**: `/preview` route (src/app/preview/route.ts)
  auto-signs-in using `.env.local` DEMO_LOGIN=enabled, DEMO_EMAIL=
  `preview@irfancrm.local`, DEMO_PASSWORD. That preview user CONSUMED the
  first-signup-admin bootstrap and is currently the only crm_user (admin).
  Demo rows are seeded in leads/deals/contacts/accounts/activity boards.
  **Before real launch:** delete demo rows + preview auth user, remove DEMO_*
  env + /preview from proxy PUBLIC_PATHS, then either re-arm bootstrap or
  create the user's real admin account via SQL.
- Supabase email-confirmation is ON; repeated signups get silently
  rate-limited → create test users via SQL:
  insert auth.users (encrypted_password = extensions.crypt(pw,
  extensions.gen_salt('bf')), email_confirmed_at=now(), raw_user_meta_data
  {"app":"crm",...}) + matching auth.identities row. The crm trigger fires
  normally on SQL inserts.

## Database (all `crm_` prefixed, ALL RLS-on, in public schema)

Migrations applied (in order): `crm_core_schema`, `crm_lead_groups`,
`crm_fix_stage_change_trigger`, `crm_deals_schema`, `crm_contacts_schema`,
`crm_accounts_schema`, `crm_activity_items_schema`, `crm_dashboard_settings`.

- `crm_users` (1:1 auth.users; role admin|agent), `crm_invites`
- `crm_pipelines` + `crm_stages` (lead stages, seeded 7 Monday colors)
- `crm_leads` (+group_id, title, budget, website_lead_id …)
- `crm_lead_groups` (seeded "New Leads")
- `crm_activities` = per-lead timeline LOG (auto stage_change entries)
- `crm_lead_stage_history` (funnel analytics; written by AFTER trigger —
  ⚠️ stage logging MUST stay AFTER UPDATE, BEFORE caused pg error 27000)
- `crm_deal_stages` (seeded Discovery #579bfc, Proposal #66ccff, Negotiation
  #fdab3d, Won #00c875, Lost #e2445c), `crm_deal_groups` (Active Deals /
  Closed Won), `crm_deals` (deal_value, close_probability,
  expected_close_date, is_done, contact_name, account_name,
  forecast_category best_case|commit|pipeline, lead_id)
- `crm_contact_groups` (Active #00c875 / Inactive #bb3354), `crm_contacts`
  (title, contact_type, priority high|medium|low, comments, account_name)
- `crm_account_groups` (Companies), `crm_accounts` (domain, industries text[],
  employees_range, hq_location)
- `crm_activity_groups` (Account Activities) + `crm_activity_items`
  (activity_type, status, start_at, end_at, related_item) — SEPARATE from
  crm_activities
- `crm_dashboard_settings` (key/value: annual_target 100000, monthly_target
  10000, forecast_goal 120000; admin-writable)
- Storage bucket `crm-avatars` (public, per-uid folders)
- **Connected columns are COMPUTED, not stored**: contacts.Deals ←
  crm_deals.contact_name match; accounts.Contacts/Deals ← account_name match.

## Code map

- `src/proxy.ts` — auth route guard (PUBLIC: /login /signup /preview)
- `src/lib/` — supabase clients, `types.ts` (all row types), `profile.ts`
  (cached getProfile), `figma-icons.ts` (**maps 100+ assets in
  `public/figma/`** — never hotlink Figma URLs, they expire), `motion.ts`
  (`canAnimate()` — ⚠️ every GSAP entrance MUST keep this hidden-tab guard or
  content freezes at opacity 0)
- `src/components/shell/` — AppChrome (+Surface), TopBar, IconRail,
  AnnouncementBanner (crm pages only), AiFloaty
- `src/components/home/HomeView.tsx` — Home page widgets (live KPIs from leads)
- `src/components/crm/` — WorkspaceSidebar (nav list = WORKSPACE_NAV),
  WorkspaceHome; then per-board folders: `leads/` (BoardHeader — GENERIC,
  used by all boards: title/tabs/newLabel/showAiAgents/showImport props;
  cells.tsx = shared Checkbox/InlineEdit/Popover/StatusCell/OwnerCell/
  TimelineCell/BatteryBar; board-config = GROUP_COLORS, sourceColor,
  dialFlag…), `deals/` (3 views: table/SalesReport/PipelineView kanban;
  forecastValue = value×probability), `contacts/` (OptionCell/TitleCell/
  TextCell/DealsChipCell), `accounts/` (IndustryCell multi-tag,
  DomainCell, ContactsChipCell), `activities/` (TimeCell datetime,
  RelatedItemCell), `dashboard/` (widgets.tsx = custom SVG gauge/pie/
  funnel/bars/activity-tracker — NO chart lib, NO php/python)
- `src/app/(app)/` — `/` Home, `/crm` workspace, `/crm/{leads,deals,contacts,
  accounts,activities,dashboard}` real boards, `/crm/[board]` placeholder for
  the rest. Each board folder has `actions.ts` (server actions w/ PATCHABLE
  whitelist + revalidatePath) and `page.tsx` (server fetch → client board).
- Pattern everywhere: optimistic local state (useState synced from props via
  useEffect) + fire-and-forget server action.
- ⚠️ Editable cells commit on **Enter directly** (shared `commit()` for
  Enter+blur) — do not regress to blur-only saving.

## Design system

Figtree (sans) + Poppins (display) via next/font; tokens in `globals.css`
@theme: ink #323338, ink-muted #676879, line #d0d4e4, line-strong #c3c6d4,
line-soft #e7e9ef, canvas #f6f7fb, brand #00c875, teal #00a0a0, teal-deep
#007f9b (buttons/active tabs), cyan-tint #d1ecef, cyan-soft #e7f4f6, alert
#d83a52, link #1f76c2, azure #66ccff; --active-nav rgba(174,222,229,.4),
--hover-ghost rgba(103,104,121,.1). Connected-column underline #037f4c.
Status "Done" lime #9cd326. LIGHT MODE ONLY (user explicitly said no dark
mode even when screenshots are dark).

## Verification workflow used

Browser-pane at :3070, sign in via /preview, screenshot vs Figma screenshots,
check DB effects via execute_sql. tsc must stay clean (`npx tsc --noEmit`).

## What's DONE (see PLAN.md 1a–1i for detail)

Deployed (2026-07-18): https://irfan-crm.vercel.app (Vercel project irfan-crm,
scope amirshamsipurs-projects; env = the two NEXT_PUBLIC_SUPABASE vars only,
so /preview 404s in prod by design). Google provider enabled in Supabase and
verified to Google's account chooser. TODO: add
https://irfan-crm.vercel.app/auth/callback to Supabase URL Configuration →
Redirect URLs; custom domain crm.irfaninvest.com later.

Google-signup hardening (2026-07-18 late): unapproved Google users no longer
abort the auth transaction ("Database error saving new user") — trigger
creates the auth user without a crm_users row; /auth/callback checks
membership and signs them out with a clear message; /auth/denied route breaks
the proxy↔getProfile redirect loop (proxy now lets /auth/* through even with
a session). 3 unused admin invites: amirshamsipur1997@gmail.com,
a.shamsipour@irfaninvest.com, amiralishamsipur@gmail.com.

Agent auth (2026-07-18): /login + /signup rebuilt from Figma 925-44104 /
925-44159 (IrfanInvest-branded AuthShell + cards in components/auth/).
Registration: org domain (crm_registration_settings.allowed_domains,
default irfaninvest.com) OR crm_invites row; active-agent cap
(max_agents=20, admin-editable via SQL/settings row); trigger also accepts
Google-OAuth users; crm_users gained `title`; crm_can_register RPC =
friendly pre-flight. Google button + /auth/callback wired — ACTION NEEDED:
enable the Google provider in Supabase Auth settings (Google Cloud OAuth
client, callback https://owgvrxipqlusepozlujv.supabase.co/auth/v1/callback).
Preview auto-login (/preview) still works for reviewing.

Deals activity logging (2026-07-18): "+" on the timeline cell → essentials
menu (Log meeting/Call summary/Note/Email, searchable) → composer modal
(components/crm/deals/activity-log.tsx). Add inserts into crm_activity_items
(related_item = deal name, status done) via logDealActivity and bumps
deal.last_interaction_at; logged items appear on the Activities board.

Activities board (2026-07-18): toolbar "…" menu (6 Monday items, Item height
functional: Single/Double/Triple row heights via BoardHeader itemHeight props +
ActivityGroup rowH) and Start/End time cells now open a Monday-style calendar
popover (Today, date input, clock→time input, month grid; time-of-day
preserved; open cell highlighted teal). Testing gotcha: the in-app browser
pane reports document.hidden=true AND zero viewport dims — don't rely on CSS
transitions for state changes or innerWidth for positioning.

Workspace home tabs functional (2026-07-18): Recents (visit-ordered via
crm_board_visits + favorite stars via crm_board_favorites, migration
crm_workspace_prefs), Content (real per-board created/modified dates via
BOARD_META in src/lib/boards.ts, live Search filter, row links), Collaborators
(Agents empty state + Users from crm_users). Permissions intentionally
disabled (muted in the Monday reference too). recordBoardVisit() runs in
every board page's initial Promise.all.

Auth + shell + Home; /crm workspace home; Leads / Deals (3 views) / Contacts /
Accounts / Activities / Client Projects boards; Sales Dashboard (10 live
widgets). All visually verified against Figma/screenshots, all interactive
paths tested to DB. Client Projects (2026-07-17 evening session): no Figma
frame existed, built on the shared board pattern; new TimelineRangeCell
(range pill + start/end popover) in components/crm/projects/.

Audit + activation (2026-07-18 late): toolbar Search = live filter on all 6
boards; Person = owner filter (leads/deals/projects/activities); lead timeline
"+" logs activities like deals (ActivityComposer takes a generic LogTarget).
Demo data wiped to ONE linked "Sample …" row per board (template mode).
Remaining visual-only controls are listed in the memory note.

## What's NEXT (user drives order, sends screenshots/Figma nodes)

1. **2 more Sales Dashboard sections** — user said they'll send screenshots.
2. ~~Products & Services board~~ DONE 2026-07-18 (late): /crm/products on the
   shared board pattern — groups Products (#579bfc) / Services (#a25ddc),
   columns Owner / Status (Active #00c875, Draft #fdab3d, Discontinued
   #e2445c + battery footer) / Price (money + sum footer) / Billing
   (One-time #579bfc, Monthly #00a0a0, Yearly #a25ddc) / SKU / Description.
   Migration `crm_products_schema` (crm_product_groups + crm_products, full
   RLS, updated_at trigger, 1 sample row). SuccessToast + undo wired.
   BOARD_META products.table now `crm_products` (workspace Content tab picks
   it up). E2E tested: add item, Status popover, DB persist; test row cleaned.
3. Lead submission form tab (Leads board), detail drawers (lead/deal/contact),
   Team/invite page w/ avatar upload, notifications.
4. Polish pass — known bugs list: subitem count badge + expand chevron on deal
   names, Gmail hexagon badge on Integrate, Import/Filter/Search/Person/Group by
   buttons are visual-only, banner AI logos are white-ish glyph assets,
   "Main View" tab pin icon missing. User explicitly deferred these.
   FIXED 2026-07-18: toolbar SVGs (stretch/mirrored search — assets redrawn in
   public/figma, see memory) + Annual Target gauge rebuilt to the Monday
   reference (the old arc() had a large-arc-flag bug that broke ratios > 0.5;
   now single ring + outside tick labels + inward triangle marker at actual +
   kite needle).
5. Website leads import (192 rows in shared `leads` table), Vercel deploy +
   crm.irfaninvest.com, RLS on OLD website tables (9 tables, launch blocker,
   separate task), attach to irfanapp.

## Session ritual

Persian replies (technical terms fine), autonomous verification loop, temp
data cleaned after tests (EXCEPT current preview demo data — intentional),
update PLAN.md + memory + this file at each milestone.
