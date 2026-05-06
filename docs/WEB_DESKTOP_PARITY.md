# Web vs Desktop parity map

**Sources of truth:** Desktop UI + routing live in [`src/App.jsx`](../src/App.jsx), [`src/components/Sidebar.jsx`](../src/components/Sidebar.jsx), and [`src/views/`](../src/views/). Web lives in [`apps/web/src/AppStandalone.jsx`](../apps/web/src/AppStandalone.jsx), [`apps/web/src/config/routes.js`](../apps/web/src/config/routes.js), and [`apps/web/src/layouts/AppShell.jsx`](../apps/web/src/layouts/AppShell.jsx).

**Related:** Prioritized capability gaps are tracked in [web-standalone-capability-matrix.md](./web-standalone-capability-matrix.md).

## Route / screen parity

| Area | Desktop (`src`) | Web (`apps/web`) | Parity notes |
| --- | --- | --- | --- |
| Login | `LoginForm` via `App.jsx` unauthenticated branch | `/login` → `LoginView` | Aligned |
| Invite accept | `/invite/:token` → `InviteAcceptPage` | Same route | Aligned |
| Dashboard | `activeView === 'Dashboard'` → `DashboardView` | `/` → `DashboardView` | Aligned |
| Projects list | `Projects` without selection → `DashboardView` | `/projects` → `DashboardView` | Aligned |
| Project workspace | `ProjectDetailsView` (tasks / gantt / issues / activity via internal state) | `/projects/:id/tasks|gantt|field-issues|activity` → `ProjectWorkspaceView` | Aligned (web is URL-first) |
| Calendar | `CalendarView` | `/calendar` | Aligned |
| Team / messaging hub | `TeamHubView` for `Messages` / `Team` / `Contacts` | `/team`, `/team/directory` | Aligned |
| Organization | `TeamView` | `/organization` | Aligned |
| Settings | `SettingsView` | `/settings`, `/settings/notifications` | Aligned |
| Legacy `/messages` | N/A (sidebar “Team”) | Redirect → `/team` | Web-only compat |
| No org / guest | `NoOrganizationView` | Same | Aligned |

## Shell / global UX parity

| Behavior | Desktop | Web | Status |
| --- | --- | --- | --- |
| Founding Org Admin setup wizard | `SetupWizardModal` in `App.jsx` | `SetupWizardModal` in `WorkspaceLayout` (`AppStandalone.jsx`) | **Implemented** (was missing on web) |
| OAuth PKCE (`?code=`) | Yes | Yes | Aligned |
| OAuth implicit / hash tokens (`#access_token=`) | Yes (`App.jsx`) | Yes (`AppStandalone.jsx`) | **Implemented** (web previously PKCE-only) |
| OAuth error query | Logged | Logged + early return | **Implemented** |
| Force password reset | `ForcePasswordReset` | Same | Aligned |
| Org block: guest collaborator | Sidebar shows guest copy + project count | `AppShell` org area | **Implemented** |
| Sign out resilience | Clears state if session missing / errors | Matches desktop-style handling + toast | **Implemented** |
| In-app update banner | `UpdateNotification` (Electron) | N/A (browser) | Intentionally not applicable |

## Shared logic

Both clients should prefer [`packages/core-logic`](../packages/core-logic/) for domain services to avoid behavioral drift.

## Prioritized follow-ups (from capability matrix)

High impact items that are **not** fully covered by route parity alone:

1. Notification center UX (shell-level) — see [web-standalone-capability-matrix.md](./web-standalone-capability-matrix.md).
2. Heavy-project performance / caching on web.
3. Messaging / realtime polish.

Use this document for regression scope: same org and role on desktop vs web should see the same **routes, wizard gating, OAuth completion, and collaborator shell messaging**.
