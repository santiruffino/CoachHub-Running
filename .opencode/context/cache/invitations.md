# Invitations

## Description

Handles invite creation, validation, acceptance, and reusable team invite links. Supports coach/admin-led access flows into the product.

## Entrypoints

* src/app/(auth)/accept-invitation/[token]/page.tsx
* src/app/(auth)/join/[token]/page.tsx
* src/app/api/v2/invitations/route.ts
* src/app/api/v2/invitations/bulk/route.ts
* src/app/api/v2/team-invite-links/route.ts

## Services

* src/features/invitations/services/invitation.service.ts
* src/features/invitations/services/team-invite-link.service.ts

## Models

* Invitation
* TeamInviteLink
* TeamInviteLinkResolution

## Dependencies

* internal: src/lib/axios, src/lib/email/templates/invitation.ts
* external: fetch, Axios

## Notes

* Legacy token invites and public join links coexist.
* Invite links support expiry, max uses, rotation, and revocation.
* Closely coupled to auth acceptance and team membership provisioning.
