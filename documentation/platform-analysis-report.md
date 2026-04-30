# Platform Analysis Report

Date: 2026-04-30

Scope requested:

1. documentation update baseline
2. missing translations and hardcoded strings
3. security vulnerabilities
4. unused code
5. running-now / cycling-next readiness

This report is based on static repository analysis (no runtime penetration testing).

## 1) Documentation accuracy findings

## Key drifts found

- Multiple docs referenced legacy NestJS/Prisma/BullMQ architecture.
- Role model docs were inconsistent with active `ADMIN` + team-centric behavior.
- Strava backend docs did not reflect Edge Function pipeline.
- Migration docs still listed completed work as pending.

## Resulting documentation actions performed

- Rewrote core docs in `documentation/` to match current architecture.
- Rewrote major operational docs in `docs/` to remove legacy NestJS assumptions.
- Added this analysis report as canonical audit output.

## 2) i18n and hardcoded string findings

## Critical

- API routes contain large hardcoded error/message surface.
- Several UI pages still include hardcoded user-facing text.
- Some translation key usage appears missing or namespace-misaligned.

## High-priority examples

- `src/app/api/v2/activities/[id]/route.ts`
- `src/app/api/v2/trainings/calendar/route.ts`
- `src/app/(dashboard)/athletes/[id]/page.tsx`
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/(dashboard)/dashboard/calendar/page.tsx`

## Recommendation

- Standardize API error contracts to codes and map codes to localized UI copy.
- Remove direct surfacing of backend raw messages where possible.

## 3) Security findings

## High severity

- Strava webhook trust/authenticity flow needs hardening.
- Webhook verification currently logs sensitive expected/received values.
- OAuth state handling should be strengthened.
- Some authz checks rely on unreliable role source patterns.

## Priority remediation themes

1. webhook authenticity hardening
2. secret-safe logging
3. strict role/team checks from trusted profile source
4. OAuth state randomization and validation

## 4) Unused/dead code findings

Likely unused/orphaned components exist (high-confidence candidates):

- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/activities/components/ActivityDynamicsChart.tsx`
- calendar/strava utility components with low reference evidence

Additional cleanup candidates include stale compatibility files and prompt/docs artifacts from legacy architecture.

## 5) Running-now / cycling-next readiness

## Running readiness

- Core workflows are implemented and actively represented across API/UI.

## Cycling blockers (current)

- running-centric pace defaults in estimators/matching paths
- compliance logic centered on HR running assumptions
- target model lacks full cycling-first semantics (power-centric pathways)
- sport-aware matching constraints are incomplete

## Cycling foundations already present

- `CYCLING` enum/type support exists
- activity UI has partial pace/speed switching
- streams pipeline can ingest cycling-relevant metrics

## Recommended next sequence

1. harden security findings first (P0)
2. normalize i18n and error-code strategy (P0/P1)
3. remove dead code and stale compatibility routes (P1)
4. implement explicit sport abstraction layer for cycling (P1/P2)

## Evidence source pointers

Representative files reviewed:

- `src/app/api/v2/**`
- `src/app/(dashboard)/**`
- `src/lib/supabase/**`
- `supabase/functions/**`
- `supabase/migrations/**`
- `messages/es.json`

---

If needed, this can be extended into a tracked remediation matrix (owner + ETA + acceptance criteria) in a follow-up document.
