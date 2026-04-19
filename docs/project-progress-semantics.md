# Project progress % (product semantics)

**Headline “% complete”** for a project is a **duration-weighted average** of each phase’s `project_phases.progress`, where phase lengths come from `start_date` / `end_date` (with fallbacks when dates are missing).

For each phase, **`progress` is authoritative when set** (including values maintained by the database from **task completion** when tasks are linked to the phase). Schedule-based % is used only when phase progress is not available.

This is **not** a budget or cost metric. Currency and phase budgets are not part of the product surface.

See implementation: `packages/core-logic/src/utils/projectProgressRollup.js` (`computeWeightedProjectProgressPercent`).
