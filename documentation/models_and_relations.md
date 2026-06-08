# Models and Relations

This document describes the current domain model used by the running platform.

## Core entity graph (conceptual)

```mermaid
erDiagram
    PROFILES {
        uuid id PK
        string email
        string name
        enum role
        uuid team_id
        uuid coach_id
    }

    GROUPS {
        uuid id PK
        string name
        uuid team_id
        uuid created_by
    }

    ATHLETE_GROUPS {
        uuid id PK
        uuid athlete_id
        uuid group_id
    }

    TRAININGS {
        uuid id PK
        string title
        string type
        jsonb blocks
        uuid team_id
        uuid created_by
    }

    TRAINING_ASSIGNMENTS {
        uuid id PK
        uuid user_id
        uuid training_id
        uuid source_group_id
        uuid activity_id
        jsonb workout_snapshot
        date scheduled_date
        bool completed
    }

    ACTIVITIES {
        uuid id PK
        string external_id
        uuid user_id
        string sport_type
        float distance
    }

    ACTIVITY_STREAMS {
        uuid id PK
        uuid activity_id
        jsonb stream_data
    }

    ACTIVITY_FEEDBACK {
        uuid id PK
        uuid activity_id
        uuid user_id
        int rpe
    }

    RACES {
        uuid id PK
        uuid team_id
        uuid created_by
    }

    ATHLETE_RACES {
        uuid id PK
        uuid athlete_id
        uuid race_id
    }

    INVITATIONS {
        uuid id PK
        string email
        string token
        uuid team_id
        uuid coach_id
        string role
    }

    TEAM_SETTINGS {
        uuid team_id PK
        jsonb thresholds
        jsonb branding
        jsonb default_models
        uuid updated_by
    }

    COACH_SETTINGS {
        uuid coach_id PK
        uuid team_id
        jsonb thresholds
        jsonb default_models
        uuid updated_by
    }

    ADMIN_ACTION_LOGS {
        uuid id PK
        uuid actor_id
        string actor_role
        uuid team_id
        string action
        string target_type
        string target_id
        jsonb metadata
    }

    TEAMS {
        uuid id PK
        string name
        string sport
    }

    TEAM_INVITE_LINKS {
        uuid id PK
        uuid team_id
        uuid created_by
        string role
        string token
        string label
        bool is_active
        timestamp expires_at
        int max_uses
        int uses
        timestamp last_used_at
    }

    PROFILES ||--o{ GROUPS : creates
    PROFILES ||--o{ TRAININGS : creates
    PROFILES ||--o{ ACTIVITIES : performs
    PROFILES ||--o{ TRAINING_ASSIGNMENTS : receives
    GROUPS ||--o{ ATHLETE_GROUPS : contains
    TRAININGS ||--o{ TRAINING_ASSIGNMENTS : assigned_as
    ACTIVITIES ||--o| ACTIVITY_STREAMS : has
    ACTIVITIES ||--o| ACTIVITY_FEEDBACK : has
    RACES ||--o{ ATHLETE_RACES : mapped_to
    PROFILES ||--o| COACH_SETTINGS : owns
    PROFILES ||--o{ ADMIN_ACTION_LOGS : emits
    TEAM_SETTINGS ||--|| PROFILES : updated_by
    COACH_SETTINGS ||--|| PROFILES : updated_by
    TEAMS ||--o{ TEAM_INVITE_LINKS : owns
    TEAM_INVITE_LINKS }o--|| PROFILES : created_by
    TEAM_INVITE_LINKS }o--|| ADMIN_ACTION_LOGS : logged_as
```

## Key behavior notes

- Team scope is enforced through `team_id` and RLS/app checks.
- `coach_id` remains relevant for direct coach-athlete assignment paths.
- `created_by` tracks ownership metadata for trainings/groups/races.
- Assignment snapshots (`workout_snapshot`) preserve planned context at assignment time.
- Team/coaches can persist configurable thresholds/branding/default models.
- **`team_settings.max_athletes`** (integer, nullable) enforces athlete cap for pricing tiers; checked on per-email invites and team-link sign-ups.
- **`team_invite_links`** provides shareable sign-up URLs per team; atomic consumption via `consume_team_invite_link(token)` RPC; every use logs `team_invite_link.used` to `admin_action_logs`.
- Admin critical writes are captured in append-only `admin_action_logs`.

## Activity IDs

- Use internal UUID for app routes and internal joins.
- Keep provider external ID for Strava API synchronization.

## Running-first current state

The schema supports multi-sport records (`sport_type`), but training target semantics and compliance logic are still tuned for running.
