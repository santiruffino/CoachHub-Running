# Settings

## Description

Coach and team configuration for thresholds, branding, AI/default models, and capacity limits. Provides adjustable operational defaults used by other domains.

## Entrypoints

* src/app/(dashboard)/settings/coach/page.tsx
* src/app/(dashboard)/settings/team/page.tsx
* src/app/api/v2/settings/coach/route.ts
* src/app/api/v2/settings/team/route.ts

## Services

* src/features/settings/services/settings.service.ts

## Models

* CoachSettings
* TeamSettings

## Dependencies

* internal: src/features/settings/types.ts, src/lib/settings/defaults.ts, src/lib/axios
* external: Axios

## Notes

* Coach settings are personal; team settings are organization-wide.
* Team settings include branding and athlete-cap limits in addition to thresholds/models.
* Thresholds likely influence alerting and compliance behavior in dashboard/trainings domains.
