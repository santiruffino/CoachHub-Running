# Coach-Athlete Communication

This document explains the two separate communication features in the app:

- Private coach notes
- Coach-athlete chat

They are intentionally different features and do not share storage or UI behavior.

## 1. Private Coach Notes

Coach notes are internal annotations that only coaches can write and see.

### What they are

- Free-form notes about an athlete
- Visible only to coaches and admins in the coach-facing athlete detail view
- Stored separately from chat messages

### Data flow

1. The coach opens the athlete detail page.
2. The page loads the current `coach_notes` value from `athlete_profiles`.
3. The `CoachNotes` component renders an editable textarea.
4. Saving calls `PATCH /api/v2/users/[id]/details` with `coachNotes`.
5. The API updates `public.athlete_profiles.coach_notes`.

### Relevant files

- `src/components/dashboard/CoachNotes.tsx`
- `src/features/users/components/AthleteDetailsView.tsx`
- `src/app/api/v2/users/[id]/details/route.ts`
- `src/app/(dashboard)/athletes/[id]/page.tsx`

### Behavior

- Coaches can edit the notes.
- Athletes do not see this content.
- Notes are saved immediately to the athlete profile row.

## 2. Coach-Athlete Chat

Chat is a two-way conversation between an athlete and coaches.

### What it is

- A message thread with timestamps
- Accessible to any coach and the athlete
- Intended for conversation, not internal coach planning notes

### Data model

Chat messages are stored in `public.coach_athlete_messages`.

Important columns:

- `athlete_id`
- `coach_id`
- `sender_id`
- `body`
- `read_at`
- `created_at`

`sender_id` stores the actual sender, so coach replies always keep the real coach identity even when the thread is shared.

### Data flow

1. A coach or athlete opens the thread.
2. The UI calls `GET /api/v2/users/[id]/messages`.
3. The API validates that the user is a coach, admin, or the athlete themselves.
4. Messages are returned in chronological order.
5. Unread messages from the other participant are marked as read.
6. Sending a message calls `POST /api/v2/users/[id]/messages`.
7. The API inserts the new row and returns the created message.

### Relevant files

- `src/components/dashboard/CoachAthleteChat.tsx`
- `src/features/users/services/athletes.service.ts`
- `src/app/api/v2/users/[id]/messages/route.ts`
- `src/app/(dashboard)/dashboard/components/AthleteDashboard.tsx`
- `src/features/users/components/AthleteDetailsView.tsx`
- `supabase/migrations/20260627000000_coach_athlete_messages.sql`

### Behavior

- Both sides can send messages.
- Any coach and the athlete can read the thread.
- Messages are polled periodically for freshness.
- Read state is tracked per message.

## 3. Where They Appear

### Coach athlete detail page

The athlete detail page shows:

- Private coach notes
- Coach-athlete chat
- Upcoming races

### Athlete dashboard

The athlete dashboard shows the chat thread only.

## 4. Why They Are Separate

- Notes are private and coach-owned.
- Chat is a shared conversation.
- Notes support internal coaching context.
- Chat supports back-and-forth communication with the athlete.

Keeping them separate avoids mixing internal planning with user-facing conversation.
