# Coach Hub Running - Setup Guide

## Overview

Coach Hub Running is a running coach management platform built with:
- **Frontend & API**: Next.js 14 (App Router) with API Routes
- **Database & Auth**: Supabase (PostgreSQL + Authentication)
- **UI**: ShadcnUI + TailwindCSS
- **Deployment**: Vercel (recommended)

## Architecture

- ✅ **No separate backend** - Next.js API routes handle all server logic
- ✅ **Supabase Auth** - Cookie-based authentication (HTTP-only)
- ✅ **Direct Supabase queries** - No ORM, using Supabase client
- ✅ **Role-based access** - COACH and ATHLETE roles

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- (Optional) Strava API credentials for activity sync

## Getting Started

### 1. Clone and Install

```bash
cd frontend
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database schema:
   - Go to SQL Editor in Supabase Dashboard
   - Run the schema from `docs/supabase_schema.sql`

### 3. Configure Environment Variables

Create `frontend/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Secret Key (Server-side only - for admin operations)
# ⚠️ Only needed for invitation system and create-coach script
SUPABASE_SECRET_KEY=your-secret-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Strava Integration (Optional)
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_REDIRECT_URI=http://localhost:3001/strava/callback
```

**Where to find Supabase keys:**
- Go to Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
- `SUPABASE_SECRET_KEY` = Secret key (⚠️ Server-side only! For admin operations)

### 4. Create Your First Coach

Since this is now a Supabase-based app, you need to create the first coach user:

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. After user is created, go to SQL Editor and run:

```sql
-- Update the user's profile to be a COACH
UPDATE profiles
SET role = 'COACH'
WHERE email = 'your-coach-email@example.com';
```

**Option B: Using the Admin Script**

We've provided a script to create coach users:

```bash
cd frontend
npx tsx scripts/create-coach.ts
```

Follow the prompts to enter email and password.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001)

## Application Flow

### For Coaches

1. **Login** at `/login`
2. **Create Groups** (e.g., "Beginners", "Advanced")
3. **Invite Athletes** via `/invitations` - generates invitation links
4. **Create Training Templates** at `/trainings`
5. **Assign Workouts** to athletes or groups
6. **View Calendar** to see all assignments
7. **Monitor Athletes** - view their Strava activities and progress

### For Athletes

1. **Accept Invitation** via link from coach
2. **Set Password** on first login
3. **Connect Strava** (optional) for activity syncing
4. **View Assignments** on dashboard calendar
5. **Complete Workouts** mark as done
6. **Sync Activities** from Strava

## API Structure

All API routes are in `frontend/src/app/api/v2/`:

```
/api/v2/
├── users/              # User management
├── groups/             # Group management (COACH only)
├── trainings/          # Training templates & assignments (COACH only)
└── strava/auth/        # Strava OAuth & sync (ATHLETE only)
```

## Database Schema

Key tables:
- `profiles` - User profiles with role (COACH/ATHLETE)
- `coach_profiles` - Coach-specific data
- `athlete_profiles` - Athlete-specific data (HR, VAM, etc.)
- `groups` - Training groups
- `athlete_groups` - Group memberships
- `trainings` - Workout templates
- `training_assignments` - Assigned workouts
- `activities` - Strava activities
- `strava_connections` - Strava OAuth tokens
- `invitations` - Invitation tokens

## Strava Integration

### Setup

1. Create a Strava API application at [strava.com/settings/api](https://www.strava.com/settings/api)
2. Set Authorization Callback Domain to `localhost:3001` (or your domain)
3. Add credentials to `.env.local`

### Flow

1. Athlete clicks "Connect Strava"
2. Redirects to Strava OAuth
3. After approval, stores tokens in `strava_connections`
4. Athlete can manually sync activities with "Sync Now" button
5. Activities are stored in `activities` table

## Development Tips

### Check Authentication

Auth is handled via Supabase with HTTP-only cookies. Check auth state:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Role-Based Access

API routes use the `requireRole` helper:

```typescript
import { requireRole } from '@/lib/supabase/api-helpers';

// In your API route
const authResult = await requireRole('COACH');
if (authResult.response) {
  return authResult.response; // Returns 401/403 if not authorized
}
const { supabase, user } = authResult;
```

### Database Queries

Use Supabase client for queries:

```typescript
const { data, error } = await supabase
  .from('trainings')
  .select('*')
  .eq('coach_id', user.id);
```

## Troubleshooting

### Port 3001 already in use

```bash
lsof -ti:3001 | xargs kill -9
```

### Database connection issues

- Check SUPABASE_URL and keys in `.env.local`
- Verify database schema is up to date
- Check Supabase project is not paused

### Authentication not working

- Clear browser cookies
- Check `withCredentials: true` in axios config
- Verify Supabase keys are correct

### Strava sync fails

- Check Strava API credentials
- Verify redirect URI matches Strava app settings
- Check token hasn't expired (should auto-refresh)

## Data Migration

If migrating from the old NestJS backend, see migration scripts in `/migration-scripts`:

1. `export-data.ts` - Export from old Postgres DB
2. `import-data.ts` - Import to Supabase
3. `send-reset-emails.ts` - Send password resets to users

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables (same as `.env.local`)
4. Deploy!

**Important:** Update these for production:
- `NEXT_PUBLIC_APP_URL` → Your production URL
- `STRAVA_REDIRECT_URI` → Your production callback URL

### Environment Variables Checklist

✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY  
✅ SUPABASE_SECRET_KEY
✅ NEXT_PUBLIC_APP_URL
✅ STRAVA_CLIENT_ID (optional)
✅ STRAVA_CLIENT_SECRET (optional)
✅ STRAVA_REDIRECT_URI (optional)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Migration Plan](../docs/MIGRATION_PLAN.md)
- [Database Schema](../docs/supabase_schema.sql)

## Support

For issues, check:
1. Console errors in browser DevTools
2. Next.js terminal output
3. Supabase logs in dashboard
4. Migration status in `/docs/MIGRATION_STATUS.md`
