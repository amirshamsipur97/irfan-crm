# Security review — 2026-09-23

A pass over the live CRM: the app's own gate, the repository, and the database
it shares with the website. What was fixed is fixed in this commit. What is
left needs the owner's decision, because each one can break something live.

The CRM holds a real client book: 357 leads, 248 contacts and the team's own
accounts. Everything below is written with that in mind.

---

## Fixed in this commit

### 1. A signed-out visitor could reach any route whose name merely began with a public one

`src/proxy.ts` decided "is this page public?" with
`PUBLIC_PATHS.some(p => pathname.startsWith(p))`. That is a prefix test, not a
path test: **`/preview-anything`, `/loginx`, `/signup-2` all skipped the session
check.** Nothing like that is deployed today, but this repo's own testing recipe
creates throwaway `/preview-*` pages, and one left behind would have been a
public page inside an authenticated CRM.

Now matched by segment: a path is public only when it IS `/login`, `/signup`,
`/preview` or `/auth`, or sits under one of them (`/auth/callback`). A throwaway
test page must live at `/preview/<name>` to be reachable without a login, which
cannot be typed by accident.

### 2. No security headers at all

Every response now carries:

| Header | Why |
|---|---|
| `Content-Security-Policy: frame-ancestors 'self'` + `X-Frame-Options` | The CRM could be framed by any page. A click-jacked "Delete group" is one invisible iframe away. |
| `X-Content-Type-Options: nosniff` | Stops a browser guessing a content type it was not given. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Full CRM URLs (which carry row ids) stop leaking to third-party sites. |
| `Strict-Transport-Security` | Keeps the session cookie off plain http, including subdomains. |
| `Permissions-Policy` | Camera, microphone and location are refused outright. |
| `X-Robots-Tag: noindex, nofollow` | The CRM should never appear in a search engine. |

### 3. Real client rows were committed to the repository

`backups/*.json` held live exports, including `crm-data-backup-2026-08-03.json`
(leads, contacts, deals) and 125 contacts with their negotiation notes. The
repository is private, but a private repository is an access list, not a vault.
The files stay on the machine that took them and are now ignored by git.

⚠️ They remain in the git HISTORY. Rewriting history on a repo this size is its
own risk; the honest mitigation is that the repository stays private and its
access list stays short.

---

## Checked and found clean

- **No secret has ever been committed.** Searched the working tree and the whole
  history for the service-role key, JWT prefixes and the preview password: zero
  hits. `.env*` is ignored and no env file is tracked.
- **Production carries only three environment variables** (site URL, Supabase
  URL, anon key). `DEMO_LOGIN` is not among them, so `/preview` answers 404 in
  production and the demo auto-login cannot be reached there.
- **The CRM's own tables all have row-level security enabled with policies.**
  The per-role matrix in `src/lib/permissions.ts` mirrors them.
- **The admin lead report refuses below full access on the server**, not only in
  the UI (`getLeadJourneyData`).

---

## Left for the owner to decide

Each of these touches something live. None was changed.

### A. 🚨 Eight tables in the same database have row-level security OFF

`leads`, `ai_conversations`, `call_attempts`, `analytics_ga4`,
`analytics_ga4_campaign`, `analytics_ga4_realtime`, `analytics_ga4_snapshot`,
`analytics_insights`.

These belong to the **website and the call system**, not to the CRM, but they
sit in the same Supabase project, and `public.leads` holds real enquiries with
names and phone numbers. With RLS off, anyone holding the anon key — which ships
inside the public website bundle and can be read by anyone — can read those
tables through the REST API.

This is the single biggest exposure in the whole system, and it is the
launch-blocker the handoff has carried since July. Turning RLS on will break
whatever reads those tables with the anon key (the website forms, the edge
functions, the dashboards) unless a policy is written for each first. It needs a
planned session: write the policies, prove each reader still works, then enable.

### B. Two sign-in functions are callable by anyone, unauthenticated

`login_user(email, password)` and `signup_user(...)` are `SECURITY DEFINER` and
executable by the `anon` role through `/rest/v1/rpc/`. They belong to another
product in this database, not the CRM (the CRM uses Supabase Auth), but they are
an open credential-checking endpoint with no rate limit in front of them.

### C. Leaked-password protection is off

Supabase can refuse passwords found in public breaches (HaveIBeenPwned). One
toggle: Dashboard → Authentication → Policies. Worth turning on for a team of 15
who chose their own passwords. While there: consider raising the minimum
password length and requiring MFA for the CEO and developer accounts.

### D. One view and three functions with loose settings

`campaign_unified` is a `SECURITY DEFINER` view (it runs with its creator's
rights, not the caller's), and `normalize_campaign_name`, `search_ai_knowledge`
and `set_updated_at` have a mutable `search_path`. All four belong to the
website side. Low severity, easy to fix in the same session as A.

### E. Nine tables have RLS on but no policy at all

`app_users`, `chat_conversations`, `chat_messages`, `leads_backup_20260506`,
`lqd_editors`, `workspace_*`. "No policy" means nobody can read them through the
API, so they are safe by accident rather than by design. They look like leftovers
from earlier products; deleting what is dead is better than leaving it.

---

## How to re-run this

```
# the database side, any time
Supabase → Advisors → Security
```

The app side is in this file's fixes; the checks that matter (`npx tsc
--noEmit`, `npx next build`, `npx eslint src`) are the same ones the handoff
already describes.
