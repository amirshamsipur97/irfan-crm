# Irfan CRM — Session Handoff

> Read this + the auto-memory `irfan-crm` entry first. This file is the single
> source of truth for continuing the build in a new session.
> Updated: **2026-08-02** (committed through `7cbe4ce`, deployed;
> repo is LOCAL-ONLY, no remote).

## START HERE — state as of 2026-08-01

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

**Small things the user was asked about and never answered** — do not action
without asking again: three leftover custom columns on Leads (a Dropdown from
07-21, plus a Status and a Dropdown from 07-26 testing), two empty groups on
Leads, and the stray account `a.shasmipur@irfaninvest.com` (a typo of
`a.shamsipour@`, auto-approved as an agent because the domain is allow-listed).

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
