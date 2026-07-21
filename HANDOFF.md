# Irfan CRM — Session Handoff

> Read this + the auto-memory `irfan-crm` entry first. This file is the single
> source of truth for continuing the build in a new session.
> Updated: **2026-07-21 late session** (all work committed locally through
> `437f49e`; repo is LOCAL-ONLY, no remote).

## CURRENT STATE SNAPSHOT (2026-07-21)

- **LIVE**: https://irfan-crm.vercel.app (Vercel project `irfan-crm`, scope
  amirshamsipurs-projects; deploy = `npx vercel deploy --prod --yes`).
  Prod env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL (=prod URL, canonical for auth email links).
  Local dev: preview_start `irfan-crm`, port 3070; `/preview` auto-login is
  local-only. Supabase project `owgvrxipqlusepozlujv` (shared w/ whitewill).
- **STANDARDIZATION COMPLETE — phases 0→5 of the real-estate audit are DONE**
  (audit artifact: https://claude.ai/code/artifact/b702a706-9708-4065-8861-4f3f6393c589):
  P0 owner-edit RLS + `crm_audit_log` + deal stage history; P1 identity FKs
  behind name chips + E.164/email normalization + `crm_convert_lead` RPC +
  OMR currency + 9-stage pipeline + LostReasonDialog; P2 real-estate core
  (Developments/Units/Viewings boards, property_interests, offers,
  reservations w/ one-active-per-unit DB lock + unit status sync, DEAL DRAWER
  incl. shortlist/offers/reservation/viewings/activity); P3 financial layer
  (transactions TX-refs, IMMUTABLE confirmed payments, payment plans schema,
  commissions+splits, /crm/finance page, drawer finance sections); P4 SLA
  timestamps + explainable lead scoring (Score column) + pg_cron automations
  (reservation expiry hourly, rescore nightly) + My Work/Team dashboard rows;
  P5 ROLE MATRIX developer|ceo|media|manager|agent|finance (all via 3 RLS
  helper fns + lib/permissions.ts as the ONLY frontend gate source) +
  /crm/team management page (roles, active toggle, invites).
- **BOARDS (9, all with functional custom "+" column menu)**: Contacts,
  Deals (3 views + drawer), Leads (Score column), Accounts, Client Projects,
  Activities, Developments, Units, Viewings + Sales Dashboard + Finance
  (finance-tier only) + Team (full-tier only). Products & Services board was
  REMOVED (user decision) along with all dead Monday-clone chrome (Connect-AI
  banner, rail extras, Integrate/Agents chips, AI floaty, fake sync panel,
  Contact sales).
- **SIGNUP FLOW**: /signup has a required Field/Position select (Sales Agent/
  Media Team/Sales Manager/Finance) → everyone starts as `agent`; privileged
  picks land in `crm_users.requested_role` and /crm/team shows an approve
  hint. Confirm-email redirects to `/auth/callback` (allow-listed; user lands
  signed in). ⚠️ USER STILL MUST set Supabase Auth Site URL →
  https://irfan-crm.vercel.app (dashboard-only setting).
- **MEMBERS**: 3 developer accounts (preview@irfancrm.local dev-only,
  amiralishamsipur@gmail.com, amirshamsipur1997@kioskoman.com) + agents
  korooshkhaleghi72@gmail.com and sara.farzin@irfaninvest.com. Pending
  developer invites: amirshamsipur1997@gmail.com, a.shamsipour@irfaninvest.com.
- **DATA IS REAL** (accounts/deals/leads + user-created custom columns on
  deals). Never wipe or reseed without asking.
- **NOTIFICATIONS LIVE (2026-07-21, migration `crm_notifications`)**: TopBar
  bell is real — unread badge (60s poll), All/Unread panel, mark one/all read,
  click-through. DB: `crm_notifications` (RLS own-rows; INSERT only via
  security-definer `crm_notify`, which never notifies the acting user) +
  triggers for owner assignment (leads/deals/projects/activities/developments/
  units), deal stage moves, reservation lifecycle (incl. hourly cron expiry —
  actor null → "System"), new offers, role changes. Fake Inbox counter removed.
- **LEAD + CONTACT DRAWERS (2026-07-21)**: row-open buttons now work on Leads
  and Contacts. LeadDrawer (`leads/lead-drawer.tsx` + `leads/drawer-actions.ts`):
  details w/ SLA response time, score breakdown (score_components), shortlist
  units (writes crm_property_interests w/ lead_id → feeds scoring), stage
  journey (crm_lead_stage_history), activity, Convert-to-contact CTA (reuses
  moveLeadToContacts). ContactDrawer (`contacts/contact-drawer.tsx` +
  `contacts/drawer-actions.ts`): details, linked deals (FK match merged with
  name-cache match, deduped; live count + value sum + stage pills), shortlisted
  properties, activity. Leads page now also fetches crm_units.
- **ADMINISTRATION AREA (/admin, 2026-07-21)**: full-screen dark takeover
  (own route group `app/(admin)`, NO app chrome — Back button returns to
  /crm), Developer/CEO only (page redirects others; proxy auth-guards it).
  Entry = TopBar 9-dot grid icon (admin tier only; hidden otherwise).
  Sections, ALL functional on real CRM data: General (registration
  allowed-domains chips + agent seat cap → crm_registration_settings; sales
  targets → crm_dashboard_settings; actions in `app/(admin)/admin/actions.ts`),
  Directory (role select/active toggle/requested-role hints + invites,
  reusing team actions), Customization (custom columns rename/delete),
  Security (crm_audit_log viewer w/ entity filter), Usage stats (live row
  counts + 7-day board opens from crm_board_visits).
- **WORKSPACE HOME CLEANED (2026-07-21)**: Permissions tab, Feedback/Agents
  header buttons, Collaborators "Agents" empty-state, AI-summary column,
  cleanup-mode toggle, AI-credits note, inert Filters button and Folder
  column REMOVED (Monday-only chrome — don't re-add). Members button now
  switches to the Collaborators tab.
- **NAV PERFORMANCE PASS (2026-07-21, revised 07-22)**: `next.config.ts`
  sets experimental.staleTimes {dynamic:30, static:300} so board revisits hit
  the client cache (revalidatePath still purges after writes — keep using it
  in every server action); /admin usage numbers come from ONE
  `crm_admin_usage_stats()` RPC (security INVOKER) instead of 18 head-counts;
  board entrance anims softened (y8/0.22s/stagger 0.04 on all 9 boards).
  loading.tsx skeletons ((app)/, (app)/crm/, (admin)/admin/) are IN (user
  explicitly prefers them) plus `useLinkStatus` spinners (ui/LinkSpinner.tsx)
  on sidebar links and the TopBar admin link.
  ⚠️ **PANE-TESTING RULE**: the loading.tsx Suspense boundary never hydrates
  in the embedded Browser pane — boards render but are click-dead with zero
  console errors. Temporarily rename the 3 loading.tsx files when driving
  boards from the pane, restore before commit. CSS-only checks (hover,
  layout, screenshots) work without hydration. Other pane quirks: transient "Failed to fetch RSC
  payload → falling back to browser navigation" errors that can bounce the
  pane to "/" mid-test — environment artifact, not app code.
- **ROW TOOLS + DRAG-AND-DROP on ALL 9 BOARDS (2026-07-22, migration
  `crm_row_positions`)**: every row has a hover ⋮⋮ handle in the left gutter —
  drag it to reorder within/across groups (fractional `position` column,
  seeded from created_at; boards order by position now), click it for the
  menu: Open (leads/deals/contacts), Duplicate ("<name> (copy)" inserted
  below, generated/SLA cols stripped), Move to <group>, Delete (RLS-guarded,
  count-checked). Shared kit `components/crm/row-tools.tsx` (`useRowTools`
  factory + `dropTargetProps` + `byPosition`) + `app/(app)/crm/row-actions.ts`
  (boardKey→table allow-list). E2E verified: duplicate/delete/move-to/drag all
  persisted to DB. Drag is POINTER-EVENT based (not HTML5 DnD — Safari):
  6px threshold, row-clone ghost at rotate(4deg), dimmed source, teal insert
  indicator, targets resolved with elementFromPoint over data-drop-group/
  data-drop-before attributes. ⚠️ never nest position:fixed popovers under a
  transformed ancestor (containing-block hijack → menu at page bottom) and
  never leave permanent overflow-hidden on group bodies (clips the gutter
  handle; overflow is applied via gsap.set only during collapse). Optimistic
  add flows create rows without `position` — byPosition sinks them last
  until refetch (fine).
- **NEXT / REMAINING**:
  1. Supabase Site URL change (user, dashboard) — only open localhost risk.
  2. Payment-plan template UI + schedules, commission-splits UI.
  3. 2 extra Sales Dashboard sections (user will send screenshots).
  4. Custom domain crm.irfaninvest.com + attach to irfanapp/NexProp later.
  5. PRE-HANDOVER CLEANUP: delete preview admin + /preview route + DEMO_* env,
     remove kioskoman.com from allowed_domains (if wanted), delete Sample rows.
- **HOW TO VERIFY**: tsc must stay clean; browser-pane E2E via /preview;
  DB checks via execute_sql; board popovers need javascript_tool clicks
  (computer clicks don't open them). All the sharp-edge gotchas (hidden-tab
  GSAP freeze, 0-viewport webview, AFTER-trigger 27000 rule, wCTE snapshot,
  toLocalDateString for date columns, await-before-link picker rule, RLS
  role-migration needs privilege-guard trigger disabled) live in the
  auto-memory `irfan-crm` entry — READ IT.

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
- DB trigger `crm_handle_new_auth_user`: invites carry an exact role; plain
  company-domain signups ALWAYS start as `agent` (their Field/Position pick
  is stored in `requested_role` for approval on /crm/team). First-signup
  bootstrap (already consumed) would grant `developer`. Privilege-guard
  trigger blocks role/is_active changes by non-admin-tier users — disable it
  around any SQL role migration.
- ⚠️ **PREVIEW MODE ACTIVE (local only)**: `/preview` route auto-signs-in as
  `preview@irfancrm.local` (role developer) via `.env.local` DEMO_* vars.
  Real members exist now (see snapshot). **Before handover:** delete the
  preview user + /preview route + DEMO_* env and the remaining "Sample …"
  template rows.
- Supabase email-confirmation is ON; repeated signups get silently
  rate-limited → create test users via SQL:
  insert auth.users (encrypted_password = extensions.crypt(pw,
  extensions.gen_salt('bf')), email_confirmed_at=now(), raw_user_meta_data
  {"app":"crm",...}) + matching auth.identities row. The crm trigger fires
  normally on SQL inserts.

## Database (all `crm_` prefixed, ALL RLS-on, in public schema)

Early migrations: core/lead_groups/deals/contacts/accounts/activity_items/
dashboard_settings; then the standardization series `crm_phase0…crm_phase5`,
`crm_custom_columns`, `crm_signup_requested_role` etc. — full ordered list via
Supabase `list_migrations`. Deal stages were RESEEDED in Phase 1 to the
9-stage buyer pipeline (New → … → Won/Lost).

- `crm_users` (1:1 auth.users; role developer|ceo|media|manager|agent|finance
  + requested_role), `crm_invites` (role-carrying)
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

## STANDARDIZATION TRACK (started 2026-07-18, drives all future phases)

User supplied a "Master CRM Audit & Standardization" spec (real-estate,
monday-model). Full audit report (scores, 20-pitfall checklist, gap matrix,
ER diagram, phase plan) published as artifact:
https://claude.ai/code/artifact/b702a706-9708-4065-8861-4f3f6393c589

USER DECISIONS (2026-07-18): (1) team-read / owner-edit permissions;
(2) deals pipeline → middle 9-stage version (New → Qualified → Viewing →
Negotiation → Offer → Reserved → Contract → Won / Lost); (3) currency OMR
default + multi-currency column; (4) Inventory = INDEPENDENT crm tables
(NOT the whitewill projects/project_units tables — user chose independence;
sync/import later).

PHASE 0 DONE (2026-07-18, migration `crm_phase0_security_integrity`, DB-only,
zero UI change): UPDATE policies rewritten on 8 row tables (admin OR owner_id
OR created_by; tasks use assigned_to; SELECT stays team-wide, DELETE stays
admin); `crm_audit_log` (admin-read, trigger-written, immutable) + AFTER
triggers: deal stage/owner/value changes, lead owner changes, deletes of
lead/deal/contact/account; `crm_deal_stage_history` (mirrors lead history).
E2E-verified via SQL role impersonation (agent blocked on others' rows=0,
own row=1, team read=1; 3 field-audits + 1 history row + delete audits).
⚠️ UI caveat: non-owner cell edits now fail silently at the DB (optimistic
state shows until reload) — Phase 1 adds read-only affordance for non-owners.
⚠️ SQL testing gotcha: a wCTE UPDATE cannot see rows INSERTed in the same
statement — test sequentially or the trigger test falsely reports 0.

PHASE 1 DONE (2026-07-18, migration `crm_phase1_identity_relations` + frontend):
(1) FKs behind name chips — crm_deals.contact_id/account_id, crm_contacts/
crm_projects.account_id; BEFORE triggers resolve *_name → FK on every write
(UI untouched); AFTER triggers propagate contact/account RENAMES into cached
name columns everywhere (SECURITY DEFINER to cross owner-edit RLS) — the
"rename breaks links" bug is dead. Backfilled from existing names.
(2) normalized_email + normalized_phone (E.164-ish) GENERATED columns on
leads+contacts w/ indexes. (3) `crm_convert_lead(lead_id)` RPC — transactional
(FOR UPDATE), idempotent, matches existing contact by normalized phone/email
before creating, writes converted_contact_id/converted_at; moveLeadToContacts
action now calls it and the toast says "linked to existing contact (duplicate
avoided)" on match. (4) `crm_find_duplicate_contact` RPC + alert toast when an
email/phone edited on leads/contacts matches another contact. (5) Currency:
money() now "1,000 OMR" everywhere (currency param, default OMR); currency
column on deals/products/projects, leads default OMR. (6) 9-stage pipeline
LIVE: New → Qualified → Viewing → Negotiation → Offer → Reserved → Contract →
Won → Lost (Discovery/Proposal RENAMED in place so existing deals kept ids).
(7) Lost enforcement: stage→Lost opens LostReasonDialog (deals/
lost-reason-dialog.tsx), saves stage+lost_reason together; lost_reason/
next_step columns + PATCHABLE. (8) Owner-lock UI: canEditRow() in
lib/permissions.ts guards patch fns on leads/deals/contacts/accounts/products
boards → red alert toast (SuccessToast gained tone="alert") instead of
silent RLS rejection. E2E: OMR render, 9-stage popover, Lost dialog → DB
lost_reason + history + audit rows, convert-match by phone, rename
propagation, RLS impersonation. tsc clean.

PHASE 2 PART 1 DONE (2026-07-19, migration `crm_phase2_real_estate_core` +
3 new boards): DB — crm_developments (+groups, developer_name→crm_accounts FK
resolve, statuses planned/under_construction/ready/handover), crm_units
(+groups; development FK resolve; type/bedrooms/area_sqm/price/status
available|held|reserved|contracted|sold|withdrawn), crm_viewings (+groups;
contact/unit/deal FK resolves; statuses requested…no_show), 
crm_property_interests (person+inventory check constraints), crm_offers,
crm_reservations with PARTIAL UNIQUE INDEX (one pending/active per unit —
verified: 2nd reservation raises 23505) + trigger syncing unit.status
(reserve→'reserved', convert→'contracted', cancel/expire→release if no other
active) + unit status/price audit triggers. Rename propagation extended:
contact→viewings, account→developments.developer_name, development→units,
unit→viewings, deal→viewings. RLS team-read/owner-edit/admin-delete on all.
UI — /crm/developments (Developer ConnectPicker w/ create→quickCreateAccount,
Status, Location, Completion TimeCell, computed Units count chip, Description),
/crm/units (Development ConnectPicker, Type, Bedrooms, Area m², Price OMR w/
sum, Status battery, Owner, Handover), /crm/viewings (Agent, Contact picker
w/ create, Unit picker, When TimeCell, Status battery, Feedback). Sidebar +
BOARD_META wired. E2E: dev added via UI, unit linked via picker (FK verified),
viewings renders; test rows cleaned. tsc clean.

PHASE 2 PART 2 DONE (2026-07-21): DEAL DRAWER — the rowOpen button on deals
rows (was inert) opens components/crm/deals/deal-drawer.tsx (460px right
panel, GSAP slide w/ canAnimate, overlay close): header (name, stage pill,
OMR value, owner, close date, contact) + sections Shortlisted properties
(select unit → addDealInterest, Reject → setInterestStatus), Offers (amount →
addDealOffer status=submitted; Accept/Reject on submitted/countered),
Reservation (select available/held unit + amount → createDealReservation
status=active; 23505 → friendly "already has an active reservation" toast;
Cancel requires reason → releases unit), Viewings (list by deal_id +
"+ Request viewing" → addDealViewing creates a linked viewing named
"Viewing — <deal>", deal_id resolved by trigger), Latest activity (by
related_item). Server actions in app/(app)/crm/deals/drawer-actions.ts
(getDealRelations single round-trip w/ joined unit names). Deals page now
also fetches crm_units. E2E-verified end-to-end incl. reserve→unit reserved,
cancel→unit released + reason stored.

BUGFIX PASS (2026-07-21): (1) DATE OFF-BY-ONE — TimeCell emits UTC ISO;
slice(0,10) shifted date-only columns (completion/handover) a day back in
Oman (+04). New toLocalDateString() in activities-config; NEVER slice ISO
for date columns. (2) crm_convert_lead now checks owner permission BEFORE
creating the contact (was leaving an orphan contact on non-owner convert) —
migration `crm_fix_convert_lead_permission_order`. (3) create-then-link RACE:
all picker "Create X" flows now AWAIT the quickCreate action before patching
the row, otherwise the FK-resolve trigger fires before the new row exists
and the link stays name-only (fixed in Deals/Contacts/Developments/Units/
Viewings boards). (4) new find-or-create actions quickCreateDevelopment /
quickCreateUnit so picker-created developments/units are real rows, not
dangling names.

HANDOVER UI CLEANUP DONE (2026-07-21, user request): all dead Monday-clone
chrome removed — Connect-AI banner (AppChrome), IconRail trimmed to Home+CRM,
BoardHeader lost Integrate/Agents/AI-Agents chips and fake "Automate / N"
counts (plain "Automate" now), AiFloaty returns null (restore from git when
Sidekick is real), sidebar "My workspace agents" + fake "Sync completed"
panel removed, TopBar "Contact sales" removed, Products & Services board
FULLY REMOVED (routes+components deleted; migration `crm_drop_products_board`
dropped both tables after verifying only the sample row existed). Import
button kept for future CSV import.

PHASE 3 DONE (2026-07-21, migration `crm_phase3_financial_layer` + UI):
ROLES — crm_users.role now admin|manager|agent|finance; crm_can_manage()
(admin+manager) replaced crm_is_admin() in all operational UPDATE policies
(managers edit everything, agents still owner-only); crm_is_finance()
(admin+finance) gates ALL financial tables (agents get zero rows via RLS —
verified by impersonation). DB — crm_transactions (auto ref TX-0001 via
sequence; ONE open tx per deal via partial unique index; statuses draft→
completed/cancelled), crm_payment_plans + installments (templates, UI later),
crm_payment_schedules, crm_payments (immutability trigger: confirmed payments
raise on amount/currency/date change — refund & re-enter), commission chain
crm_commission_agreements → crm_deal_commissions (net = generated column) →
crm_commission_splits. RPCs: crm_start_transaction(deal) (finance-gated,
idempotent, pulls buyer/unit from deal + reservation), crm_calc_deal_commission
(deal, pct) (upsert, base = tx price else deal value). Full-row audit triggers
on payments/commissions/transactions (to_jsonb old/new into crm_audit_log).
UI — deal drawer gained finance-only Transaction/Payments/Commission sections
(components/crm/deals/deal-financials.tsx + finance-actions.ts): start tx,
status select, record payment (type+method), refund, calc commission from %,
commission status. NEW /crm/finance page (admin/finance only; sidebar item
role-gated via CrmLayout passing profile.role to WorkspaceSidebar): 4 KPIs
(open tx value, collected, commission expected/received) + transactions table
w/ paid/balance/commission. E2E: agent sees 0 payments + start-tx denied;
admin full loop TX-0001 → payment 10,000 → commission 3% = 3,600 verified in
drawer AND finance page; test rows cleaned, sequence reset. CrmRole type
widened (WorkspaceUserRow too).

PHASE 4 DONE (2026-07-21, migration `crm_phase4_sla_scoring_automation`):
SLA — crm_leads gained assigned_at/first_response_at (BEFORE trigger stamps
assignment + first logged touch via last_activity_at change; backfilled).
SCORING — deterministic explainable scorer crm_compute_lead_score()
(profile-fit/engagement/intent/negative rules, v1; band hot≥70/warm≥40/cold)
runs INLINE in the same BEFORE trigger on every lead write (no extra UPDATE);
components stored as jsonb; property-interest changes touch the lead to
rescore; leads board gained a Score pill column (band color, tooltip = rule
breakdown from score_components). AUTOMATIONS — pg_cron installed; jobs:
crm-expire-reservations (hourly :15, expires pending/active past expires_at —
unit released by the existing sync trigger; idempotent) + crm-rescore-leads
(nightly 02:00 so 7d/30d decay windows stay fresh). DASHBOARD — new sections
in /crm/dashboard: "My work" row for every user (My overdue follow-ups /
My quiet leads 7d+ / My upcoming viewings — ListWidget) + Team row for
admin/manager only (Avg first response h, Open leads by owner bars, Lost
reasons list; DashboardData gained myWork/team). FIXES — Home KPIs were
still "$55K" (compactMoney → "55K OMR"); BarsWidget gained a format prop
(leads-by-owner axis showed "1 OMR" for counts).

ROLE MATRIX + TEAM PAGE DONE (2026-07-21, migration `crm_phase5_role_matrix`):
roles are now developer | ceo | media | manager | agent | finance ('admin'
value MIGRATED to 'developer' everywhere incl. invites; privilege-guard
trigger had to be disabled around the data migration — it correctly blocks
even postgres-context role updates). Tiers (all enforced by redefining the
3 helper fns, so every policy updated at once): crm_is_admin() = developer+ceo
(deletes, invites, audit, role mgmt); crm_can_manage() = +media+manager
(edit ALL operational rows); crm_is_finance() = developer+ceo+finance.
First-signup bootstrap literal → 'developer'. Verified by impersonation:
media edits others' leads ✓, sees 0 payments ✓, blocked from role changes ✓.
FRONTEND: lib/permissions.ts is now the single source (FULL/MANAGE/FINANCE
role sets + ROLE_LABELS + isFullAccess/canManageBoards/canViewFinance);
every role gate routed through it (drawer financials, finance page, dashboard
team row, sidebar, TopBar label, WorkspaceHome collaborators). NEW /crm/team
page (Developer/CEO only; sidebar item gated): members table w/ role select
(self-change disabled; DB guard enforces anyway) + active toggle + pending
invites w/ create/revoke. Bugfix during E2E: optimistic invite row used a
temp id so Revoke deleted nothing — createInvite now returns the real id and
TeamView syncs props→state. Assign media-team/CEO roles from /crm/team now
(current members: user's 3 accounts = developer, koroosh = agent).

CUSTOM COLUMNS DONE ON CONTACTS (2026-07-21, migration `crm_custom_columns`):
the "+" at the end of board columns is now FUNCTIONAL — Monday-style menu
(search + Essentials: Status/Dropdown/Text/Date/People/Numbers + Super
useful: Checkbox/Priority) lets agents add their own columns so data entry
is never blocked. Architecture (fully generic, ready for every board):
`crm_custom_columns` (board_key, stable key `type_ts36`, label, type,
options jsonb, position; RLS: members add/rename, admin-tier delete) +
row values in each table's `custom` jsonb (ADDED to contacts/accounts/deals/
projects/activity_items/developments/units/viewings — leads already had it).
Shared kit: lib/custom-columns.ts (types, DEFAULT_OPTIONS/LABELS, COLUMN_MENU,
CUSTOM_COL_W=150) + app/(app)/crm/custom-columns-actions.ts (add/rename/
delete) + components/crm/custom/custom-columns.tsx (AddColumnButton w/ menu
popover, CustomColumnHeader w/ InlineEdit rename + full-tier hover-✕ delete,
CustomValueCell dispatching to the shared cell kit: TextCell/NumberCell/
OptionCell/TimeCell(local-date!)/OwnerCell/Checkbox). ALL 9 BOARDS fully wired (contacts, deals, leads, accounts, projects, activities, developments, units, viewings)
(page fetch, board state+handlers, group header/rows/filler/summary + custom
in PATCHABLE + CrmContact.custom). E2E: menu → Status column → value
"Working on it" persisted in custom jsonb → cleaned. TO WIRE NEXT BOARDS:
copy the 4-spot ContactGroup pattern (header map, row map, filler width,
summary) + page fetch + board handlers + PATCHABLE 'custom' + type field.

REMAINING:
payment-plan template UI + schedules; commission splits UI; notifications
(TopBar bell is still visual); detail drawers for lead/contact, custom
domain crm.irfaninvest.com, pre-handover cleanup (preview admin + samples).

STANDALONE + HANDOVER MODEL (user decision 2026-07-18 late): this CRM is
INDEPENDENT — do NOT import the website `leads` table (192 rows); the
`crm_leads.website_lead_id` column stays but unused. Handover: org agents
sign up with @irfaninvest.com (email or Google) → auto-approved as role
'agent' (owner-edit only); admin ONLY via crm_invites. CEO/developer = the
user with FULL access: members amiralishamsipur@gmail.com +
amirshamsipur1997@kioskoman.com (both admin), unused admin invites for
a.shamsipour@irfaninvest.com (his org email — claims admin on first login)
and amirshamsipur1997@gmail.com. Before handover: delete preview admin +
sample rows, drop kioskoman.com from allowed_domains if wanted.

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
