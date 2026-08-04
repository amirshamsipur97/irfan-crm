# Irfan CRM — Session Handoff

## 🚀 HOW TO START THE NEXT SESSION

**Say exactly this to load the project:**

> **CRM-LOAD** — پروژه CRM irfaninvest، مسیر `Claude code/irfan-crm`.
> فایل HANDOFF.md را باز کن و بخش «HOW TO START THE NEXT SESSION» و
> «LIVE SYSTEM STATE» و «START HERE — product shape» را کامل بخوان،
> بعد بگو از کجا ادامه می‌دهیم.

(The keyword is **CRM-LOAD**. Everything needed to resume is in this file;
read the three sections above before touching anything.)

### 🔴 The system is LIVE — read this before your first command

As of **2026-08-03** the CRM is in daily production use by **8 members
(7 agents + the CEO)** who are entering real client data right now.

1. **Never wipe, reseed or "clean up" data.** Rows appear between your
   queries — the team is typing while you work. Match by **id, never by
   name**. Before deleting anything, re-read it and check ownership.
   The 2026-08-03 reset was an explicit one-off, taken with a backup
   (`backups/crm-data-backup-2026-08-03.json`).
2. **Ask before anything destructive or permission-widening.** Two
   examples from 08-03 that were confirmed first: zeroing the boards, and
   opening group-delete to every role.
3. `git log --oneline -5` — the tree must be clean and end at **`7802a6f`**
   (or later). `git status` must be empty.
4. **Deploy is ALWAYS `npx vercel deploy --prod --yes`.** Pushing to
   GitHub does NOT deploy. Push after every commit anyway (backup):
   https://github.com/amirshamsipur97/irfan-crm — **PRIVATE, and it must
   stay private**: this file and the git history contain plaintext
   passwords.
5. **Verify in the browser before saying it works.** `preview_start` with
   launch name `irfan-crm` (port 3070), then `/preview` auto-login. That
   account (`preview@irfancrm.local`, developer) is kept **DEACTIVATED** —
   re-activate it via SQL with the privilege-guard trigger disabled, and
   set it back to inactive when you are done. Every session this rule was
   followed; keep it.
6. **Roles change between sessions.** Re-read `crm_users` at the start
   instead of trusting any roster written here.

### Health baseline (measured at close of 2026-08-03)

