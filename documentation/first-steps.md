# First Steps (Team Onboarding)

This SOP describes how to onboard a new running team and start operating the platform.

## 1) Platform owner/bootstrap

Run from `frontend/`:

```bash
npx tsx scripts/create-admin.ts
```

This script:

- creates an `ADMIN` user
- assigns an existing running team or creates a new one

## 2) Admin onboarding

After first login, the admin should:

1. Verify profile/team linkage
2. Invite assistant coaches from Coaches section
3. Invite initial athletes

## 3) Coach onboarding

Coaches can:

- manage athletes/groups/trainings within team scope
- invite athletes (not coaches)

## 4) Athlete onboarding

Athletes accept invitation links and complete account setup.

Accepted invitation flows currently exist in two routes:

- `src/app/accept-invitation/page.tsx` (query token flow)
- `src/app/(auth)/accept-invitation/[token]/page.tsx` (token path flow)

## 5) Strava setup

Athletes connect Strava from profile and can trigger manual sync.

Webhook processing is available for asynchronous updates when configured.

## 6) Quick operational checklist

- Admin can access dashboard
- Coaches can see team athletes/groups/trainings
- Athletes can access personal dashboard
- Strava status endpoint returns expected connection state
