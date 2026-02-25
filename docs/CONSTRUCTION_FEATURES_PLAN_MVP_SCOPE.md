# Construction Features Plan – MVP Scope (Scheduling + Templates Only)

This document summarizes the **reduced-scope** delivery plan. The full plan file may still contain leftover sections; this is the authoritative MVP scope.

---

## Strict Scope Constraints (Product & Privacy Safety)

- **No financial features:** Do not store contract amounts, progress payments, retainage, billing periods, or payment statuses. Progress Billing and Subcontractor Payments are **completely removed**.
- **No time tracking:** Do not add labor hours, timesheets, or billable time. Time Tracking is **removed** to avoid scope creep into payroll/labor.
- **No cost or budgeting in quantity:** If quantity tracking is ever added later, it must be **field productivity only** (physical units: CY, SF, LF). No `unit_cost`, no budget vs actual by money. Quantity tracking is **not in this MVP**.
- **MVP scope:** The only features in this delivery plan are **Task Dependencies / Gantt** and **Project Templates (JSONB)**.

---

## MVP 1: Task Dependencies & Schedule (Gantt-Ready)

**Schema:**

- **task_dependencies** – `id`, `task_id` (predecessor), `successor_task_id`, `dependency_type` ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'), `lag_days` (optional), `created_at`. Unique (task_id, successor_task_id); check task_id != successor_task_id.
- **tasks** – Add: `start_date DATE`, `duration_days` (optional), `is_milestone` (boolean). Do **not** add estimated_hours or any labor/cost fields.

**Implementation:** Gantt tab on Project Details; critical path (client-side CPM); milestones as zero-duration tasks. See main plan Section 4 for deep dive.

---

## MVP 2: Project Templates (JSONB)

**Schema:** `project_templates` – `id`, `organization_id`, `name`, `description`, `created_by_user_id`, `created_at`, **`structure JSONB`**.  
`structure` = `{ "phases": [...], "tasks": [...], "dependencies": [...] }`. No financial or payment data.

**Implementation:** "Save as template"; "Create from template" with name/address/start date; improve duplicate dialog (address, project number, copy dependencies). See main plan Section 5.

---

## Schema (MVP Only)

- **New tables:** `task_dependencies`, `project_templates` only.
- **Tasks:** Add `start_date`, `duration_days` (optional), `is_milestone` only.
- **Out of scope:** progress_billing_*, project_subcontracts, time_entries, quantity_line_items (with cost).

---

## Implementation Order

1. Tasks: add `start_date`, optional `duration_days`, `is_milestone`; migrate existing tasks.
2. **task_dependencies** table; duplication service copies and remaps on duplicate.
3. Gantt tab in Project Details; integrate Gantt library; milestones as zero-duration.
4. Critical path (client-side CPM); "Show critical path" in Gantt.
5. **project_templates** (JSONB); "Save as template" / "Create from template"; improve duplicate dialog (address, project number, copy dependencies).

**Tooling:** Use MCP servers for Supabase and Context7 for schema work and codebase-aware changes.

---

## Manual Cleanup in Main Plan File

If the main plan file (`.cursor/plans/construction_features_report_c2dccf2d.plan.md`) still contains:

1. **Old table in Section 2** – Delete the "| Feature | Value | Complexity | Ratio |" table (lines 35–45).
2. **Feature 3 / Feature 5 remnants** – Delete any remaining Subcontractor or Time Tracking sections; replace with "### MVP 2: Project Templates (JSONB)" and the short pointer to Section 5 (as in this doc).
3. **Baselines paragraph in Section 4** – Delete the "**Removed:** Baselines" block and the schema/behavior under it (Section 4.5 Critical Path should follow directly after the Gantt feature table).
4. **5.1 duplicate flow** – Remove the stray fragment " \"Set baseline\" after first edit." from the Copy dependencies bullet if present.

After cleanup, the plan and this MVP scope doc are aligned for safe implementation of scheduling and template features only.
