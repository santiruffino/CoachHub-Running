# Races

## Description

Race template management plus athlete-specific race planning and result tracking. Supports coach library workflows and athlete upcoming/history views.

## Entrypoints

* src/app/(dashboard)/races/page.tsx
* src/app/api/v2/races/route.ts
* src/app/api/v2/users/[id]/races/route.ts
* src/app/api/v2/users/[id]/races/[athleteRaceId]/route.ts

## Services

* src/features/races/services/races.service.ts

## Models

* Race
* AthleteRace
* CreateRaceDTO
* AssignRaceDTO
* RacePriority
* RaceStatus

## Dependencies

* internal: src/interfaces/race.ts, src/lib/axios
* external: date-fns, Axios

## Notes

* Same UI component serves coach template mode and athlete assignment/history mode.
* Group assignment exists via /v2/groups/{groupId}/races/{raceId}.
* Athlete detail and dashboard surfaces depend on upcoming race data.
