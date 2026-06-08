# Product and Behavior

## Product focus

Endurix is currently optimized for running coaching workflows, with a staged path to cycling.

- Primary users: `ADMIN`, `COACH`, `ATHLETE`
- Primary domain: running planning, assignment, activity sync, coaching feedback
- Cycling support: partial foundation (sport-aware rendering + power zones in builder), not fully production-ready at the domain level

## Core value proposition

> **Entrena más inteligente. Rinde por más tiempo.** *(Train smarter. Perform longer.)*

Endurix is the all-in-one platform for endurance coaches and athletes who reject the "lifestyle" aesthetic in favor of structured, data-driven performance.

## Core running workflows

### Coach / admin workflows

1. Invite athletes (admins can also invite coaches)
2. **Create team invite links** (single reusable URL per team; share via WhatsApp/QR; athletes sign up and join team automatically)
3. **Set team athlete limit** (admin-only pricing tier cap via `max_athletes` in team settings)
4. Create / manage groups and trainings
5. Assign trainings to athletes and groups
6. Review dashboards, compliance signals, and activity analysis
7. Manage athlete feedback and assignment linkage
8. Configure coach / team settings (thresholds, branding, default models, **athlete limit**)
9. Review append-only admin audit logs for critical writes (includes team invite link events)
10. Monitor **training load** per athlete (CTL / ATL / TSB / ACWR) with smart alert scoring

### Athlete workflows

1. Accept invitation and complete account setup
2. Configure profile thresholds (restHR, maxHR, LTHR, VAM, UAN, FTP)
3. Connect Strava
4. Review schedule and assignments on the weekly calendar
5. Sync activities (automatic via webhook + manual)
6. **Open the home dashboard to see fitness, fatigue, form, and injury risk** (CTL / ATL / TSB / ACWR)
7. Review personalized training zones (HR + VAM-based pace)
8. Provide RPE / sensations / comments feedback

## Current platform characteristics

- Team-centric authorization (`team_id`)
- UUID-first activity routes in v2
- Strava ingestion and stream fetching through Edge Functions
- Spanish locale enabled (`es`); English copy bank prepared in `docs/MARKETING_FEATURES.md` for future locale work
- Persisted coach / team settings and first-cut admin audit logging are active
- **Team athlete limit** (`max_athletes`) enforced on both email invitations and team-link sign-ups
- **Team invite links** (reusable per-team URL, coach/admin creates, athlete signs up via `/join/[token]`)
- Training load (Banister model) computed from `load_score` / `suffer_score` and surfaced on both coach and athlete views

## Athlete home dashboard — daily cockpit

The athlete opens the app and lands on a **fit-fatigue-form-risk** cockpit:

- 4 weekly stat cards (volume, time, elevation, compliance)
- 4 fitness status cards (CTL, ATL, TSB with color, ACWR with risk chip)
- Weekly calendar (assignments + Strava activities)
- Coach notes (read-only) and next races
- **Estado de Forma** card with a 7 / 30 / 90-day range selector and CTL / ATL / TSB trend chart
- **Rendimiento y Zonas** card with the performance compliance trend and personalized HR + VAM pace zones

The same load-metrics endpoint (`athletesService.getLoadMetrics`) and chart are used on the coach's `AthleteDetailsView`, so coach and athlete see the same numbers.

## Cycling roadmap status

What already exists:

- `CYCLING` enum / type support in training types
- Sport-aware pace / speed rendering in selected activity views
- Power zones in the workout builder (`StepEditor`)
- FTP field on `athlete_profiles`

What remains before full cycling readiness:

- remove running-only defaults in estimators / matching helpers
- extend target / compliance model beyond HR and running pace assumptions
- strengthen sport-specific matching constraints
- surface FTP / power zones in the athlete profile (currently only used in builder)

See `documentation/platform-analysis-report.md` and `documentation/sport-readiness.md` for detailed evidence and priorities.
