# Web + mobile validation checklist

Use after changes that touch **web–desktop parity** or **mobile-first flows**.

## Web (near-desktop parity)

- [ ] **Login** — email/password and OAuth providers used in prod complete session; user lands on `/`.
- [ ] **OAuth PKCE** — redirect with `?code=` exchanges and clears query string.
- [ ] **OAuth hash** — redirect with `#access_token=` (if configured) establishes session and clears hash.
- [ ] **Invite** — `/invite/:token` accepts invite and joins org as expected.
- [ ] **Setup wizard** — founding Org Admin with `setup_wizard_completed_at` null sees wizard once; completing refreshes org and dismisses wizard.
- [ ] **Guest collaborator** — user with no `currentOrganization` but collaborator projects sees guest copy in sidebar org block and can open assigned projects.
- [ ] **Project deep links** — `/projects/:id/tasks`, `/gantt`, `/field-issues`, `/activity` load correct tab.
- [ ] **Sign out** — session cleared; redirect to `/login`; no stale workspace data without refresh.
- [ ] **Force password reset** — `must_change_password` blocks workspace until completed.

## Mobile (mobile-first)

- [ ] **Home** — KPIs, My Day, projects load only for `activeOrganization`; **Quick access** navigates to Projects / Messages / Calendar.
- [ ] **Field issue FAB** — project picker lists only current org projects; submit succeeds.
- [ ] **Projects tab** — list filtered by org; pull-to-refresh / focus refresh works.
- [ ] **Auth** — login and invite flows still work after shared util changes.

## Commands (from repo root)

Run whatever CI uses for this monorepo, for example:

- `npm run lint` (if defined)
- `npm test` (if defined)
- App-scoped: `npm run lint --workspace apps/web` / `apps/mobile` when available
