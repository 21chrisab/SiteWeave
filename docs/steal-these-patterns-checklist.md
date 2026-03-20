# Steal These Patterns Checklist (SiteWeave)

Goal: adopt industry-standard patterns borrowed from `NocoDB`, `Mattermost`, `AppFlowy`, and `ERPNext/Frappe` that strengthen SiteWeave’s authorization correctness, realtime robustness, and operational safety.

How to use this doc:
- Treat each unchecked item as a “gap hypothesis”.
- Prefer patterns that reduce permission bugs and make failure modes predictable.

---

## Authorization correctness (multi-tenant + multi-resource)

- [ ] Ensure every side-effect write includes an explicit tenant boundary column (e.g., `organization_id`) and that the tenant boundary is derived deterministically from already-authorized reads.
  - SiteWeave evidence: `packages/core-logic/src/services/messagesService.js` (`markMessageAsRead`) upserts `message_reads` / `channel_reads` with `organization_id`.
- [ ] Audit any “array of IDs” operations (reads, updates, deletes) to ensure semantics are “all-or-nothing” where required (Mattermost’s `SessionHasPermissionToChannels` pattern).
- [ ] Add negative tests for cross-tenant access attempts (must fail under RLS).
  - SiteWeave evidence: reliance on RLS is documented throughout service layer comments (`projectsService.js`, `tasksService.js`, etc.).
- [ ] Avoid “optimistic UI writes” for security-sensitive objects; only mutate local state after you know the write succeeded (or rely strictly on RLS + realtime reconciliation).
  - SiteWeave evidence: message send path explicitly notes realtime subscription handles UI updates.

---

## Permission configuration validation (prevent “ACL drift”)

- [ ] Validate role/permission configuration invariants at deploy time (duplicates, scope mismatch, include/exclude conflicts).
  - Upstream analogy: NocoDB’s `permissionScopes` + validations in `acl.ts`.
  - SiteWeave evidence: `apps/web/scripts/validate-schema.sql` checks table existence, `organization_id` columns, and that RLS is enabled.
- [ ] Treat “permissions JSONB” as structured configuration and add at least one invariant check that rejects malformed structures early.
  - SiteWeave evidence: validation script asserts `roles.permissions` JSONB exists (see `validate-schema.sql`).
- [ ] Enforce a single precedence model for roles (for example: base-level overrides workspace-level overrides org-level).
  - Upstream analogy: NocoDB’s explicit scope hierarchy and inherited include/exclude behavior.

---

## Cache and invalidation strategy (permission or membership changes)

- [ ] If you cache permission/UI gating results client-side, invalidate them on:
  - invitation acceptance
  - membership changes (`profiles` changes per tenant)
  - role updates
  - tenant switch
  - Upstream analogy: ERPNext clears cached user permissions and publishes realtime invalidation events on update/trash.
- [ ] Prefer realtime-driven refresh for permission-relevant UI, but keep a deterministic manual refresh fallback.
  - SiteWeave evidence: `src/context/AppContext.jsx` refreshes contacts when `profiles` changes for the active organization.

---

## Realtime transport hygiene (protocol-level lessons)

- [ ] Define reconnection semantics and reconciliation strategy:
  - what the client does after reconnect
  - how it avoids gaps/duplicates
  - whether it re-fetches a window based on the last known message/event
  - Upstream analogy: AppFlowy’s websocket v2 uses `lastMessageId` for resumable sessions.
- [ ] Centralize subscription error handling:
  - treat “realtime not enabled for this table” as expected
  - treat auth failures / permission failures as non-recoverable (or recoverable with explicit refresh/sign-out)
  - SiteWeave evidence: `src/context/AppContext.jsx` silently handles subscription status and cleans up channels.
- [ ] Use “fetch-on-change” when realtime payload lacks related data required by the UI.
  - SiteWeave evidence: contacts and tasks subscriptions re-fetch rows with relationships.
- [ ] In the messaging UI, avoid double-inserting the same message:
  - SiteWeave evidence: `src/views/MessagesView.jsx` does not add messages to state after send, relying on realtime to populate.

---

## Testing strategy (authz + realtime)

- [ ] Add unit tests for permission checks that encode multi-resource semantics:
  - all-or-nothing for arrays
  - archived/missing resource edge cases
  - error injection (mocked store failures) should not panic and should fail closed
  - Upstream analogy: Mattermost’s `authorization_test.go` suite.
- [ ] Add integration tests that assert RLS behavior for at least:
  - read project/task rows for each role type
  - attempt cross-organization reads/writes are denied
  - message read receipts are only writable within the same tenant boundary
- [ ] Add a realtime test harness (or manual test plan) for reconnection:
  - ensure UI converges after offline/online transitions
  - ensure unread counts and ordering remain correct
  - SiteWeave evidence: manual and debug resources exist (`README_TESTING.md`, `CONSOLE_COMMANDS.md`), but automated realtime authz tests are the bigger gap.

---

## Evidence touchpoints in SiteWeave (where to look)

- `apps/web/scripts/validate-schema.sql`
- `packages/core-logic/src/services/projectsService.js`
- `packages/core-logic/src/services/tasksService.js`
- `packages/core-logic/src/services/messagesService.js`
- `src/context/AppContext.jsx`
- `src/views/MessagesView.jsx`

