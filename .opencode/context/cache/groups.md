# Groups

## Description

Team/group organization for athletes, including active and historical race-prep groups. Used for membership management and downstream training/race assignment.

## Entrypoints

* src/app/(dashboard)/groups/page.tsx
* src/app/(dashboard)/groups/[id]/page.tsx
* src/app/(dashboard)/groups/new/page.tsx
* src/app/api/v2/groups/route.ts
* src/app/api/v2/groups/[id]/members/route.ts

## Services

* src/features/groups/services/groups.service.ts

## Models

* Group
* GroupDetails
* CreateGroupDto

## Dependencies

* internal: src/interfaces/group.ts, src/features/groups/utils/groupUtils.ts, src/lib/axios
* external: Axios, next-intl

## Notes

* UI separates active groups from finished race groups using date/type logic.
* Groups are a routing hub for assignments and race distribution.
* Dashboard coach metrics also aggregate group counts/compliance.
