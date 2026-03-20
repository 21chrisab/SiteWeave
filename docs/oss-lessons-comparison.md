# OSS Lessons Comparison (Good Artists Steal)

This doc compares `NocoDB`, `Mattermost`, `AppFlowy`, and `ERPNext/Frappe` and distills “good artists steal” patterns we can apply to SiteWeave.

Focus areas:
- Authorization correctness (RBAC/ACL, multi-tenant boundaries, and permission checks that cannot be bypassed by edge cases)
- Realtime / collaboration transport semantics (resumption, batching, offline-friendly persistence patterns)
- Operational professionalism (validation, caching/invalidation, and test coverage for permission logic)

SiteWeave context (what we compared against):
- Supabase-first multi-tenant model with RLS enforcement and Supabase Realtime subscriptions.
- Shared business logic in `packages/core-logic`.
- UI state + realtime state reconciliation in `src/context` and view components.

---

## NocoDB: DB-driven ACL + backend middleware gating

### What they do best
NocoDB centralizes permission reasoning with a permission-scope matrix and explicit include/exclude inheritance. It then enforces permissions consistently at request time using backend middleware that reads permission metadata from route decorators.

Key pattern: permission logic is defined once (matrix + scope/role inheritance), validated for internal consistency (no duplicates/mismatched scopes), and then applied uniformly by middleware.

### Evidence (upstream code)
- Permission scopes matrix and validations in `[nocodb/src/utils/acl.ts](https://raw.githubusercontent.com/nocodb/nocodb/develop/packages/nocodb/src/utils/acl.ts)`
- Context scoping and request-time ACL enforcement in `[nocodb/src/middlewares/extract-ids/extract-ids.middleware.ts](https://raw.githubusercontent.com/nocodb/nocodb/develop/packages/nocodb/src/middlewares/extract-ids/extract-ids.middleware.ts)`
- Meta/enum tables show collab/chat-related tables (relevance to realtime-ish features) in `[nocodb/src/utils/globals.ts](https://raw.githubusercontent.com/nocodb/nocodb/develop/packages/nocodb/src/utils/globals.ts)`
- User service role assignment / login pipeline in `nocodb/src/services/users/users.service.ts` (used here as evidence that role-aware behavior is wired into backend flows; the critical authz enforcement is in `acl.ts` + ACL middleware).

### Why this is industry-standard
- Permission rules are not “scattered booleans”; they are a composable matrix with inheritance rules.
- Internal validation catches configuration mistakes early (e.g., duplicate permissions, role permissions assigned to the wrong scope, include/exclude conflicts).
- Enforcement is centralized in middleware so the app fails closed when permission metadata is missing or incorrect.

### How to apply to SiteWeave
SiteWeave does not have a NestJS-style permission middleware layer. But the pattern still maps well to your current approach:
- Keep authorization rules in the database (RLS + helper functions), but validate the schema and invariants with “ACL-matrix-like” checks at deploy time.
- Treat “role permission matrices” (your `roles.permissions` JSONB) as first-class configuration: validate that it is internally consistent and that scope/precedence rules are unambiguous.
- Where you derive side-effect scopes in the client (for example, `organization_id` resolution before writing read receipts), you should make that derivation deterministic and hard to spoof by depending on RLS and by ensuring the write includes the correct tenant boundary.

Evidence in SiteWeave that already matches this pattern:
- `apps/web/scripts/validate-schema.sql` checks required tables, `organization_id` presence, and that RLS is enabled on required tables.
  - `fetchActiveProjectsCount` and other project/task queries explicitly state “uses RLS policies”.
- Messaging writes include `organization_id` resolution before upsert (see `markMessageAsRead` in `packages/core-logic/src/services/messagesService.js`).

---

## Mattermost: Permission correctness for lists + “fail-safe” tests

### What they do best
Mattermost’s permission checks are written so that multi-resource authorization is correct by construction. In particular, the `SessionHasPermissionToTeams` and `SessionHasPermissionToChannels` logic is “all-or-nothing”:
- if the session is unrestricted / system-admin, it short-circuits
- otherwise it checks every referenced team/channel and fails if any item is not permitted

Key pattern: authorization functions explicitly encode the semantics of multi-ID checks, rather than relying on ambiguous SQL behavior or partial matches.

### Evidence (upstream code)
- Channel-level all-or-nothing permission checks in:
  - `[server/channels/app/authorization.go](https://github.com/mattermost/mattermost/blob/master/server/channels/app/authorization.go)`
  - Includes `SessionHasPermissionToTeams` and `SessionHasPermissionToChannels` definitions.
