# MVP Analysis (Current)

This file is a concise status snapshot for MVP-level running functionality.

## Summary

- Core running product loops are implemented and the athlete now has a daily **fit-fatigue-form-risk cockpit** on `/dashboard`.
- Remaining risk is less about missing core pages and more about consistency / security / maintainability.

## Strengths

- End-to-end role-based flows are present
- Team-centric model is active
- Strava pipeline exists (OAuth + webhook + edge processing)
- Activity detail and coaching feedback loop are in place
- Workout builder with VAM and FTP target pacing
- Training load (CTL / ATL / TSB / ACWR) visible to both coach and athlete with shared chart and 7/30/90-day range selector
- Personalized training zones (HR + VAM) on the athlete dashboard
- Append-only admin audit log + persisted coach / team settings
- GA4 product analytics wired with signup / onboarding / retention funnels
- Hardened webhook + OAuth state + API rate limiting

## Gaps

- i18n is incomplete across APIs and several dashboard pages
- some legacy compatibility routes / docs remain (thin pass-throughs only)
- cycling domain is only partially implemented (sport-aware scaffolding but not domain-complete)
- FTP / power zones are wired into the builder but not yet surfaced in the athlete profile or a power-zones chart on the dashboard

## References

- `documentation/platform-analysis-report.md`
- `docs/MVP_FEATURES_STATUS.md`
- `docs/MVP_FEATURES.md`
