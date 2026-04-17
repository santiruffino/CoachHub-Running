# Backend Architecture

## Overview
Coach Hub Running adopts a **Serverless Full-Stack Approach**, bypassing the need for a separate monolithic backend server. The backend logic is entirely integrated into the Next.js platform and powered by a robust Database-as-a-Service (Supabase).

## Next.js API Routes (Serverless Functions)
Any logic that requires hiding secrets (like Strava API integration, Webhooks, or Supabase Admin operations) is handled by Next.js Route Handlers.

### API Structure (`/src/app/api/v2/`)
- `/api/v2/users/`: Endpoints dealing with user management, role assignments, or bulk profile operations.
- `/api/v2/groups/`: Coach-specific endpoints to orchestrate complex group assignment logic.
- `/api/v2/trainings/`: Endpoints handling the creation, duplication, and assignment of structured workouts.
- `/api/v2/strava/auth/`: OAuth callback receivers for the Strava integration. Resolves authorization codes into tokens and persists them securely.
- `/api/v2/strava/webhook/`: Background listeners that receive real-time updates from Strava when an athlete finishes an activity.

## Supabase and Server-side Logic
Supabase serves not just as a database, but as the core logic enforcement layer.

### 1. Authentication (`@supabase/auth-helpers`)
- Secure, HTTP-only cookie-based session management.
- Handles OAuth loops and password authentication securely.

### 2. Row Level Security (RLS)
The absolute core of the backend security model lives in PostgreSQL. By leveraging RLS, the backend does not need extensive authorization API wrappers. If an Athlete queries `SELECT * FROM activities`, PostgreSQL evaluates the `auth.uid()` and restricts the payload to only their rows.

### 3. Asynchronous Processes & Edge Functions
Background tasks that shouldn't block the user interface (such as analyzing a newly pushed Strava Activity and trying to match it to a prescribed Workout) are delegated to background jobs, webhooks, or Supabase Edge Functions.

### The Matching Engine (Activity to Workout)
A specialized backend algorithm lives within the system to map Strava data to planned schedules:
- When a Strava webhook triggers on new activity creation, the system pulls the activity details.
- It scans the athlete's `training_assignments` for the given calendar day.
- It compares duration, distance, and intervals.
- The outcome (`completed`, `partial`, `skipped`) is recorded against the assignment, enabling automated compliance tracking for coaches.