- Regression + behavior coverage in:
  - `[server/channels/app/authorization_test.go](https://github.com/mattermost/mattermost/blob/master/server/channels/app/authorization_test.go)`
  - The test suite covers basic access, removal from channel, archived channel access, mixed archived/non-archived, system-admin access, and “does not panic if fetching channel causes an error”.

Key snippet semantics (summarized from upstream):
- `SessionHasPermissionToChannels` returns `true` only if the user has the permission for every channel ID passed in.
- It validates that channels exist (otherwise returns false), avoiding “phantom success” when IDs are invalid.
- It checks member roles per channel and returns false on the first channel that fails.

### Why this is industry-standard
- Permission semantics are explicitly tested, including edge cases:
  - archived resources
  - mixed resource sets
  - error injection (mocked store failures)
- This prevents classic permission bugs where “array authorization” accidentally behaves like “any-of authorization”.

### How to apply to SiteWeave
SiteWeave’s authz should be “all-or-nothing” anywhere you:
- accept arrays of resource IDs (channels/projects/tasks/files/etc.)
- compute side effects across multiple resources
- assume that “if I can read one id, I can safely write the whole batch”

Because you rely on Supabase RLS, many queries are already safe. But you still need correctness for:
- multi-resource read/write loops (ensure each resource is fetched/written in a tenant-safe way)
- derived-tenant writes (ensure `organization_id` and other tenant boundary columns cannot be derived incorrectly)

Evidence in SiteWeave relevant to this:
- `packages/core-logic/src/services/projectsService.js` and `tasksService.js` explicitly rely on RLS for filtering.
- `packages/core-logic/src/services/messagesService.js` derives `organization_id` before writing `message_reads` / `channel_reads`.
- `fetchUnreadCounts` loops per `channelId`, which is closer to Mattermost’s “check each resource” semantics than doing one bulk query with ambiguous behavior.

---

## AppFlowy: Collaboration transport with resumption + typed event boundaries

### What they do best
AppFlowy separates realtime transport concerns from collaborative data semantics:
- It uses versioned WebSocket endpoints with explicit JWT auth requirements.
- It supports message resumption (`lastMessageId`) so reconnects do not lose state.
- It encodes messages with a protocol (`RealtimeMessage`) and handles batching, heartbeat, and system messages (rate limit / kick off / duplicate connection).

In parallel, AppFlowy’s collaboration engine uses CRDT-first persistence and plugin-based storage, enabling offline-first eventual consistency.

### Evidence (upstream code / deepwiki anchors)
- Realtime WebSocket API (versioning, JWT auth, scoped workspace endpoint, resumption, message framing/binary protocol):
  - DeepWiki: `[WebSocket API](https://deepwiki.com/AppFlowy-IO/AppFlowy-Cloud/3.4-websocket-api)`
- Persistence and offline-first multi-tier storage model:
  - DeepWiki: `[Data Flow and Persistence Strategy](https://deepwiki.com/AppFlowy-IO/AppFlowy/2.3-data-flow-and-persistence-strategy)`
  - The doc describes SQLite for metadata/chat messages, CollabKVDB for CRDT content (RocksDB on desktop, IndexedDB on web), and plugin-based persistence.
- Frontend/backend communication architecture (event-driven dispatch + async notifications, typed handlers, request/response separation):
  - DeepWiki: `[Frontend-Backend Communication](https://deepwiki.com/AppFlowy-IO/AppFlowy/2.2-frontend-backend-communication)`

### Why this is industry-standard
- Realtime is not treated as “just open a socket”:
  - reconnect semantics are specified
  - message framing is explicit
  - batching + rate limiting is built into the transport layer
- The system is designed for offline-first and eventual consistency:
  - local-first persistence
  - CRDT semantics
  - plugin-based sync/storage backends

### How to apply to SiteWeave
SiteWeave uses Supabase Realtime subscriptions. Your code already has some “transport hygiene”:
- subscriptions fail silently when realtime is disabled (expected behavior)
- you selectively re-fetch related entities when inserts/updates occur (e.g., contacts)

The AppFlowy lesson to steal is to explicitly define:
- what happens after reconnect
- how the UI avoids gaps or duplicate state
- how you resume from the last known message / event

