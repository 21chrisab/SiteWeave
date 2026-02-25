# EXPLAIN ANALYZE for Performance Tuning

Run these in the Supabase SQL Editor (or with RLS context) to find bottlenecks. Enable plan capture first:

```sql
-- One-time: allow PostgREST to return plan (do not use in production long-term)
ALTER ROLE authenticator SET pgrst.db_plan_enabled TO true;
NOTIFY pgrst, 'reload config';
```

## 1. Tasks by project (hot path)

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM tasks
WHERE project_id = '<replace-with-real-project-uuid>'
ORDER BY due_date ASC NULLS LAST, id ASC
LIMIT 100;
```

Look for: **Seq Scan** on `tasks` or `projects` (from RLS). If you see Nested Loop or SubPlan over `projects`, ensure `get_accessible_project_ids()` is used in RLS and that `idx_tasks_project_id` exists.

## 2. Projects list (initial load)

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM projects
ORDER BY updated_at DESC
LIMIT 50;
```

Check for sequential scans on `projects` or on `project_contacts` / `project_collaborators` inside RLS.

## 3. From the client (with JWT)

Use the Supabase client to get plans as the authenticated user:

```js
const { data } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId)
  .limit(10)
  .explain({ analyze: true, format: 'text' });
console.log(data);
```

## Indexes used by RLS

- `idx_projects_organization_id`, `idx_projects_project_manager_id`, `idx_projects_created_by`
- `idx_project_contacts_org_contact`, `idx_project_contacts_project_id`, `idx_project_contacts_contact_id`
- `idx_project_collaborators_user_id`, `idx_project_collaborators_project_id`
- `idx_tasks_project_id`

If EXPLAIN shows high "Rows Removed by Filter" or "Buffers" on these tables, the Security Definer function `get_accessible_project_ids()` and the above indexes should reduce RLS cost.