`npx tsc --noEmit` → clean. `npx next build` → clean.
`npx eslint src` → **36 errors, all pre-existing and all false alarms for
this codebase** (identical count before and after this session's work):
the React-Compiler rules complain about `useGSAP`/`contextSafe` touching
refs and about `Date.now()` inside async server components. HANDOFF has
warned since 07-26 that "fixing" the GSAP ones breaks the collapse
animations. Treat 36 as the baseline — only investigate if it grows.

### Standing conventions (violating these has caused real bugs)

- Every write action must count affected rows (`src/lib/mutate.ts`) —
  RLS refuses by matching 0 rows, not by erroring.
- Boards await + roll back through `applyRowEdit` / `persist`.
- New cells import `CELL_BUTTON` / `CELL_INPUT` from `cell-style.ts`.
- ONE list per concept (PROPERTY_TYPES, COUNTRIES, LEAD_SOURCES…).
- Mirror, don't copy, when one board shows another board's data.
- Hand-inserted `auth.users` rows must set the 8 token columns to `''`
  or every sign-in dies with "Database error querying schema".
- SQL impersonation only works inside an explicit
  `begin; … set local role authenticated; … rollback;` block — and never
  trust a row count read from inside that session (RLS hides rows both
  ways; re-check from a privileged session).

> Updated: **2026-08-04** — committed and pushed through `b2e1c0d`,
> all deployed, working tree clean.

## SESSION 2026-08-05 — auth footer: CRM lockup replaces Power-by-NexProp (commit `b2e1c0d`, DEPLOYED)

User request: swap the NexProp footer logo on the auth pages for the
product's own (TopBar) logo, and drop the "Power By" line.
`AuthShell.tsx` now renders `<Icon name="logo" size={34} />` + a
font-display 22px/300 "CRM" wordmark, gap 10px — the TopBar lockup
(25px mark + 16px text, ~8px optical gap) scaled by 1.36 so the
proportions carry over. Position is byte-identical to the old block:
absolute, centered via left-1/2 + -translate-x-1/2, bottom-[36px]; the
fixed w-[194px] went (the lockup is 92px wide and centers on its own).
- Verified in the pane on /login: mark 34×34, wordmark 22px/300, gap
  10px, centered offset 0, bottom gap 36, mark and text optically
  centered on one line (screenshot). /signup: no "Power by"/nexprop in
  the DOM, lockup centered in main and 36px off its bottom (the pane
  was in zero-viewport state, so relative measurements were used).
- Prod HTML confirms: no "nexprop", no "Power by", imgVariant6.svg
  preloaded on /login.
- `public/figma/auth_nexprop_logo.svg` was LEFT IN PLACE (unused). The
  standing rule from 07-18 is that this is the real Figma export and
  must never be regenerated — keep the file if it is ever wanted back.

## SESSION 2026-08-05 — Leads "Text" edits in a dialog (commit `364dd6a`, DEPLOYED)

User request: make the Leads Text column behave like the Contacts
"First negotiation — <client>" note. The column now renders the SHARED
`NoteDialogCell` (contact-cells.tsx) instead of the inline
CenterEditCell — centered modal, textarea, Cancel/Save, portalled to
<body>, title `Text — <lead name>`, placeholder "Notes about this
lead…". The resting cell keeps the Round-7 start-aligned truncation and
the full-text tooltip. `notes` was already in LEAD_PATCHABLE, so no
action changes. CenterEditCell's `align` prop stays (added in Round 7,
now unused on leads but part of the shared component's API).
E2E in the pane on the REAL "gerard" lead: cell click → dialog titled
"Text — gerard" with the full note in the textarea (screenshot) →
Cancel → DB untouched (updated_at unchanged). tsc/build clean, eslint 37.

## SESSION 2026-08-05 — manual gmail exception member (no code, DB only)

The user asked to hand-register kh.hamidiii@gmail.com (outside the
allowed domains) and approve it like everyone else. Done via the
EXISTING exception mechanism, nothing bypassed:
crm_invites row (role agent, invited_by amirali) → crm_can_register
preflight 'ok' → crm_request_access() filed the auth row + pending
crm_users (invite consumed, used_at stamped) → crm_approve_member()
under admin impersonation (temp password, role agent) → REAL
password-grant login against the auth REST API succeeded.
Account state: ACTIVE agent "Kh Hamidi", must_change_password=true (the
first-login dialog will force a new password). Team = 9 active members.
The temp password was handed to the user in chat, not stored here.

## SESSION 2026-08-04 — Round 9: group titles pinned through the WHOLE horizontal scroll (commit `d0f874c`, DEPLOYED)

User report (screenshot): scrolling right to the table's end dragged the
"Active Deals" group title along. CAUSE: a sticky element only sticks
within its containing block, and each group's <section> — a plain block
child of the horizontal scroller — was only VIEWPORT-wide (its w-fit
rows overflow it). After ~one screen of scrollLeft the title ran out of
parent and slid off. FIX: every group <section> on all 10 boards is now
`w-fit min-w-full` (w-fit = as wide as its rows so the title can stick
to the very end; min-w-full keeps a COLLAPSED group at least
viewport-wide, same behaviour as before for that case).
- One-line patterned edit ×10 files (9 × "group pb-[24px]" +
  AcceptedDealsBoard's "pb-[40px]").
- Verified: class present on the served offers board and the board
  renders identically; the pane was in its zero-viewport state (all
  geometry APIs report 0 — known artifact) so scrollLeft couldn't be
  driven; the fix is containing-block geometry, deterministic.
- ⚠️ residual known imperfection: a COLLAPSED group's title still slides
  after ~a viewport of scroll (its section shrinks to min-w-full; the
  body that would widen it is unmounted). Nothing scrolls under a
  collapsed group, so it reads fine; widening would need keeping the
  collapsed body mounted — touchy with the GSAP collapse.

## SESSION 2026-08-04 — Round 8: board gutter painted — no more see-through on horizontal scroll (commit `f28486b`, DEPLOYED)

User report (screenshots): scrolling a board right, the columns slid
VISIBLY through the 40px lane left of the pinned column (Owner avatars
showing beside the group stripe). CAUSE: the lane (the row-handle
gutter, from the scroller's pl-[40px]) is transparent, and sticky
blocks stick at the CONTENT edge, never covering it.
- globals.css gained `.gutter-cover::before` (absolute, -40px, 40px
  wide, white) and a scripted patterned edit added the class to all 37
  pinned blocks — the two byte-uniform patterns
  ("sticky left-0 z-10 flex items-stretch bg-white" ×29 and
  "sticky left-0 z-10 block bg-white" ×8) across the 10 board files.
  Group-title rows (w-fit, nothing scrolls under them) untouched. The
  row handle is z-20, the blocks z-10 — handle stays above the cover.
- Verified in the pane: 60 covers on the leads board with computed
  ::before {40px, -40px, white}; prod CSS chunk contains the rule.
  ⚠️ scrollLeft CANNOT be driven in the hidden pane (zero-viewport
  state — scrollWidth 0), so the scrolled screenshot itself couldn't be
  reproduced; the fix is pure CSS geometry.
- 🔎 NOTICED DURING VERIFICATION, NOT CAUSED BY THIS CHANGE: the
  accepted deal from earlier today (Offer — gerard, 95,550, owner
  babak) was DELETED by a team member between ~13:00 and ~14:00 — and a
  lead went 59→58. Row delete has NO undo, but crm_audit_log holds the
  full row jsonb if restoration is ever wanted. The user was told.

## SESSION 2026-08-04 — Round 7: long-text cells anchor to the START of the text (commit `6f3d9de`, DEPLOYED)

User report (with screenshots): Leads "Text" and Contacts "Negotiation
notes" showed the MIDDLE of long notes. CAUSE: the shared cell shape is
a centered flex button — an overflowing sentence clips at BOTH ends.
- cell-style.ts gained `CELL_BUTTON_TEXT` / `CELL_INPUT_TEXT`, DERIVED
  from the base constants via .replace so the two shapes cannot drift:
  justify-start + text-left, and consumers wrap the value in
  `<span class="min-w-0 truncate">` for a real ellipsis (text-overflow
  does not work on a flex container's anonymous text item).
- Switched: `TextCell` + `NoteDialogCell` (contact-cells.tsx — covers
  Contacts Comments/Negotiation notes, Offers Details, Projects/
  Developments/Viewings/Accounts notes, custom text columns) and
  `InlineEdit`/`CenterEditCell` gained `align="start"` (leads notes
  column only — first/last name and Developments stay centered).
- Verified in the pane on REAL data: leads Text cells compute
  justify-content flex-start and read "called directly/emailed…" from
  the start (was "…alled directly…"); the exact contact note from the
  user's screenshot now starts at "he demanded a 2 bhk…". 776 short
  centered cells untouched. tsc/build clean, eslint 37.
- ⚠️ first `vercel deploy` attempt ended "Error: Not authorized" AFTER
  the build — transient; the immediate re-run deployed and aliased fine.

## SESSION 2026-08-04 — Round 6: client un-clearable on Offers + Deals row menu (commit `37cdcd3`, DEPLOYED)

User request: (a) remove the Client chip's ✕ on the Offers board so the
name cannot be deleted; (b) the Deals board rows lacked delete/move/etc —
give them the same tools. SHIPPED:
- `ConnectPicker.onClear` is now OPTIONAL — no onClear, no ✕. The Offers
  Client picker stops passing it: the client can be SWITCHED to another
  person but never cleared (the offer is named after them). The
  Developer column and the Contacts board's account picker keep their ✕.
- `AcceptedDealsBoard` gained the shared ⋮⋮ row menu via useRowTools
  (boardKey "deals", already in BOARD_TABLES): Open (deal drawer),
  Duplicate, Move to (deals page now fetches crm_deal_groups — moving
  re-files the row's group on the OFFERS board, the row itself stays
  here), Delete (owner-scoped per Round 4). Drag-drop targets were NOT
  added — the board is a flat filtered list, silent group changes by
  drag would confuse; the menu covers everything asked.
- 🐛 fixed in passing: duplicateRow copied `downpayment_completed_at` +
  `invoice_sent_at` — a duplicated deal showed "Complete ✓ / invoice"
  with ZERO payment parts (parts don't copy). Both are in DUP_EXCLUDE
  now. (accepted_at still copies on purpose: a duplicated deal stays a
  deal.)
- E2E in the pane (loading-rename + __reactProps$ recipe): Offers board
  DOM shows NO "Remove contacts" button (only "Remove developer"); on
  Deals a throwaway ZZTEST deal showed the handle → menu (all 4 items
  enabled, screenshot taken) → Delete removed it from the DB. Test row
  cleaned; the team's REAL first accepted deal (gerard, owner babak)
  appeared mid-test and was left untouched. tsc/build clean, eslint 37.

## SESSION 2026-08-04 — Round 5: Owner pinned for agents + full-name hover (commit `778c58f`, migration `crm_owner_reassign_manage_only`, DEPLOYED)

User request: (a) agents' Owner on Leads/Contacts/Offers must stay fixed
on themselves — it kept getting changed; (b) hovering any owner avatar
must reveal the full name, for every role. SHIPPED:
- Shared `OwnerCell` (leads/cells.tsx) gained `canReassign` (default
  true) + a `title` tooltip (full name / email, "Unassigned" when none).
  The tooltip reaches ALL 10 boards for free; the reassign lock is wired
  on LeadGroup / ContactGroup / DealGroup / AcceptedDealsBoard via
  `canManageBoards(profile.role)` — agents see a plain avatar, no picker.
- Creators self-own: `addLead` and `addDeal` now insert
  `owner_id = user.id` (contacts quick-creates and crm_convert_lead
  already did); optimistic rows in LeadsBoard/DealsBoard match. A
  backfill handed every unowned lead/contact/deal to its creator —
  0 unowned rows remain on all three tables.
- DB enforcement: `crm_guard_owner_reassign()` BEFORE UPDATE trigger on
  crm_leads/crm_contacts/crm_deals — owner_id may only change when
  `crm_can_manage()` (or auth.uid() is null = service/migration/
  referential contexts; anon has no UPDATE grant). crm_convert_lead's
  merge path never touches owner_id, verified before shipping.
- ⚠️ MIGRATION GOTCHA hit here: the backfill UPDATEs must run BEFORE the
  trigger exists (or the guard fires inside the migration itself — the
  MCP session has no auth.uid... which is exactly why the null-uid
  escape hatch exists). First apply failed on this, second (reordered)
  succeeded.
- Verified by impersonation (begin/rollback): sara edits her own lead ✓,
  sara reassigning owner → refused with the exception ✓, admin
  reassigning → allowed ✓. tsc/build clean, eslint steady at 37.

## SESSION 2026-08-04 — Round 4: row Delete opened to every member, own rows only (commit `fceb818` + migrations `crm_row_delete_owner_or_admin` / `crm_row_delete_requires_active_member`, DEPLOYED)

User request: agents must be able to delete a lead/contact from the row
menu (was developer/CEO only). SHIPPED both layers:
- UI (`row-tools.tsx`): the Delete item now follows the SAME per-row
  `canEditRow` rule as Duplicate/Move (owner or creator; manage tier
  everything). `canDelete` left the RowTools type; the old "Only a
  Developer or CEO…" tooltip became "Only the item's owner can delete
  it" on non-editable rows. NOTE: the `canDelete` props still passed in
  the 9 *Group.tsx files are the CUSTOM-COLUMN header delete (admin
  tier) — untouched, different feature.
- RLS: DELETE on all 9 board tables →
  `crm_is_admin() or (crm_is_member() and (owner_id|agent_id = uid or
  created_by = uid))` (viewings use agent_id). The crm_is_member() wrap
  keeps a deactivated account with a live token refused, matching the
  Round-16 group-delete rule.
- Verified by impersonation (all in begin/rollback, zero data impact):
  sara deletes her own lead ✓ and contact ✓, babak's lead/contact
  refused (0 rows) ✓, DEACTIVATED preview refused ✓. tsc/build clean;
  eslint steady at 37 (the Round-2 baseline).
- ⚠️ Row delete has NO undo (the toast is informational) — it never had
  one for admins either; cascades wipe satellites (tracking, documents,
  downpayments). If the team starts losing rows, add a ConfirmDialog like
  the group delete has.

## SESSION 2026-08-04 — Round 3: per-agent visibility EXTENDED to Contacts + Offers (migration `crm_contacts_offers_owner_visibility`, DB-only, no deploy needed)

User report: sara.zangeneh (agent) could see the client babak entered
last night and took to offer. INVESTIGATION: crm_leads RLS was fine
(impersonated sara saw 0 of babak's leads) — the "leak" was the DESIGNED
team-wide visibility of Contacts/Offers (the long-standing open question
#2). The user ruled: agents must only see their own. SHIPPED:
- `crm_contacts` + `crm_deals` SELECT → `crm_is_admin() or owner or
  created_by` (the exact crm_leads pattern from 08-02).
- Flat member-read satellites now follow their parent via exists():
  crm_contact_documents (contact), crm_deal_downpayments + crm_offers
  inner ladder (deal), crm_reservations (deal, null-safe),
  crm_viewings (deal AND contact, null-safe — standalone board rows stay
  team-visible), crm_property_interests (lead AND contact AND deal).
  crm_offer_tracking / crm_offer_floor_plans already chained.
- VERIFIED by real impersonation: sara → 51 leads / 51 contacts /
  0 offers / 0 tracking / 0 docs, gerard invisible; babak → his 1 lead +
  1 contact + 2 offers + 2 tracking; CEO → everything (59/52/2/2).
  Advisors: nothing new. No code changes — pages fetch under the
  viewer's session and narrow automatically (boards handle empty).
- Consequences to know: agents' dashboards/home now show THEIR numbers;
  the Offers add-row live search recalls only the agent's own clients
  (per the user's earlier spec); an agent typing another agent's client
  creates a duplicate contact (duplicate-phone toast still fires on
  edits); `crm_convert_lead` (definer) can still MERGE a lead into
  another agent's contact when phone AND name match — the converter then
  cannot see the absorbed card (rare; toast names it).
- Residual team-visible surfaces, deliberate: crm_accounts (developer
  companies, no client data), the shared Activities board
  (crm_activity_items "Related item" can carry offer names; barely used)
  and crm_emails (empty until email goes live). Say the word to chain
  those too.
- ⚠️ a.shamsipour@ is still role AGENT — after this change that account
  sees ONLY its own records. Upgrade it to developer if it is meant to
  see the whole funnel.

## SESSION 2026-08-04 — Round 2: Offers add-row live client recall (commit `cc92e3a`, DEPLOYED)

User request: the "+ Add offer" box must recall Contacts LIVE while
typing (there is deliberately no Move-to-offer on Contacts) and the
picked person's data must land on the offer correctly, for every role.
- NEW `AddRowClientPicker` in `connect-picker.tsx`: always-visible input
  that searches contact options as you type (name OR sub line, so C-code
  and developer match too), portalled dropdown (sticky-group stacking
  trap), ArrowUp/Down + Enter + Escape, mouse-enter highlight. Free text
  matching nobody falls back to the old unlinked add via an explicit
  "Add offer …" row (sub line says it will not be linked).
- `addDeal(groupId, name, contactId?)` in offers/actions.ts: with a
  contactId it re-reads the contact server-side and inserts the offer
  PRE-LINKED — contact_id (the resolve trigger keeps an explicit id),
  contact_name, name "Offer — <client>", offer_property_type/bedrooms
  prefilled from the demand, owner_id = creator (same recipe as
  createOfferForContact). Unlinked path byte-identical to before.
- DealsBoard optimistic row now carries the pick (contact_id + prefills)
  so the mirrored Client wants / budget / country columns light up before
  the round trip; success toast "Offer created for <name> — client
  details linked." The old exact-match patch still covers typed names.
- Roles: options come from the page's server fetch of crm_contacts
  (team-read RLS) — dev/CEO and agents all recall every client, and
  E2E-by-impersonation proved an AGENT can insert an offer linked to
  ANOTHER agent's contact (begin/rollback, no residue).
- E2E through the real UI (pane): typed "gerard" → dropdown showed
  "gerard · C-0019 · Adante/Adrak" → pick → row in DB with exact
  contact_id, sky_villa/2bhk prefilled, owner = creator; mirrored cells
  rendered on the board. Test offer deleted (offers back to 2).
- ⚠️ eslint baseline 36 → **37**: the new picker anchors exactly like
  ConnectPicker (setPos in useLayoutEffect) — same React-Compiler
  false-positive family; do not "fix".
- 🔧 PANE E2E RECIPE THAT WORKS (refines the morning lesson): rename the
  3 loading.tsx files → the board hydrates even in the hidden pane; then
  drive React with `__reactProps$` onChange/onClick (raw clicks still
  dead); restore the files before commit. Used here end-to-end.

## SESSION 2026-08-04 — Austria dial code (commit `4b54830`, DEPLOYED; Chile +56 added the same way later that day, commit `c780b32`)

User-reported bug: the phone country-code picker had no Austria (+43) —
in every panel, since the ONE shared `COUNTRIES` list in
`src/components/crm/phone-input.tsx` feeds the board phone cells, the
country cells and the signup form alike. Added
`{ code: "+43", name: "Austria", flag: "🇦🇹" }` in the alphabetical tail
between Australia and Azerbaijan. tsc + build clean; verified in the
served HTML (local AND https://crm.irfaninvest.com/signup — the signup
`<select>` renders the same list server-side, so `curl | grep Austria`
is a real end-to-end check that needs no browser).

⚠️ PANE LESSON (explains the 08-03 "dead synthetic clicks" note): with
the Browser pane HIDDEN, the board never hydrates — only the TopBar's 3
buttons carry `__reactProps$`; clicks/scrolls only produce hover states
and `read_page` returns an empty tree. It is not an app bug: the hidden
tab gets no idle time, so React's hydration never runs. Verify via
server-rendered HTML (curl) or make the pane visible before driving UI.
Live team data was untouched this session (12 leads · 4 contacts · 2
offers at the time of work); preview account re-deactivated after use.

## WHAT HAPPENED LATER ON 2026-08-02 (second session — drawer swap + first-negotiation columns)

**First negotiation replaces Deals chips on Contacts (migration
`crm_contact_first_negotiation`)**: the user asked for "date + text of the
first negotiation" in place of the Deals / Deals value columns. New
`crm_contacts.first_negotiation_at` (date) + `first_negotiation_note` (text),
editable on the board (TimeCell calendar + TextCell, same patterns as
Lead date / Comments), added to PATCHABLE, shown read-only in the contact
drawer's Details. The Deals/Deals value chip columns, DealsChipCell usage
and the per-row linked-deal math were removed from ContactGroup (the
deal-done badge and the drawer's Offers list still show linked offers).
E2E'd through the UI on C-0013: date → DB (2026-08-02, no TZ shift),
note → DB, both test values reverted to null. ⚠️ synthetic Enter from the
browser driver doesn't commit TextCell — commit fires on blur; that's a
test-driver artifact, not an app bug.

**Follow-up the same session**: the note now edits in its OWN DIALOG, not
the one-line inline input — `NoteDialogCell` in `contact-cells.tsx`
(centered modal, textarea, Cancel/Save, portalled to <body> because of the
sticky-group stacking trap), title "First negotiation — <client>". The
drawer shows the FULL note untruncated in a "First negotiation notes"
section right under Details (a DetailRow would clip it to one line) — and
since Offers rows open the same ContactDrawer, the note shows on both the
Contacts and Offers boards. E2E'd on C-0013: dialog → Save → DB kept the
newline, drawer section verified on BOTH boards, test note reverted.

**Round 3 the same session — documents tag, floor plans, real activity feed**:
- **Documents**: the type now rides as a chip BEFORE the file name
  ("Passport · logo 2.png") in the drawer's Documents list.
- **Floor plans per offer (migration `crm_offer_floor_plans`)**: each offer
  card in the contact drawer has a "Floor plans sent" area — upload straight
  to the private bucket under `floorplans/<deal_id>/`, metadata in the new
  table (RLS mirrors crm_offer_tracking), open via the same 5-min signed
  URLs, ✕ deletes row + storage object. Upload/delete visible to the
  offer's owner/creator or manage tier (canEditRow client-side, RLS server-side).
- **Latest activity is REAL now**: `getContactRelations` synthesizes the
  feed from actual events — offer created / moved to deal / downpayment
  completed / invoice sent, tracking entries (with note preview), document
  uploads, floor plans — merged with crm_activity_items, sorted desc,
  top 15 (`ContactFeedItem` type). The drawer exposes `load()` and
  DemandSection / TrackingSection / floor-plan actions call `onChanged`,
  so the feed refreshes right after any of them.
- E2E'd on aman afarsh (C-0014): tag chip renders, floor-plan upload via
  the React-file-input technique → bucket + row + feed entry, UI ✕ delete
  → row AND storage object gone. Test data cleaned; build + tsc clean.
- **Round 4 — open question 1 ANSWERED: the user said delete it.**
  Shortlisted properties is GONE from the contact drawer, and Shortlisted
  properties + Reservation are GONE from the DealDrawer (both were unit
  pickers over the empty crm_units — zero function). The inner Offers
  ladder, Viewings, Transaction/financials and Commission all STAY (they
  work without units). Inner offers now always insert with unit_id null.
  The units prop chain was removed end to end (deals page no longer
  fetches crm_units). DB tables (crm_property_interests,
  crm_reservations, crm_units) and their server actions were left in
  place — only UI was removed; restore = re-add the sections.
  Verified in the browser: deals drawer sections = Client / Offers /
  Viewings / Transaction / Payments / Commission / Latest activity;
  contact drawer = Details / First negotiation notes / Demand / Documents
  / Offers / Latest activity / Lead tracking.

## 📊 LIVE SYSTEM STATE — end of 2026-08-03

**https://crm.irfaninvest.com** · code at `7802a6f` · everything deployed.

**Team (8 active).** amiralishamsipur@gmail.com = **developer** (the
user's own Google login, the account to work from) · shirdel.realestate
.broker@ = **ceo** · six agents: a.shamsipour@, aylar.homayoun@,
babak.chehrazi@, m.mehrjooy@, sara.farzin@, sara.zangeneh@ ·
preview@irfancrm.local = developer, **deactivated** (dev auto-login only).
No pending approvals. ⚠️ **a.shamsipour@ is an AGENT** — the user's own
work address was approved with the dropdown's default role, so it cannot
reach /crm/team or /admin. Offer to switch it to developer.

**Real data being entered (do not touch).** 8 leads · 1 contact · 2 open
offers (95,550 + 120,000 OMR) · 0 accepted deals · 0 downpayments ·
24 developer accounts on the Accounts board · 9 deal stages · 2 payment
plans · one group per board.

**What still blocks a fully-finished rollout**
1. **Email is dark.** No `RESEND_API_KEY` + verified irfaninvest.com, no
   Zoho SMTP. Consequences: approving a member shows the temporary
   password on screen only (the panel clears on refresh), and every
   "Send email" button returns 503. This is the single biggest remaining
   launch item and it needs the user, not code.
2. **`/preview` is dev-only** — fine, but remember it is deactivated.
3. Supabase advisors still flag the whitewill-site tables
   (`leads`, `ai_conversations`, `analytics_*`) for RLS — that is the
   OTHER project's launch blocker, not this CRM's.
4. Auth "leaked password protection" is off (Supabase dashboard toggle).

**Open product questions the user has never answered**
- ~~Extend the per-agent visibility rule to Contacts / Offers / Deals?~~
  **ANSWERED 2026-08-04: yes — shipped** (migration
  `crm_contacts_offers_owner_visibility`, see the Round 3 entry above).
- Store age as a date of birth instead of a snapshot number?

**Natural next steps if the user has no new request**
- Wire email (once keys exist) and re-test approval + Send email.
- Per-agent visibility decision above.
- The dashboard's "Add widget", "Export", "People", "Filter", "1 connected
  board" chrome is still decorative — either build or remove.
- Activity tracker shows "No activities" because nothing logs
  crm_activity_items in the new flow; the per-offer tracking feed is
  where real activity now lives. Consider feeding the tracker from it.

**Round 17 (2026-08-03) — Sales Dashboard now reads the REAL model**
(no migration, display only — the CRM is live with 7 agents, so nothing
was mutated): every money widget keyed off `is_won` STAGES, which this
team never uses, so Annual/Monthly actual, revenue-by-month and
conversion sat at 0 forever while the forecast used `close_probability`
(never filled) and was also always 0. `dashboard/page.tsx` now computes:
- won = `accepted_at` (Move to deal), NOT a Won stage; annual/monthly
  actual and "value by month" bucket by accepted_at.
- "Open offers on the table" = full value of offers not accepted and not
  lost (replaces the always-zero weighted forecast); by-month and
  by-stage forecast charts likewise use full price.
- Average tile = accepted deals once any exist, else average offer price;
  the title switches with it.
- NEW "Downpayments collected" tile from crm_deal_downpayments.
- Funnel rebuilt PERSON-BY-PERSON: Leads → Contacts → Got an offer →
  Accepted → Downpayment done. Counting offer ROWS made it widen to
  "200%" (one client can hold several offers).
- Users are fetched WITHOUT the is_active filter so a lead owned by
  someone who left keeps their name instead of showing "Unassigned".
- 🐛 MonthlyTargetWidget painted its gradient bar full-width regardless
  of the number — a month with nothing sold looked like target hit. It
  now fills to actual/target.
Verified widget-by-widget against SQL: open offers 215,550 ✓, average
offer 107,775 ✓, funnel 8/1/1/0/0 ✓, collected 0 ✓.

**Round 16 (2026-08-03) — group delete opened to EVERY member**
(migration `crm_group_delete_all_members`): agents couldn't see the trash
button (UI gated on `isFullAccess`, RLS on `crm_is_admin()`), so the user
asked for it at all levels. DELETE policies on all 9 `crm_*_groups` tables
are now `crm_is_member()`, and the boards pass `onDeleteGroup`
unconditionally (the `isFullAccess` import went with it). The real
protection was never the role gate — it is "empty groups only" + "never
the last one", checked in the UI and again in the delete* server actions.
Verified by impersonation: active AGENT deletes an empty group ✓,
DEACTIVATED account is refused ✓. ⚠️ TEST TRAP: counting the row from
inside the impersonated session lies — the SELECT policy hides it either
way, so always re-check from a privileged session.

## 🧹 DATA RESET FOR COMPANY LAUNCH — 2026-08-03

The user asked to zero the practice data so the team can start clean, and
picked scope **"all work records"** (asked explicitly before deleting).

**BACKUP FIRST — `backups/crm-data-backup-2026-08-03.json`** (78 KB, in the
repo): every deleted row as JSON — 9 leads, 14 contacts, 8 offers/deals, 5
downpayment parts, 7 tracking entries, 6 viewings, 5 activity items, 4
inner offers, 2 documents, 2 transactions, 1 project, 1 DM, 3
notifications, plus the 24 accounts. Restore from it if anything was
needed after all.

**DELETED** (all zero now): crm_leads, crm_contacts, crm_deals,
crm_deal_downpayments, crm_offer_tracking, crm_offer_floor_plans,
crm_contact_documents, crm_offers, crm_property_interests,
crm_reservations, crm_viewings, crm_activities, crm_activity_items,
crm_lead_stage_history, crm_tasks, crm_projects, crm_units,
crm_developments, crm_transactions, crm_payments, crm_deal_commissions,
crm_commission_splits, crm_commission_agreements, crm_payment_schedules,
crm_emails, crm_notifications, crm_messages, crm_audit_log — and all 8
files in the `crm-documents` bucket.

**KEPT ON PURPOSE**: the 24 developer accounts (crm_accounts), the 9 deal
stages, 2 payment plans, the one group per board, workspace settings and
all crm_users.

⚠️ Storage rows CANNOT be deleted with SQL (`storage.protect_delete()`
raises 42501) — use the Storage API with an admin session; the pattern
used here was: temporarily re-activate preview@irfancrm.local → password
grant → `DELETE /storage/v1/object/crm-documents` with a `prefixes` array
→ deactivate again.

⚠️ MEMBERS AS OF THIS RESET: amiralishamsipur@gmail.com (developer),
shirdel (ceo), **a.shamsipour@irfaninvest.com — approved as AGENT, not
developer** (the approval dropdown defaults to Agent), preview (dev-only,
deactivated), babak.chehrazi@irfaninvest.com (pending approval).

**Round 15 (2026-08-03) — 🐛 the temporary password was never visible**:
approving DID issue the password, but it was rendered inside the pending
row — and approving stamps approved_at, which drops that row out of
`pending`, unmounting the password with it. With no SMTP configured the
password was simply lost. FIX: `issued` now holds {password, name, email}
and renders in its own **"Temporary passwords (n)"** panel at the top of
/crm/team, with a Copy button, select-all text and a per-row dismiss;
the toast points at it. E2E through the UI: approve → panel shows
`C!ix3SaP!*k7jJ` → real password-grant login with that exact string
SUCCEEDED → test rows deleted. ⚠️ the panel is session state: refreshing
the page clears it (the copy is gone for good), which the panel says.
Also recreated `preview@irfancrm.local` (developer) for /preview local
auto-login after the user's delete-button testing removed it — left
DEACTIVATED per the standing rule.

**Round 14 (2026-08-03) — 🐛 "email rate limit exceeded" on signup KILLED**
(migrations `crm_request_access_without_email`,
`crm_request_access_empty_token_columns`):
- CAUSE: `supabase.auth.signUp` fires GoTrue's confirmation email, and the
  built-in sender allows only a handful per hour — repeated signup tests
  died on it. That mail was never part of this product's flow (approval
  confirms the address server-side), so the signup path no longer sends any.
- NEW RPC `crm_request_access(email, full_name, phone, title,
  requested_role)` — security definer, granted to anon (signup runs before
  a session), gated by the SAME `crm_can_register` rules. It inserts the
  auth.users row directly (random unusable password, `email_confirmed_at`
  pre-set) + the matching auth.identities row; the existing
  crm_handle_new_auth_user trigger still files the crm_users row INACTIVE,
  so admin approval on /crm/team is unchanged. Privileged `requested_role`
  values fall back to 'agent'. `signUp` in `(auth)/actions.ts` now calls
  this instead of supabase.auth.signUp (generateTempPassword import dropped
  there; /crm/team still uses it).
- ⚠️ GOTCHA WORTH REMEMBERING: hand-inserted auth.users rows MUST set
  confirmation_token / recovery_token / email_change /
  email_change_token_new / email_change_token_current / phone_change /
  phone_change_token / reauthentication_token to '' — GoTrue scans them
  into Go strings and a NULL makes every sign-in fail with
  "Database error querying schema" (hit exactly this, then fixed + healed).
- E2E: anon RPC over the wire → pending row; duplicate/outside-domain/bad
  email all refused; approve via crm_approve_member → **real password-grant
  login against the auth REST API succeeded**; all zz.* test rows deleted.
- 🔧 Also repaired: the CEO account shirdel.realestate.broker@ had
  `email_confirmed_at` NULL despite being approved and active — GoTrue
  would have refused every password sign-in. Confirmed it (same thing
  approval does). Live members are now ONLY amiralishamsipur@gmail.com
  (developer) and shirdel (ceo).

**Round 13 (2026-08-03) — 🐛 SIGNUP REDIRECT LOOP FIXED**
(migration `crm_claim_membership_reports_state`):
- SYMPTOM: after a company-email signup, clicking the "Confirm your email"
  link landed on `/auth/denied#error=…otp_expired` with
  ERR_TOO_MANY_REDIRECTS.
- CAUSE: `crm_claim_membership()` answered `'ok'` for ANY existing
  crm_users row — including a signup still waiting for approval. So
  /auth/denied redirected to `/`, getProfile saw `is_active = false` and
  redirected back to /auth/denied… forever. (RLS also hides crm_users from
  inactive users, so the route could NOT just re-read the row itself —
  hence fixing it inside the security-definer function.)
- FIX: the RPC now returns `ok | pending | inactive | denied | limit`;
  /auth/denied and /auth/callback only pass `ok` through, otherwise they
  sign out and show a real message (shared `src/app/auth/claim-message.ts`).
  LoginCard reads the GoTrue error from the URL FRAGMENT client-side
  (`useHashAuthError`) so an expired link explains itself instead of
  showing a blank form. Signup notice now says to IGNORE the confirm email.
- E2E in SQL under real impersonation: pending → `pending`, approved-then-
  deactivated → `inactive`, active → `ok`.
- ⚠️ THE CONFIRM EMAIL IS NOT PART OF THE FLOW: `crm_approve_member`
  confirms the address server-side. Correct order = sign up → **admin
  approves on /crm/team** → temp password → sign in. Nobody should click
  the confirmation link (it only ever creates an unusable session; the
  Supabase dashboard toggle "Confirm email" could be turned off entirely).
- ⚠️ MEMBER LIST CHANGED while the user tested the new delete button:
  preview@irfancrm.local, koroosh, amirshamsipur1997@kioskoman.com,
  sara.farzin, a.shasmipur and test.agent are GONE. `/preview` auto-login
  no longer works until that account is recreated. a.shamsipour@ was
  re-signed-up and now sits as an INACTIVE AGENT awaiting approval —
  the live admins are amiralishamsipur@gmail.com (developer) and
  shirdel.realestate.broker@ (ceo).

**Round 12 (2026-08-03) — DELETE a member (migration `crm_delete_member_rpc`)**:
/crm/team gained a delete column (developer/ceo only, self excluded) —
Figma ✕ icon → ConfirmDialog → `crm_delete_member(p_user_id)` RPC
(security definer, `crm_is_admin()`-gated, self-delete refused). It nulls
the two created_by columns that have no ON DELETE rule
(crm_deal_downpayments, crm_offer_tracking), deletes the crm_users row,
then **deletes the auth.users row** — that last step is the point: it
frees the address so an @irfaninvest.com email can sign up again for
login testing. Every other FK is CASCADE (prefs/visits/messages/
notifications) or SET NULL (all work rows keep existing, ownerless).
E2E: throwaway `zz.deltest@irfaninvest.com` created with a real auth row,
deleted from the UI → both tables 0. Guards verified under real
impersonation: agent → "developer or CEO only", admin deleting self →
"you cannot delete your own account". ⚠️ SQL-impersonation gotcha: the
MCP runs each statement in its own transaction, so `set_config(...,true)`
+ `set local role` MUST be wrapped in an explicit begin/…/rollback or
auth.uid() comes back NULL and every guard test looks like it passed.

**Round 11 (2026-08-03) — one ToolbarIcon slot for Search + Filter**: the
user wanted the two icons truly uniform (per Figma toolbar component
883:28380) — new `ToolbarIcon` helper in BoardHeader renders BOTH glyphs
through the same 32×20 slot with a 15px cap, so they can never drift
apart in size again. Search button restructured to the same slot+text
layout as Filter.

**Round 10 (2026-08-03) — toolbar icon corrections**: the Figma asset
server exported the search magnifier VERTICALLY MIRRORED (handle pointed
up) — `bh_search_thin.svg` now carries `transform="matrix(1 0 0 -1 0 h)"`
on the path to restore the classic Q orientation (circle top-left, handle
bottom-right; verified by opening the file directly). The filter funnel
was oversized next to 14px text — Icon size 16→14 in BoardHeader and
20→14 in SalesDashboard. ⚠️ lesson: check Figma-exported vectors for
mirroring; the parent frame's flip transform is NOT carried in the asset.

**Round 9 (2026-08-03) — convert-merge bug + live invoice + badge/delete icons**
(migration `crm_convert_name_guard_and_invoice_reset`):
- 🐛 THE BABAK BUG: lead "babak cherazi" had the same phone as contact
  mehdi mehrjooyi (C-0011), and `crm_convert_lead` merged on phone-OR-email
  silently — babak never appeared on Contacts and the gap-fill wrote his
  country/gender/age onto mehdi's card. FIXES: (1) a phone match now merges
  ONLY when the contact name matches too (email match still merges);
  (2) the RPC returns contact_name/contact_code and the Leads toast says
  exactly which card absorbed a merged lead; (3) new-contact owner falls
  back lead.owner → lead.created_by → converter. DATA repaired: mehdi's
  card cleaned, babak re-converted → NEW contact C-0017 (E2E through the
  UI). ⚠️ real duplicate-phone leads now create a second contact — the
  duplicate-warning toast on edits still flags them.
- 📄 INVOICE FOLLOWS THE MONEY, live: the Deals Invoice cell (chip AND
  button) is now gated on live paid>=target, and BOTH triggers
  (crm_recompute_downpayment_completed + crm_deals_recheck_completed)
  clear invoice_sent_at whenever completeness is lost. E2E'd on a
  throwaway deal: add part → button appears instantly; delete part →
  cell back to "—"; SQL-verified both stamps clear. (This also explains
  mehdi's deal showing "—" now — the user had reduced its payments.)
- 🏅 DealDoneBadge redesigned: light-green pill + rosette-seal check
  (was a solid green chip).
- 🗑 Group delete buttons now use the EXACT Figma delete glyph (node
  1003:28222, ✕-in-circle) via shared `components/ui/DeleteIcon.tsx`
  (currentColor fill so the red hover tint works) across all 9 boards.
- Debug sweep: Supabase advisors re-run — nothing new from the CRM; the
  standing ERRORs are the whitewill-site tables (leads/ai_conversations/
  analytics_*) with RLS off, already tracked as that project's launch
  blocker, plus Auth leaked-password protection off (dashboard toggle).

**Round 8 (2026-08-03) — toolbar slimmed to Search + Filter, thin Figma icons**:
- BoardHeader (shared by all boards): Person owner-filter button, the inert
  Group by button and the "…" menu are GONE (user request — the
  quick-filters panel covers Owner). The person props (users /
  personFilter / onPersonFilter) stay in the TYPE, accepted but IGNORED,
  so no board needed touching; itemHeight/onItemHeight props were removed
  for real and ActivitiesBoard pinned to ROW_HEIGHTS.single (the item
  height submenu lived in the deleted "…" menu). MoreMenu/HeightGlyph/
  MORE_MENU_ITEMS deleted; `export type ItemHeight` KEPT
  (activities-config imports it).
- Icons: EXACT thin Monday glyphs pulled from Figma (user link node
  1003-28220 for the funnel; search magnifier from the board toolbar node
  883:28381) → committed as `public/figma/bh_search_thin.svg` +
  `bh_filter_thin.svg` (preserveAspectRatio fixed to xMidYMid meet — the
  known warp trap). ICONS.bhSearch/bhFilter remapped; search img now
  15×15 (was stretched 15×20), filter Icon size 16 in the 32px slot per
  the design's insets. SalesDashboard's funnel picks up the thin icon
  automatically. Old lb_imgVariant6/64.svg files left in place (other
  names may reference the family).

**Round 6 (2026-08-03) — stray groups purged + groups are deletable**:
- DATA: all empty leftover groups deleted from the 3 funnel boards —
  offers "Closed Won" + 2×"New Group", contacts "Inactive Contacts" +
  2×"New Group" (the one holding contact C-0006 "amir" had that row moved
  to Active Contacts first), leads "junk lead" + "New Group"; their
  crm_group_prefs rows cleaned. Each board now has exactly ONE group
  (New Leads / Active Contacts / Active Deals). This also closes the old
  "two empty groups on Leads" leftover question.
- FEATURE: group headers on Leads/Contacts/Offers show a hover trash
  button (admin tier only — matches the crm_is_admin DELETE RLS) that
  opens the new shared `components/ui/ConfirmDialog.tsx`. Rules enforced
  client- AND server-side (new actions deleteGroup /
  deleteContactGroup / deleteDealGroup): only EMPTY groups may go, and
  never the last one; non-empty → alert toast with the row count.
- E2E on Offers: add group → trash → confirm → deleted (toast), trash on
  Active Deals (8 offers) → refused with toast, no dialog. Build clean.

**Round 7 (2026-08-03) — group delete extended to ALL nine boards**: the
user asked for it everywhere, so Accounts / Client Projects / Activities /
Developments / Units / Viewings got the same guarded delete as the funnel
boards — new actions deleteAccountGroup / deleteProjectGroup /
deleteActivityGroup / deleteDevelopmentGroup / deleteUnitGroup /
deleteViewingGroup (empty-only + never-the-last, admin tier; all six
group tables already had crm_is_admin DELETE RLS), hover trash on every
group header, shared ConfirmDialog. Applied by a scripted patterned edit
over 18 files (the boards are byte-uniform); tsc + build clean; verified
on Accounts: trash renders, dialog correctly refuses to open for the
24-row Companies group. ⚠️ pane note: synthetic JS clicks were dead on
this session's pages (hydration) — real computer clicks worked.

**Round 5 (2026-08-03) — quick filters match each board's real columns**:
- Contacts: Type/Priority/Title dims (columns removed ages ago) replaced
  with Owner / Property type / Size (demand lists w/ colors) / Country /
  Gender / Developer account; Group kept.
- Leads: added a "Moved to contact" dim (converted_contact_id; Blank =
  still open).
- Offers: Contact/Account renamed Client/Developer + new dims Country
  (via resolveClient), Offer type, Offer size, "Moved to deal"
  (accepted_at; Blank = open offer).
- Deals board got quick filters for the FIRST time: Owner / Client /
  Country / Developer / Downpayment (Complete·In progress, from
  downpayment_completed_at + downpaymentOf) / Invoice (Sent·To send).
  `clientOf()` hoisted and reused by cells + dims. Verified in the
  browser on all boards; Downpayment=Complete correctly showed 2 of 4.

Earlier the same session — one user request, one change set: the row
drawers moved one step down the funnel, deployed the same day.
- **Offers board rows now open the CLIENT drawer** — the same ContactDrawer
  the Contacts board uses (details, demand, documents, offers list, per-offer
  tracking feed). The client is resolved by `contact_id` with a
  case-insensitive `contact_name` fallback; a row with no linked client shows
  an alert toast ("Link a client to this offer first…") instead of opening.
  See `resolveClient` / `openClientDrawer` in `DealsBoard.tsx`.
- **The transaction drawer (`DealDrawer`: client block, shortlist, inner
  offers, reservation, viewings, financials) is Deals-board-only now.** The
  deals page fetches `crm_units` and passes it through (was hardcoded `[]`),
  so its pickers behave exactly as they did on Offers.
- `offers/page.tsx` no longer fetches `crm_units`; `DealsBoard` lost its
  `units` prop.
- The Contacts board still opens the same contact drawer — the user asked to
  "move" it to Offers; it was ADDED there and kept on Contacts. Say the word
  to remove it from Contacts if they meant a literal move.
- This partially answers open question 1 below: the Phase-2 sections were
  NOT removed — they simply live only on the Deals drawer now.
- Verified in the browser through /preview on a dev server (the preview
  account was re-activated for the test and DEACTIVATED again right after).
  tsc + build clean. ⚠️ A stale `next dev` from 08-01 was still serving old
  code on :3070 and Next 16 refuses a second dev server per folder — it was
  killed first; check for leftovers before starting a server.

## WHAT HAPPENED ON 2026-08-02 (read this first)

Everything below was built, tested against the real database and deployed the
same day. Fifteen commits, `7cbe4ce`…`661d5e1`, plus these migrations:
`crm_approve_member_rpc`, `crm_offers_deals_downpayments`,
`crm_deal_invoice_sent`, `crm_downpayment_completed_flag`,
`crm_contact_codes`, `crm_direct_messages`, `crm_client_country`,
`crm_custom_column_domain_types`, `crm_person_gender_age`,
`crm_leads_owner_visibility`, `crm_offer_tracking`,
`crm_offer_tracking_entry_types`.

1. **Deals split into Offers + Deals.** `/crm/offers` is every proposal;
   **Move to deal** on an accepted one stamps `accepted_at` and it appears on
   the new `/crm/deals`, where the downpayment is tracked (percent → computed
   amount → Part 1..N payments → *Complete ✓* → **Send invoice to developer**).
2. **Per-offer lead tracking** in the contact drawer — a typed activity feed
   (call / meeting / viewing / email / document / note) on a node-and-line
   timeline, with author, duration, reminder, attachment, and a **+** per offer.
3. **Agents see only their own leads** (Developer/CEO see all).
4. **Real member-to-member chat** in the TopBar inbox; the bell is
   notifications only; the dead search pill and three inert icons are gone.
5. **Trilingual help guide at `/help`** (fa/en/ru) behind the "?" icon.
6. **Person fields**: country, gender, age on leads + contacts, mirrored
   read-only into the Offers/Deals drawers; contacts carry a unique code
   (C-0001) so same-named people can never be confused.
7. **Auth**: approval no longer needs the service-role key, and the Supabase
   Site URL is finally the custom domain — the "link opens localhost" bug is
   dead. The first real agent signed up and signed in end to end.

**Live data as of the end of 2026-08-02** (all of it REAL — the user works in
this CRM daily; never wipe or reseed): 8 leads · 14 contacts (codes up to
C-0015) · 3 open offers · 4 accepted deals · 8 downpayment parts · 5 tracking
entries · 3 direct messages · 6 active members. The user's own account
`a.shamsipour@` has already changed its temporary password.

**Open questions I asked and you have not answered yet** — do not action
without asking again:
- ~~The drawer's **Shortlisted properties / Reservation / inner Offers**
  sections are Phase-2 leftovers…~~ **ANSWERED in the second 08-02
  session: the user said delete what has no use.** Shortlisted +
  Reservation were removed from both drawers; the inner Offers ladder
  stays (works without units). See "Round 4" above.
- Should the per-agent visibility rule extend to **Contacts / Offers /
  Deals** too? Today only Leads is restricted, so a converted client is
  still visible team-wide.
- Age is stored as a plain number (a snapshot). Switch to date of birth so
  it stays correct by itself?

## START HERE — product shape

**Live:** https://crm.irfaninvest.com (and irfan-crm.vercel.app).
Deploy with `npx vercel deploy --prod --yes`. Push does NOT deploy.

**The product now has one story end to end**, and every board was reshaped to
serve it. Read this before changing any board:

```
Lead captured  →  Move to contact  →  the contact IS the client's Demand
                                       (what they want + their documents)
                                   →  one or more OFFERS (/crm/offers),
                                      each priced against that demand
                                   →  Move to deal on the accepted offer
                                   →  DEAL (/crm/deals): downpayment % →
                                      computed amount → Part 1..N payments
                                      until the downpayment is complete
```

**OFFERS / DEALS SPLIT (2026-08-01 late, commit `632ae3d`, migration
`crm_offers_deals_downpayments`, DEPLOYED):**
- The old Deals board is now **Offers** at `/crm/offers` (route folder
  renamed from `app/(app)/crm/deals` — component files under
  `components/crm/deals/` KEPT their names; only labels changed). board_key
  rows migrated 'deals'→'offers' in crm_custom_columns / crm_board_visits /
  crm_board_favorites / crm_group_prefs, and the crm_custom_columns
  board_key CHECK gained 'offers'.
- Every offer row has a green **Move to deal** button (last column): sets
  `accepted_at`, prefills `downpayment_percent` from the developer's
  `crm_accounts.default_downpayment_percent` (editable "Downpayment %"
  column on Accounts), turns into a ✓, toast has undo. The row STAYS on
  Offers (like leads after Move to contact).
- **New Deals board** `/crm/deals` (`AcceptedDealsBoard.tsx` +
  `app/(app)/crm/deals/{page,payment-actions}.tsx`): accepted offers only,
  client + accepted offer mirrored read-only, editable Offer price /
  Downpayment % (DB generated column `downpayment_amount` recomputes),
  Paid progress bar, Remaining chip ("Complete ✓" when covered), and a
  Payments popover recording **Part 1..N** into `crm_deal_downpayments`
  (RLS: team-read; write = manage tier or parent deal owner/creator;
  cascade-deleted with the deal). Part numbering continues from max.
- Notify triggers' links repointed to /crm/offers; usage-stats RPC counts
  offers (all rows) and deals (accepted). "New offer" button on Deals
  routes to /crm/offers — deals only arrive by accepting an offer.
- E2E'd: accept from UI (percent prefilled 20 from developer), Part 1+2 to
  Complete ✓, delete part → "15K OMR left", RLS/generated column verified
  in SQL, all test rows cleaned.
- **Invoice step (commit `34833c8`, migration `crm_deal_invoice_sent`)**:
  when the downpayment completes, the Deals board's Invoice column turns
  from "—" into an amber **Send invoice to developer** button
  (`crm_deals.invoice_sent_at`; green "Invoice sent ✓" chip after, undo in
  the toast) and the covering payment's toast says "Downpayment complete —
  send the invoice to <developer>". Also removed the 40px row fillers that
  stuck out past the header (the two stray lines at the table's right
  edge). First real deal exists: "Offer — mehdi mehrjooyi" (139K, 20%,
  now fully paid) — user-created, do not touch. ⚠️ several offers share
  that name — always match by id, not name, when testing.
- **"Deal done" across boards (commit `92b214d`, migration
  `crm_downpayment_completed_flag`)**: `crm_deals.downpayment_completed_at`
  is stamped by an AFTER trigger on crm_deal_downpayments the moment the
  parts cover the downpayment, cleared when they drop below it, and a
  BEFORE trigger on crm_deals rechecks it when deal_value /
  downpayment_percent change (it computes the target itself — the
  generated column is not available on NEW). Shared green badge
  `components/crm/deal-done-badge.tsx` renders on the name cell of the
  OFFER row, the CONTACT (FK match + name-cache fallback in
  ContactGroup.hasDoneDeal), and the source LEAD
  (converted_contact_id ∈ doneContactIds, fetched in the leads page).
  Backfilled; verified on the real completed deal across all 3 boards.
- **Offers first column = the CLIENT (commit `a9a7737`)**: the sticky first
  column is a Contacts ConnectPicker (find-or-create), not free text — an
  offer is made TO a person. The separate Client column was removed as a
  duplicate. Picking (or creating) a client syncs the stored row name to
  "Offer — <client>"; "+ Add offer" auto-links when the typed text matches
  an existing contact (case-insensitive). Deal-done badge + drawer-open
  button still live in that first cell. The offer name is no longer
  directly editable on the board (drawer/db keep the synced name).
- **ConnectPicker portalled + unique keys (commit `4a6e1ad`)**: the
  picker's fixed panel rendered inline, so LOWER groups' sticky titles
  painted over it (per-group stacking contexts — the exact bug the shared
  Popover fixed on 07-26 by portalling; the picker was missed then). Now
  portalled to <body>; outside-click checks trigger AND panel. Also
  option keys were bare names while several real contacts share one name
  ("amir" ×3) — duplicate keys made React drop/duplicate rows WHILE
  FILTERING (typed "mehdi", still saw "amir" rows). Keys are
  name|sub|index now.
- **Contact codes + exact picking (commit `a4de053`, migration
  `crm_contact_codes`)**: `crm_contacts.code` = simple unique code
  C-0001… (sequence + BEFORE INSERT trigger, backfilled by created_at;
  unique index). Shown in the picker sub line ("C-0004 · Muriya…") and on
  the Contacts board name cell. PickerOption gained `id`,
  `onPick(name, id)` passes it, the offers board patches
  contact_id/account_id directly (both added to PATCHABLE), and
  `crm_resolve_deal_links` now TRUSTS an explicitly-changed id instead of
  overwriting it with a `limit 1` name lookup — picking "amir · C-0006"
  verifiably links exactly that amir. ⚠️ preview@irfancrm.local was found
  DEACTIVATED (user did it from Team) — it was temporarily re-activated
  for this E2E and set back to inactive; /preview auto-login will not work
  until it is re-activated (privilege-guard trigger must be disabled
  around the SQL toggle).
- **Member chat + TopBar cleanup (commit `d5bef4e`, migration
  `crm_direct_messages`)**: NEW `crm_messages` (sender/recipient/body/
  read_at; SELECT policy = either participant; writes ONLY via
  security-definer RPCs `crm_send_dm(p_to, p_body)` and
  `crm_mark_dm_read(p_from)`). The old notification-row DMs could never
  show a conversation (own-rows RLS hides what you sent) — they were
  migrated into crm_messages with their read state and deleted from
  crm_notifications. TopBar: search pill REMOVED; inbox icon is now
  `MessagesInbox.tsx` — conversation list (unread chips, last-line
  previews, active members), thread bubbles, Enter-to-send, marks read on
  open, 60s badge poll + 15s open-panel refresh. Bell = notifications
  only: Messages tab + in-panel composer removed, fetches filter
  `.neq(type,'message')`. Workspace-home tab "Collaborators" renamed
  **"Send message"** (key string changed in all 3 spots incl. the Members
  button); its MessageDialog now calls crm_send_dm. The real Persian test
  DM (preview→amirali, 22 Jul) lives in crm_messages — keep it. E2E'd
  both directions incl. live poll pickup + read marking.
- **Home = real funnel (commit `4231d9c`)**: the old pipeline widget
  summed LEAD budgets by lead stage ("55K / 6 open deals" measured
  nothing). page.tsx now reads the actual model: Open offers (count +
  value), Deals accepted (count + value), Downpayments collected vs
  target (+ "N invoices to send" chip in the widget header), NEW Leads
  widget (30-day intake + top-source chips + converted count), NEW
  Upcoming viewings widget (crm_viewings.scheduled_start >= now, next 5).
  The un-connectable Meetings/calendar promo widget was REMOVED from
  HOME_WIDGETS (unknown keys filter out of saved layouts) and stored
  layouts were migrated meetings→leads in SQL (sections is JSONB).
  accounts/contacts metric widgets + Recents unchanged.
- **TopBar trimmed + /help guide (commit `b0f0fac`)**: Invite members /
  Apps marketplace / Settings icons REMOVED (inert Monday chrome;
  TopIconButton deleted with them). The "?" links to **/help** —
  `components/help/HelpGuide.tsx`, a static trilingual manual
  (fa RTL / en / ru, switcher persisted in localStorage `crm-help-lang`,
  default fa): six-step sales-flow diagram, downpayment worked example
  (price × % = target + part-payments bar → Complete → invoice), 8
  per-board cards, roles matrix, tips. Content lives in the DICT object
  in that file — update it when the product changes.
- **Country across the funnel (commit `6892299`, migration
  `crm_client_country`)**: nationality is its OWN field (the dial code
  can't stand in for it — Indian client, +966 number). `crm_leads.country`
  + `crm_contacts.country` (text = country NAME), edited via shared
  `components/crm/country-cell.tsx` (searchable portalled popover, reuses
  the phone-input COUNTRIES list — one list per concept; Clear option;
  `countryFlag(name)` helper). Editable on Leads + Contacts (after the
  phone column), mirrored read-only (canvas bg) on Offers
  (`client_country`) and the Deals board; `crm_convert_lead` copies it
  (fill-the-gap on match, straight copy on create); country quick-filter
  dim on Leads + Contacts. E2E: pick India on a lead → DB, Clear → null.
- **Gender + age (2026-08-02, migration `crm_person_gender_age`)**:
  `gender` ('male'|'female' check) and `age` (int, 16..120) on BOTH
  crm_leads and crm_contacts, editable next to Country on both boards
  (OptionCell over `GENDER_OPTIONS` in the new `src/lib/person-fields.ts`
  — one list per concept, with `genderLabel` / `ageLabel` helpers), shown
  in the Details block of BOTH drawers alongside Country, carried across
  by `crm_convert_lead`, and a Gender quick-filter dim on both boards.
  Age is a snapshot the agent was told, NOT a birthday — it does not age
  itself; switch to date_of_birth if that ever matters. E2E'd through the
  UI (Male + 42 → DB) and through a converted test lead (female/29/India
  reached the new contact); every test value reverted afterwards.
- **Client block in the Offers + Deals drawers (commit `1fa7501`)**: both
  drawers open with a read-only **Client** section (name + C-code,
  country w/ flag, gender, age, phone, email). The data rides along in
  the existing `getDealRelations` round trip — it now selects
  `contact:contact_id(...)` and returns `client` (`DrawerClient` type
  exported from `offers/drawer-actions.ts`). No new board columns, by
  request. ⚠️ The Deals board had NO drawer before; its rows gained the
  same row-open button and reuse the shared `DealDrawer` (the deals page
  now also fetches `crm_deal_stages` for the header pill; `units` is
  passed empty since inventory is not tracked).
- **Board declutter (commit `22c4fe9`)**: Contacts board dropped the
  built-in Preferred area + Requirements columns (user request — both
  still editable in the contact drawer's demand section; DB columns and
  values untouched). Leftover TEST custom columns deleted from
  crm_custom_columns: Numbers/Text/Priority (offers, 07-21) + Checkbox
  (contacts, 07-26). Only ONE custom column remains anywhere: "Status" on
  Activities — user has not asked about it.
- **Add-column menu = domain types (commit `7cbe4ce`, migration
  `crm_custom_column_domain_types`)**: the "+" menu now offers
  "Client & property" (country / property_type / bedrooms / money /
  percent — new CustomColumnType values, rendered by CountryCell,
  OptionCell over the SHARED demand lists, and NumberCell with OMR/%
  formats) + "Basics" (text / number / date / people). Legacy Monday
  types (status/dropdown/checkbox/priority) are NOT creatable any more
  but still render (the Activities "Status" column survives); DB type
  CHECK widened to all 13 values. E2E'd add-Country-column → pick Iran →
  jsonb save → column + test value cleaned. ⚠️ 2026-08-02 note: one
  Vercel edge IP (76.76.21.241) timed out from the dev machine while the
  other anycast IPs served crm.irfaninvest.com fine — transient edge
  issue, NOT a DNS/deploy problem; verify with
  `curl --resolve crm.irfaninvest.com:443:<other-ip>` before touching DNS.

- **Leads** = capture only. Lead · Status · Owner · First name · Last name ·
  Telephone · Email · Lead Source (Meta / Google Ads / Dubizzle / Co-worker /
  Personal) · Date · Text · Move to contact. Nothing else — Score, activity
  timeline, Company, Title and the rest were removed on request.
- **Contacts** = the client's Demand. Property type · Size · Budget ·
  Preferred area · Requirements sit on the row; the drawer adds documents
  (passport etc.) and a **New sales offer** button. Title / Type / Priority
  were removed as unusable.
- **Deals** = one row per sales offer. The client's wants and budget are
  MIRRORED from the linked contact (grey, read-only, never copied) next to what
  we offer: Developer · Offer type · Offer size · Offer price · **vs budget**
  (green "within X" / red "over X"). A client can hold many offers.
- **Inventory is deliberately NOT tracked per unit.** Stock rotates weekly and
  is shared with other agencies, so an offer is pinned to the developer and the
  kind of unit. The Units/Developments boards still exist but are empty.

**FIRST REAL AGENT SIGNUP TESTED END TO END (2026-08-02)** —
`test.agent@irfaninvest.com` ("Test Agent", role agent) signed up through
the live form, was approved via `crm_approve_member`, signed in with the
temporary password, was forced through the first-login dialog and landed
on the dashboard. **The account is ACTIVE and its password is
`AgentReal-2026#pass`** — delete it or hand it over before rollout.
⚠️ The old "confirmation link opens localhost" bug does NOT affect this
flow: approval confirms the address server-side, so nobody clicks a
confirmation link at all. It still matters for Google sign-in and
password-recovery links, which is why item 3 below is still open.

**LEAD TRACKING PER OFFER (2026-08-02, migration `crm_offer_tracking`)** —
the contact drawer's list is labelled **Offers** now (it always held
Offers-board rows), and under it each offer keeps its own follow-up trail:
`crm_offer_tracking` (deal_id, entry_date, note, remind_at,
reminder_done, file_name/storage_path/mime_type/size_bytes). RLS follows
the parent offer — read if you can see the offer, write if you could edit
it. Files go straight from the browser into the private `crm-documents`
bucket under `tracking/<deal_id>/…` and open via 5-minute signed URLs.
UI: `components/crm/contacts/tracking-section.tsx` — a Monday-style
activity feed (migration `crm_offer_tracking_entry_types` added
`entry_type` call|meeting|viewing|email|document|note + `duration_min`):
each entry is a colored icon node on one vertical line with the kind and
timestamp above the card, the author's avatar/name (joined via
`author:created_by(full_name, avatar_url)`), a duration chip for timed
kinds, notes over 150 chars collapsed behind Show more, plus the reminder
and attachment chips. Every trail starts at an "Offer created" node, and
a **+ button on each offer header** opens the composer (type chips →
date / duration / reminder → note → file).
⚠️ PANE-TESTING NOTE: the drawer has TWO `input[type=file]` —
`[0]` is the Documents uploader, `[1]` is tracking. Driving `[0]` by
mistake really uploads contact documents (4 stray rows had to be deleted).
Also React ignores a synthetic `change` on a file input (its value tracker
sees no change) — call the element's `__reactProps$…onChange({target})`
directly after setting `.files`.

**LEAD VISIBILITY IS NOW PER-AGENT (2026-08-02, migration
`crm_leads_owner_visibility`)** — agents see ONLY leads they own or
created; seeing everyone's leads is Developer/CEO only (`crm_is_admin`).
SELECT on `crm_leads` was team-wide before; the satellite tables
(`crm_activities`, `crm_lead_stage_history`, lead-linked
`crm_property_interests`) now test `exists (select 1 from crm_leads
where id = …)`, which the lead policy itself filters — so no API path
leaks another agent's timeline. ⚠️ Consequences to know:
- `crm_leads_update` still allows `crm_can_manage()` (media/manager), but
  they can no longer SEE others' leads, so that grant is inert. No
  media/manager accounts exist today. Say the word to widen SELECT to
  `crm_can_manage()` if a sales manager should see the whole board.
- **Unassigned leads are invisible to agents** (owner null + created by an
  admin) — an admin must set the Owner before an agent can work one.
- Contacts / Offers / Deals are still team-visible; only Leads changed.
  The same client reappears on Contacts after Move to contact.

**Blocked on the user, not on code:**
1. ~~`SUPABASE_SERVICE_ROLE_KEY`~~ — NO LONGER NEEDED (2026-08-01 late):
   approval now runs through the `crm_approve_member` security-definer RPC.
   The empty placeholder in `.env.local` is dead; nothing reads it.
2. `SMTP_HOST/USER/PASSWORD` (Zoho) — without them approval still works and
   shows the temporary password on screen, but no email goes out. Supabase's
   built-in sender is rate-limited and already returned
   "email rate limit exceeded" during testing, so this is a real launch item.
3. ~~Supabase Auth URL Configuration~~ **DONE by the user 2026-08-02** —
   verified empirically, not by screenshot: probing
   `/auth/v1/verify?token=bogus&type=recovery` shows the stored Site URL
   is now `https://crm.irfaninvest.com` (it used to be the localhost
   default — that was the whole "link opens localhost" bug), and
   redirect probes resolve as: `crm.irfaninvest.com/auth/callback` ✅,
   `irfan-crm.vercel.app/auth/callback` ✅, `localhost:3070` ✗ (falls
   back to prod — harmless, local dev signs in via /preview which uses
   no redirect), unknown domains ✗ (correctly refused). Re-run that probe
   with the anon key if auth links ever look wrong again.

4. `RESEND_API_KEY` + irfaninvest.com verified in Resend — until then the
   `crm-send-email` edge function answers 503 and every Send email button
   fails. Same family of work as item 2; the user said "email later".

**Accounts that need a decision before the team grows:**
- `test.agent@irfaninvest.com` — the first end-to-end signup test, ACTIVE,
  role agent, password `AgentReal-2026#pass`. Delete it or hand it over.
- `a.shamsipour@irfaninvest.com` (the user's own, role developer) was
  re-approved on 2026-08-02 with temporary password `HZ3f8x8qtn#U2g` and
  `must_change_password = true`. If it is still true, they never signed in.
- `a.shasmipur@irfaninvest.com` — typo account, now DEACTIVATED by the user.
- `preview@irfancrm.local` — deactivated. `/preview` auto-login only works
  while it is active; re-activate via SQL with the privilege-guard trigger
  disabled, and set it back afterwards (this session did that four times).

**Leftovers the user was asked about and never answered**: two empty groups
on Leads. (The stray custom columns were deleted on 2026-08-02; the only
custom column left anywhere is "Status" on Activities.)

## SESSION 2026-08-01 late (commit `1651c0d`, migration `crm_approve_member_rpc`)

Admin-side functions pass. The one broken admin function — Approve — no
longer depends on the service-role key:

1. **`crm_approve_member(p_user_id, p_password, p_role)` RPC** (security
   definer, admin-gated by `crm_is_admin()` in the database): sets the
   temporary password directly on `auth.users` (`extensions.crypt` bf, the
   same mechanism the SQL-created test users always used), confirms the
   address, and activates the `crm_users` row (`must_change_password = true`,
   `approved_at = now()`, optional role). Granted to `authenticated` only;
   anon revoked. GoTrue accepts the hash — verified by a real password-grant
   login against the auth REST API.
2. **`approveMember` action rewritten** to call the RPC; the tier check is
   the database's now. `src/lib/supabase/admin.ts` DELETED (nothing else
   used it; git history keeps it).
3. **/admin Directory approves too**: pending members (`approved_at` null)
   show a "waiting for approval" badge and an **Approve** button in place of
   the Active toggle — a bare activate would have stranded a passwordless
   account (signup stopped asking for a password on 07-26). The one-time
   password shows inline, same as the Team page.
4. **Custom-column rename in /admin is awaited** and rolls back + reports on
   refusal (was fire-and-forget with an unconditional success flash).

E2E (ghost signup `ghost.approve.test@…`, then deleted): agent caller
refused ✓, admin RPC approves ✓, GoTrue login with the temp password ✓,
UI approve from /admin Directory through the real server action ✓, all
five /admin sections render after the DOM restructure ✓. tsc + build clean.

5. **NESTED POPOVER FIX** (`334d41f`, user-reported): scrolling the country
   list inside the phone editor closed the whole popup, and picking a
   country was silently swallowed — the picker is a second `Popover`, both
   panels portal to `<body>` as SIBLINGS, so the parent's close-on-scroll /
   outside-click checks saw the child's DOM as "outside". Open panels now
   report themselves to ancestor popovers via the `PopoverAncestors` context
   in `leads/cells.tsx`; ancestors treat events inside a registered
   descendant as their own, while events in an ancestor still close the
   descendant (clicking the number field closes the list) and board
   scrolling still commits-and-closes. Country list got `overscroll-contain`
   (+ `touch-pan-y`) so wheeling past its end does not chain into the page.
   Any future popover-inside-popover gets this for free. Verified in the
   pane: inner scroll keeps both open ✓, country pick lands (+974) ✓,
   number-field click closes only the list ✓, board scroll closes ✓.
   (Test flipped lead "Manager" to +974 — restored to +968 in DB.)

## SESSION 2026-07-26 → 08-01 (commits `b30e888` … `c6e449c`)

Auth, then a board-by-board reshape driven by the user's own description of how
the business works. In order:

1. **Signup is now admin-approved with a temporary password** (`b30e888`).
   The form no longer asks for a password; the trigger leaves self-signups
   `is_active = false, approved_at = null`. /crm/team grew an approval queue:
   pick the role, Approve, and the action issues a 14-char password via the
   service-role client, confirms the address, activates the account and mails
   it. **The password is also shown once to the approving admin**, so onboarding
   is not blocked while SMTP is unconfigured. `FirstLoginPassword` is a blocking
   dialog in the app layout for anyone with `must_change_password`.
   Migrations: `crm_force_password_change`, `crm_signup_requires_admin_approval`,
   `crm_users_approved_at`.
2. **Google stayed on SIGN-IN only** (`81b9e34`). Removing it locked out
   amiralishamsipur@gmail.com and amirshamsipur1997@kioskoman.com — both are
   google-provider users with NO password at all. Sign-up has no Google button.
3. **Sidebar split** (`691652c`): Home / Leads / Contacts / Deals / Sales
   Dashboard above a rule, supporting boards below.
4. **Leads rebuilt** (`510e59d`, `b887877`): new `first_name`, `last_name`,
   `notes`, `lead_date` columns, backfilled; `crm_leads_name_parts` trigger
   keeps the row title and the parts in step without overwriting typed values.
5. **Contact = Demand page** (`0b1ff29`, `7764456`): demand columns on
   crm_contacts, `crm_contact_documents` + a **private** `crm-documents` bucket
   (identity papers — 5-minute signed URLs, no public read), and
   `crm_convert_lead` now carries the whole lead across.
6. **Deals = sales offers** (`425b927`, `70b884e`): offer fields on crm_deals,
   client side mirrored, `createOfferForContact` seeds a new offer from the
   client's own demand.
7. **Developers imported** (`b3f65b0`): the website project in the SAME Supabase
   database already had the register — all 24 are now Accounts. One-time copy,
   not a live link. `PROPERTY_TYPES` was rebuilt from the 407 real units, and
   the Units board's rival list (which said "Retail" where the other said
   "Shop") now re-exports the shared one.

### Bugs fixed this session, with their real causes

- **`invalid input syntax for type uuid: "temp-…"`** (`198d7c2`) — adding a row
  showed a placeholder with a client-side id and threw the insert's result
  away, so clicking a cell before the insert returned sent that id to Postgres.
  The nine add actions now return the saved row and each board swaps its
  placeholder for it (matched on the exact id, so concurrent adds cannot
  collide), and `isTempId()` guards every write path as a backstop.
  The same commit fixed `crm_contacts` PATCHABLE missing every demand column —
  editing Budget from the board silently did nothing.
- **Row menu painted under the next group's title** (`3bad5b6`) — each group is
  a `<section>` whose sticky title creates a stacking context, so z-index could
  never win. `Popover` now portals to `document.body`. This fixed every popover
  on every board at once.
- **vs-budget chip overflowed its cell** (`9991868`) — money in a fixed-width
  cell now renders compact ("3M OMR") with the exact figure on hover.
- **Cells were near-impossible to click** (`b887877`, `6a36e60`) — an empty
  InlineEdit rendered a button with no content. `src/components/crm/cell-style.ts`
  is now the one editable-cell shape (whole cell is the target, hover tints it,
  the editor fills the same box) and every inline editor uses it.
- **Phone did not save the country code at all** (`c6e449c`) — the column
  existed but nothing wrote to it. `src/components/crm/phone-input.tsx` is the
  one phone control: 60+ countries with names (a dial code is ambiguous — +1 is
  US and Canada), searchable, country first then number, stored in separate
  columns so the generated `normalized_phone` finally works for dedup.

### Conventions this session established — keep them

- **Every write action must count affected rows.** RLS rejects by matching zero
  rows, not by erroring. See `src/lib/mutate.ts`.
- **Boards must await their writes and roll back on refusal** — use
  `applyRowEdit` / `persist` from `src/components/crm/persist.ts`.
- **New cell components import `CELL_BUTTON` / `CELL_INPUT`** from
  `cell-style.ts` rather than writing their own classes.
- **One list per concept.** `PROPERTY_TYPES`, `COUNTRIES`, `LEAD_SOURCES` each
  live in exactly one file. Two lists of the same thing is how "Shop" vs
  "Retail" happened.
- **Mirror, do not copy**, when one board shows another's data (Deals shows the
  contact's demand; Contacts computes deal counts).

### Testing note that will save you an hour

The Browser pane never hydrates while the `loading.tsx` Suspense boundaries are
present — the board renders but every click is dead with no console error. To
drive the UI, park them and restore afterwards:

```
mv "src/app/(app)/loading.tsx"{,.bak}; mv "src/app/(app)/crm/loading.tsx"{,.bak}
# ... test ...
mv "src/app/(app)/loading.tsx"{.bak,}; mv "src/app/(app)/crm/loading.tsx"{.bak,}
```

The pane also reports a zero viewport at random, which makes `getBoundingClientRect`
and `elementFromPoint` unreliable — prefer asserting against the database.

## CUSTOM DOMAIN (2026-07-26) — https://crm.irfaninvest.com

The CRM's real address. `irfan-crm.vercel.app` still resolves to the same
deployment. Setup, for reference if it ever has to be redone:

- `crm.irfaninvest.com` added to Vercel project `irfan-crm`; ownership verified
  automatically because `irfaninvest.com` already lives in the same Vercel team.
- DNS is Namecheap BasicDNS (`dns1/dns2.registrar-servers.com`). One record in
  Advanced DNS: **`CNAME  crm → cname.vercel-dns.com.`** — the same target the
  existing `www` record uses. Vercel also offers a per-project target
  (`e88392216869c707.vercel-dns-016.com.`); the generic one is fine and keeps
  the zone consistent.
- Let's Encrypt certificate issued automatically on first request.
- `NEXT_PUBLIC_SITE_URL` (Vercel production) switched to
  `https://crm.irfaninvest.com`, then redeployed — this is what the signup
  action uses for `emailRedirectTo`, so confirmation links land on the new host.
- ⚠️ `vercel env pull` and the env API return an EMPTY value for every
  encrypted variable with this token, including the Supabase ones that
  demonstrably work. That is a decrypt limitation, not a missing value — trust
  the CLI's `Added Environment Variable` confirmation, and do not "fix" an env
  var because the pull looks blank.
- ⚠️ STILL REQUIRED (dashboard-only, no MCP or API for it): add
  `https://crm.irfaninvest.com/auth/callback` to Supabase → Authentication →
  URL Configuration → Redirect URLs, and set Site URL to the new domain.
  Without it, email confirmation and Google OAuth break on the new host.

## INFRASTRUCTURE HARDENING (2026-07-26, commit `7d0cf13`, DEPLOYED)

Pre-rollout pass over the whole app before opening the CRM to the sales team.
Five migrations + a code sweep. **Read this before touching the write path.**

1. **Silent write failures (the big one).** RLS rejects a write by matching zero
   rows, *not* by raising an error: PostgREST answers `204` and supabase-js
   reports `{ error: null }`. Every action used the bare `.update()/.delete()`
   shape, so a refused write showed "We successfully updated 1 item" and the
   value reverted at the next refetch. Verified in SQL: an agent updating a
   contact they neither own nor created updates 0 rows with no error.
   - `src/lib/mutate.ts` — `PERMISSION_ERROR` + `counted()`.
   - 40 write sites now pass `{ count: "exact" }` and return an error when
     nothing was written. **Any new write action must do the same.**
   - Exceptions kept deliberately silent: activity "touch" writes
     (`last_activity_at`/`last_interaction_at`) and un-starring a board — a
     zero-row result there is a no-op, not a refusal.
2. **Boards await their writes.** `src/components/crm/persist.ts` holds
   `applyRowEdit()` (optimistic patch → await → rollback + alert toast on
   refusal → success toast with undo) and `persist()` for renames/stage/owner
   moves. It replaced nine hand-rolled copies of the same block. Client Projects
   and Activities had *no* permission guard at all — both now have one.
3. **Owner parity.** `crm_contacts`/`crm_accounts` had no `owner_id` and were
   creator-edit only while `canEditRow()` promised owner-edit. Both gained
   `owner_id` (backfilled from `created_by`), an Owner column on the board,
   owner-edit RLS, `owner_id` in PATCHABLE, and inserts/quick-creates set it.
   `crm_convert_lead` hands the new contact to the *lead's* owner.
   Migration `crm_standardize_row_ownership`.
4. **Policy + grant hardening.** All 157 `crm_` policies are `TO authenticated`
   (were a mix of `public`). Trigger functions and internal helpers
   (`crm_notify` — it took an arbitrary target user id — and
   `crm_compute_lead_score`) are no longer EXECUTE-able by anon *or*
   authenticated. RLS predicates (`crm_is_member` etc.) keep the authenticated
   grant they need for policy evaluation; `crm_can_register` keeps anon because
   signup runs before there is a session. `search_path` pinned on
   `crm_set_updated_at` and `crm_guard_payment_immutable`.
   Migration `crm_harden_function_grants`.
5. **Per-user group collapse.** `crm_*_groups.is_collapsed` is shared, so one
   agent collapsing a group collapsed it for everyone. New `crm_group_prefs`
   (own-rows RLS) + `withCollapsePrefs()` in `src/lib/group-prefs.ts`, overlaid
   in all nine pages — Group components were untouched, they still read
   `group.is_collapsed`. The nine per-board `setXGroupCollapsed` actions were
   deleted in favour of `setGroupCollapsed(boardKey, groupId, collapsed)` in
   `app/(app)/crm/actions.ts`. Migration `crm_per_user_group_collapse`.
6. **Delete gating.** RLS DELETE is admin-tier, but the row menu enabled Delete
   for any row owner — every agent would have hit a permission error after the
   row already vanished optimistically. `RowToolsConfig.canDelete` now mirrors
   the real tier.
7. **Lint.** Props→state sync moved out of effects into `useServerState()`
   (`src/lib/use-server-state.ts`, the render-time pattern React documents).
   68 → 31 problems. The remaining ones are the `useGSAP` + `contextSafe` ref
   reads (rule false positive — do NOT "fix" them, the collapse animations
   depend on that pattern) plus a few dialog-local prop syncs.

Verified: `tsc` clean, `next build` clean, all 15 routes 200 in dev, Owner
column renders on both boards, collapse preference proven per-user in SQL +
page render, production smoke-tested.

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
- **FINANCIAL LAYER UI COMPLETE (2026-07-22)**: /crm/finance gained the
  Payment plans manager (templates w/ installments: label + % + due rule
  `booking`|`days:N`|`handover`, 100% badge, active toggle; delete =
  Developer/CEO) and an Upcoming installments table (next 10 unpaid by due
  date, overdue red). Deal drawer finance section gained Payment schedule
  (apply a plan to the TX → rows computed from agreed_price + contract/
  completion dates; Mark paid inserts a confirmed crm_payment and links it
  via payment_id; Remove pending) and Commission splits (percentage per
  member, calculated from net, 100% allocation guard, pending/approved/paid).
  Actions: finance/actions.ts (plan CRUD) + extended deals/finance-actions.ts
  (applyPaymentPlan/markInstallmentPaid/clearPendingSchedule/
  addCommissionSplit/setSplitStatus/deleteSplit). DealFinancials now takes a
  `users` prop (drawer passes it). One REAL template exists: "Standard
  10/40/50" (booking/+90d/handover) — it's config, keep it. Full loop
  E2E-verified on Sample Deal then residue cleaned (tx/payments/schedule/
  commission/splits all back to 0).
- **WORKSPACE CURRENCY (2026-07-22, migration `crm_default_currency`)**:
  /admin General has a Currency panel (OMR — Omani Rial | USD — US Dollar).
  Setting lives in `crm_registration_settings.default_currency`; the
  admin-gated security-definer RPC `crm_set_default_currency` also rewrites
  the `currency` column DEFAULT on all 13 money tables, so new rows inherit
  the choice while existing rows keep their stored currency (no conversion).
  Aggregate displays follow the setting (Home KPIs, Sales Dashboard widget
  formatters via a `currency` prop, Finance KPIs); row-level cells always
  render their own row.currency. Currently set to OMR.
- **QUICK FILTERS on ALL 9 BOARDS (2026-07-22)**: the toolbar Filter button
  opens a functional Monday-style panel (`components/crm/quick-filters.tsx`):
  per-column value chips with live counts (colored dots for group/stage),
  OR within a column / AND across columns, Blank matches empty values,
  "Showing X of N" header, Clear all, and a "Filter / N ✕" active chip.
  Panel anchors to the toolbar row (full width — anchoring to the chip
  overflowed the viewport); outside-click close knows about the panel ref.
  Each board declares its own QuickFilterDim list and applies filters at its
  `sortedRows` single point, composing with toolbar Search and Person.
- **EMAIL INFRASTRUCTURE (2026-07-22)**: /crm/emails (sidebar item) = send
  log + composer; Send email buttons in contact/lead drawers; Accounts board
  gained an Email column (migration `crm_emails` also added
  crm_accounts.email/email_label). Edge function `crm-send-email` (deployed):
  JWT + active-membership check, validation, Resend API, From = agent's
  address / Reply-To agent (replies land in Zoho), logs to `crm_emails`
  (team-read RLS, service-role writes only). ⚠️ NOT LIVE until the user:
  (1) creates a Resend account, verifies domain irfaninvest.com (add
  Resend's DKIM + SPF-include DNS records — coexists with Zoho MX/SPF, Zoho
  keeps receiving), (2) we set secrets: `supabase secrets set
  RESEND_API_KEY=...` (optionally EMAIL_FORCE_FROM for pre-verification
  testing). Until then sends return a clear 503 and log status=failed.
  Alternative provider: Zoho's ZeptoMail (same architecture, swap the fetch).
- **NOTIFICATIONS CENTER v2 + DIRECT MESSAGES (2026-07-22, migration
  `crm_notification_levels_messages`)**: bell panel is Monday-style — tabs
  All/Messages/Assigned-to-me, search, Unread-only toggle, Today/Yesterday
  day sections, board chip (derived from link in NotificationsBell
  boardChip()), `level` column (info|notice|critical; reservation expiry/
  cancel + role changes = ⚠ Notice). Agent→agent messages via
  `crm_send_message(p_to, p_text)` RPC (security definer, active-member
  checks, 2000-char cap, delivered as type 'message'); New-message composer
  lives in the panel (lazy member fetch). crm_notify now takes p_level (8th
  arg, default 'info'). Messaging access: shared MessageDialog
  (components/crm/message-dialog.tsx) + a Message button on every Users row
  in Workspace-home Collaborators (all member tiers; self excluded via
  WorkspaceHomeData.currentUserId). A real Persian test message was sent to
  amiralishamsipur@gmail.com and left UNREAD on purpose (user's requested
  test — do not delete it).
- **EMAIL SENDER IDENTITY (2026-07-22)**: `crm_users.sender_email` = work
  address CRM emails are sent AS (edit per member in /admin Directory).
  Edge fn crm-send-email v2 order: FORCE_FROM → sender_email → login email
  if on EMAIL_SENDING_DOMAIN (default irfaninvest.com) → EMAIL_DEFAULT_FROM
  secret → clear error. Reply-To = sender_email ?? login email. Gmail-login
  members (amirali/koroosh) NEED sender_email set before they can send.
- **NAV REORG (2026-07-22)**: Emails / Finance / Team live on the LEFT icon
  rail (IconRail takes `role`; Finance = finance tier, Team = dev/ceo; new
  inline rail glyphs; longest-href-match active state so CRM doesn't stay lit
  on /crm/emails etc.). WorkspaceSidebar is a pure board list again — don't
  re-add role-gated rows there.
- **HOME CUSTOMIZE (2026-07-23, migration `crm_home_layout`)**: Home is
  widget-based (registry HOME_WIDGETS in HomeView: pipeline/meetings/recents
  + real-data metric widgets accounts/contacts). Customize mode = dashed
  frames + ⋮⋮ pointer-drag reorder (data-home-section targets) + ✕ Remove +
  teal Done; '+' opens the Widget Center drawer (cards w/ Added ✓ state).
  Layout persists per user via saveHomeLayout ("use server" file — exports
  must stay async-only; the key allow-list is a private const). Default
  layout ['pipeline','meetings','recents'] when no row exists.
- **EMAIL COMPOSER REDESIGN + SEND-FROM-CELL (2026-07-23)**: composer
  (components/crm/email/EmailComposer.tsx) rebuilt Monday-style — title bar,
  From (avatar + resolved sender), To w/ suggestions + CC toggle, Subject,
  body, footer with association chip + 'Replies go to' + Send; soft GSAP
  open; server errors pulled out of FunctionsHttpError and shown inline.
  Sending now also lives on the BOARDS we already have (NO new tables):
  EmailCell gained optional `onSend` → hover ✉ chip; Leads (clients),
  Accounts (developers — needs the Email column populated) and Contacts each
  hold an EmailComposer + pass onEmail* through their Group. Emails log with
  related_type/name = that lead/account/contact. Sender identity verified
  E2E on Accounts (From = crm_users.sender_email; preview user set to
  crm@irfaninvest.com). ⚠️ still 503 until RESEND_API_KEY set + domain
  verified (see EMAIL INFRA / SENDER IDENTITY notes above — unchanged).
- **NEXT / REMAINING**:
  1. Supabase Site URL change (user, dashboard) — only open localhost risk.
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