Evidence in SiteWeave:
- `src/context/AppContext.jsx` notes subscriptions fail silently when realtime is disabled, and it cleans up by removing channels.
- `packages/core-logic/src/services/messagesService.js` returns raw message rows so the realtime subscription enriches the UI consistently.
- `src/views/MessagesView.jsx` avoids double-inserting messages into state (“realtime subscription will handle it”).

---

## ERPNext/Frappe: Permission caching + realtime invalidation on change

### What they do best
ERPNext’s `UserPermission` implements document-level access control and also treats permission evaluation as cacheable data:
- it validates permission records for correctness (no duplicates, no default overlap)
- it caches computed user permission dictionaries
- it clears the cache and broadcasts realtime updates on permission changes

Key pattern: “permission changes are operational events”, not just DB writes.

### Evidence (upstream code)
- Core permission record model:
  - `[frappe/core/doctype/user_permission/user_permission.py](https://raw.githubusercontent.com/frappe/frappe/develop/frappe/core/doctype/user_permission/user_permission.py)`
  - Includes:
    - `validate_user_permission` duplicate checks
    - `validate_default_permission` default overlap prevention
    - `on_update` and `on_trash` cache clearing and `frappe.publish_realtime(...)` for `update_user_permissions`
    - `get_user_permissions` cached lookup for UI/server usage

### Why this is industry-standard
- Prevents permission-table mistakes by validating invariants.
- Avoids recomputing permission lists on every request via caching.
- Ensures correctness by invalidating cache on every permission mutation and notifying clients.

### How to apply to SiteWeave
If SiteWeave ever caches permission evaluation client-side (for example, role permissions for gating UI buttons), steal ERPNext’s invariants:
- validate role/permission configuration for duplicates and overlaps (deploy-time + optionally admin UI validation)
- invalidate cached permission results when:
  - invitations are accepted / memberships change
  - roles are updated
  - tenant membership changes
- use realtime events or a deterministic refresh flow so the UI converges quickly and safely.

Evidence in SiteWeave that is close to this pattern:
- `src/context/AppContext.jsx` subscribes to `profiles` and refreshes contacts for the active organization when org membership changes.
- `markMessageAsRead` uses tenant boundary (`organization_id`) derived from message/channel/project/profile, which is conceptually similar to “compute-permission scope once, then write consistently”.

---

## Cross-Project Synthesis (What to Copy)

1. Define permission semantics in one place (matrix + inheritance), not scattered checks.
2. Validate permission configuration aggressively (duplicates, scope mismatches, include/exclude conflicts).
3. Encode multi-resource authorization semantics explicitly (“all-or-nothing” vs “any-of”), and test them like Mattermost does.
4. Treat permission changes as operational events: cache invalidation + realtime notification on mutation (ERPNext).
5. Realtime is a protocol problem, not a UI problem:
   - specify reconnect behavior
   - support resumption and avoid gaps/duplication
   - batch and rate-limit at the transport layer (AppFlowy).
6. Prefer deterministic tenant boundary handling:
   - always write tenant boundary columns in side-effect tables
   - avoid deriving tenant identifiers differently per code path

## SiteWeave mapping (practical touchpoints)

Authorization / tenant boundaries
- Keep relying on Supabase RLS, but add “permission-matrix-like” validation at schema deploy time (you already have `validate-schema.sql` doing RLS + `organization_id` checks).
- Where you derive `organization_id` in client code (message reads), consider enforcing the same derivation strategy everywhere you write tenant-bound side effects.

Permission correctness in list operations
- Audit client flows that pass arrays of IDs (channel lists, project lists, unread count computations, bulk updates) and ensure each resource is individually tenant-validated by design (Mattermost’s all-or-nothing semantics).

Realtime + reconnect safety
- Your subscription code already handles “realtime may not be enabled” by failing silently and cleaning up channels.
- The missing piece to steal from AppFlowy is an explicit “resume / reconcile” strategy: what the client does after reconnect to avoid missed updates.

Caching and invalidation
- If you cache permissions/UI gating based on role JSONB, implement invalidation on:
  - organization membership changes (you already refresh contacts on `profiles` changes)
  - role updates
  - invitation acceptance.

---

## Appendix: SiteWeave code evidence used
- `apps/web/scripts/validate-schema.sql`
- `packages/core-logic/src/services/projectsService.js`
- `packages/core-logic/src/services/tasksService.js`
- `packages/core-logic/src/services/messagesService.js` (notably `markMessageAsRead`)
- `src/context/AppContext.jsx` (Supabase realtime subscription behavior)
- `src/views/MessagesView.jsx` (message state reconciliation with realtime)

