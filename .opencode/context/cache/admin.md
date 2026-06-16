# Admin

## Description

Administrative oversight for global metrics, coach activity, and audit logging. Focused on platform governance rather than day-to-day coaching workflows.

## Entrypoints

* src/app/(dashboard)/dashboard/page.tsx
* src/app/(dashboard)/settings/audit-logs/page.tsx
* src/app/api/v2/dashboard/admin/route.ts
* src/app/api/v2/admin/audit-logs/route.ts

## Services

* src/features/settings/services/audit-logs.service.ts
* src/lib/audit/admin-action-log.ts

## Models

* AdminAuditLogItem
* AdminAuditLogResponse
* Coach
* User

## Dependencies

* internal: src/interfaces/auth.ts, src/interfaces/coach.ts, src/lib/supabase/server, src/lib/app-logger
* external: Supabase service-role client, Axios

## Notes

* Audit writes target the admin_action_logs table via service-role client.
* Admin dashboard aggregates top-level counts and coach activity snapshots.
* Distinct from Settings: this domain is observability/governance, not preference storage.
