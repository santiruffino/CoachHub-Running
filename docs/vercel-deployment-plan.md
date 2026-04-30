# Vercel Deployment Plan

## Prerequisites

- Vercel project connected to this repository
- Supabase project configured
- Production environment variables prepared

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=

STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=
STRAVA_WEBHOOK_VERIFY_TOKEN=
STRAVA_SUBSCRIPTION_ID=
```

Notes:

- Never expose `SUPABASE_SECRET_KEY` to client code.
- `NEXT_PUBLIC_*` values are browser-visible.

## Build/runtime configuration

- Framework: Next.js
- Root directory: `frontend` (if monorepo parent exists)
- Build command: `npm run build`
- Install command: `npm install`

## Deployment checklist

1. Set environment variables in Vercel (Production + Preview as needed)
2. Deploy from main branch
3. Verify authentication flows
4. Verify `/api/v2/*` health on primary workflows
5. Verify Strava OAuth callback URL matches deployed domain
6. Verify webhook handshake and processing

## Post-deploy verification

- Admin dashboard loads
- Coach dashboard and athlete roster load
- Athlete dashboard loads with assignments
- Activity detail page works with UUID route IDs
- Feedback and compliance endpoints respond correctly

## Rollback

Use Vercel deployment history and promote last known-good deployment.
