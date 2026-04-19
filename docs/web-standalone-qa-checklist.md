# Web Standalone QA and Rollout Checklist

## Parity QA
- Verify project workspace navigation via route tabs (`tasks`, `gantt`, `field-issues`, `activity`)
- Verify dashboard, project directory, and messages are usable without desktop fallback
- Verify notification center opens from top shell and links route correctly
- Verify legacy notification links using `?project=<id>` redirect into `/projects/:id/tasks`

## Browser UX QA
- Verify refresh/back/forward preserve navigation context
- Verify deep-link entry into `/projects/:id/*` routes without breaking session flow
- Verify auth callback handling returns user to dashboard after sign-in

## Performance QA
- Benchmark initial load for dashboard and project workspace
- Benchmark project workspace refresh on a large project
- Monitor console telemetry logs (`[web-telemetry]`) for route navigation flow

## Rollout Gates
- Internal QA signoff
- Pilot org enablement
- Production ramp by org cohort
- Post-release telemetry and support issue review
