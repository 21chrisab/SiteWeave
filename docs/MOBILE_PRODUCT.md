# Mobile product principles (mobile-first, not desktop parity)

The mobile app ([`apps/mobile`](../apps/mobile)) targets **on-site and in-motion** usage. It is **not** a shrunken desktop client.

## Jobs-to-be-done (primary)

1. **Execute work quickly** — see today’s tasks, complete or update status, add photos/evidence where supported.
2. **Surface blockers** — overdue items, field issues, and “my day” priorities without navigating deep admin trees.
3. **Stay reachable** — lightweight messaging triage and replies.
4. **Calendar awareness** — today’s events alongside tasks.

## Explicitly out of scope (by default)

- Full org administration, role editing, and directory management at desktop depth.
- Full Gantt / dependency editing and other dense planning surfaces (unless a future phase proves high ROI on small screens).
- Desktop-grade reporting builder and PDF flows (consume summaries and links instead).

## Information architecture

| Tab | Role |
| --- | --- |
| **Home** | Dashboard: weather (if enabled), KPIs, My Day, project list, **Quick access** shortcuts, FAB for field issue reporting. |
| **Projects** | Project list and per-project execution surfaces. |
| **Messages** | Channel triage and conversation. |
| **Calendar** | Day-relevant events. |
| **Issues** (`href: null`) | Deep link / auxiliary route for issue flows without cluttering the tab bar. |

## Success metrics (product)

- Time to complete a common task update (tap count / time on task).
- % of field issues filed from mobile vs web/desktop (where applicable).
- Session length appropriate to “glance and act” (not desktop session length).

## Data consistency

- All org-scoped lists should filter with a single helper — see [`apps/mobile/utils/orgScope.js`](../apps/mobile/utils/orgScope.js) (`filterByOrganizationId`, `matchesOrganization`).

## Related

- Web/desktop parity: [WEB_DESKTOP_PARITY.md](./WEB_DESKTOP_PARITY.md)
- Validation checklist: [WEB_MOBILE_VALIDATION.md](./WEB_MOBILE_VALIDATION.md)
