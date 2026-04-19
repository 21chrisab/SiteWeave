# Web Standalone Capability Matrix

This matrix ranks desktop-to-web parity work by user impact and usage frequency.

## Scoring
- **Impact**: 1 (low) to 5 (critical to daily operations)
- **Frequency**: 1 (rare) to 5 (daily)
- **Priority score**: `impact x frequency`

## Capability Matrix

| Capability | Desktop status | Web status | Impact | Frequency | Priority score | Redesign action |
| --- | --- | --- | --- | --- | --- | --- |
| Project workspace hub | Mature | Partial | 5 | 5 | 25 | Build modular project hub tabs and route model |
| Task lifecycle (CRUD, complete, sorting) | Mature | Partial | 5 | 5 | 25 | Unify interactions and improve contextual controls |
| Gantt + dependencies | Mature | Basic/partial | 5 | 4 | 20 | Route-level Gantt tab with dependency affordances |
| Field issue tracking | Mature | Partial | 4 | 4 | 16 | Promote as first-class project workspace tab |
| Notification center | Available in backend + desktop UX | Fragmented in web | 5 | 4 | 20 | Add shell-level bell + center + deep-link actions |
| Messaging collaboration | Mature | Basic | 4 | 4 | 16 | Improve channel switching and realtime stability |
| Dashboard attention management | Mature | Limited | 4 | 4 | 16 | Clarify dashboard purpose as action/alerts center |
| Deep links and browser navigation | Mature | Inconsistent | 5 | 3 | 15 | Route-first architecture and redirect compatibility |
| Reporting and export | Mature | Partial | 4 | 3 | 12 | Keep route slot and migration hooks |
| Performance on large projects | Mature | Re-fetch heavy | 5 | 4 | 20 | Introduce cache layer and staged query strategy |

## Must-Have Parity Tier (Phase 1-3)
- Project workspace tabs and deep links
- Task + Gantt + field issues productivity flows
- Notification center with deterministic navigation
- Messaging UX parity for daily collaboration
- Data/cache/perf hardening on heavy views

## Nice-to-Have Parity Tier (Phase 4+)
- Additional reporting polish and advanced visualizations
- Extended workflow automation UX
- Deep personalization controls for dashboards
