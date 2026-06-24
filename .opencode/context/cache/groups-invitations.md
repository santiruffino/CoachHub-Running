# Groups + invitations domain

## Description
Group management, member assignment, coach/athlete invitations, and team invite links.

## Entry points
- `src/app/(dashboard)/groups/page.tsx`
- `src/app/(dashboard)/groups/[id]/page.tsx`
- `src/app/(dashboard)/groups/new/page.tsx`
- `src/app/api/v2/groups/*`
- `src/app/api/v2/invitations/*`
- `src/app/api/v2/team-invite-links/*`

## Key files
- `src/features/groups/components/GroupsList.tsx`
- `src/features/groups/components/GroupDetailsView.tsx`
- `src/features/groups/components/EditGroupModal.tsx`
- `src/features/groups/components/AddMemberModal.tsx`
- `src/features/groups/components/GroupWeeklyCalendar.tsx`
- `src/features/invitations/components/CreateInvitationForm.tsx`
- `src/features/invitations/components/InviteAthleteModal.tsx`
- `src/features/invitations/components/InviteCoachModal.tsx`
- `src/features/invitations/components/TeamInviteLinkManager.tsx`

## Dependencies
- Group/race models and invitation APIs
- Users directory for member selection
- Team settings and auth role checks

## Notes
- Groups can be regular or race-linked.
- Invitations and team links are the onboarding entry path for new users.
