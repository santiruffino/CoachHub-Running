# Settings domain

## Description
Team and coach configuration plus admin audit logs.

## Entry points
- `src/app/(dashboard)/settings/team/page.tsx`
- `src/app/(dashboard)/settings/coach/page.tsx`
- `src/app/(dashboard)/settings/audit-logs/page.tsx`
- `src/app/api/v2/settings/*`
- `src/app/api/v2/admin/audit-logs/route.ts`

## Key files
- `src/features/settings/components/TeamSettingsForm.tsx`
- `src/features/settings/components/CoachSettingsForm.tsx`
- `src/features/settings/components/AuditLogsList.tsx`
- `src/features/settings/components/TeamInviteLinksCard.tsx`
- `src/features/settings/services/settings.service.ts`
- `src/features/settings/services/audit-logs.service.ts`

## Dependencies
- Admin/team profile role checks
- `BackButton`, dashboard layout, and UI forms/tables
- Audit log and settings API routes

## Notes
- Settings pages are role-gated and mostly admin-facing.
- Audit logs are read-only, paginated, and filtered by action.
