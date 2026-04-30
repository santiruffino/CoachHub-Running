# Sport Readiness: Running to Cycling

## Current state

- Running is first-class and production-oriented.
- Cycling is partially scaffolded but not fully domain-complete.

## What already supports cycling

- Training type enum includes `CYCLING`.
- Some activity UI components switch between running pace and speed display.
- Stream ingestion can include cycling metrics from Strava.

## Main blockers

1. running-specific default pace assumptions in estimation/matching utilities
2. compliance model centered on HR/running semantics
3. incomplete sport filtering/constraints during matching
4. target model lacks robust cycling power-first representation

## Recommended abstraction work

## 1) Sport metric contract

- running: pace min/km, cadence spm
- cycling: speed km/h, power watts, cadence rpm/spm (choose canonical)

## 2) Sport-specific targets

- maintain running targets
- add cycling-target semantics (e.g., power zones / FTP%)

## 3) Matching policy by sport

- enforce sport guard before distance/time heuristics
- then apply sport-specific tie-break rules

## 4) Compliance by sport

- define target evaluation hierarchy by sport
- avoid applying running-only thresholds to cycling sessions

## Documentation requirement

Any cycling implementation PR should update:

- `documentation/product.md`
- `documentation/models_and_relations.md`
- `documentation/backend.md`
- this file (`documentation/sport-readiness.md`)
