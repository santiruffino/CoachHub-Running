# Models & Relations

The platform's data models revolve around the core `PROFILES` table, which acts as the nexus for identities categorized as either Coaches or Athletes. 

Below is an Entity-Relationship diagram mapping how these domain models interact with one another.

## Entity Relationship Diagram

```mermaid
erDiagram
    %% Core Identity
    PROFILES {
        uuid id PK
        string email
        string name
        enum role
        uuid coach_id FK
    }

    %% Grouping
    GROUPS {
        uuid id PK
        string name
        enum group_type
        uuid coach_id FK
    }

    ATHLETE_GROUPS {
        uuid id PK
        uuid athlete_id FK
        uuid group_id FK
    }

    %% Workouts & Scheduling
    TRAININGS {
        uuid id PK
        string title
        jsonb blocks
        boolean is_template
        uuid coach_id FK
    }

    TRAINING_ASSIGNMENTS {
        uuid id PK
        uuid user_id FK
        uuid training_id FK
        uuid source_group_id FK
        jsonb workout_snapshot
        date scheduled_date
        enum compliance_status
        uuid strava_activity_id FK
    }

    %% Race Management
    RACES {
        uuid id PK
        string name
        float distance
        string location
        uuid coach_id FK
    }

    ATHLETE_RACES {
        uuid id PK
        uuid athlete_id FK
        uuid race_id FK
        date date
        enum priority
        string target_time
    }

    %% External Data
    ACTIVITIES {
        uuid id PK
        string external_id
        uuid user_id FK
        float distance
        int duration
    }

    MATCHING_LOG {
        uuid id PK
        uuid activity_id FK
        uuid assignment_id FK
        float score
        jsonb match_details
    }

    %% Relationships
    PROFILES ||--o{ PROFILES : "Coach manages Athlete"
    PROFILES ||--o{ GROUPS : "Coach creates"
    GROUPS ||--o{ ATHLETE_GROUPS : "includes"
    
    PROFILES ||--o{ TRAININGS : "Coach authors"
    TRAININGS ||--o{ TRAINING_ASSIGNMENTS : "template for"
    TRAINING_ASSIGNMENTS }o--o| GROUPS : "belongs to group event"
    
    PROFILES ||--o{ ACTIVITIES : "Athlete performs"
    ACTIVITIES ||--o| MATCHING_LOG : "audits match"
    TRAINING_ASSIGNMENTS ||--o| MATCHING_LOG : "result of match"
    
    PROFILES ||--o{ RACES : "Coach creates templates"
    RACES ||--o{ ATHLETE_RACES : "assigned to athlete"
    PROFILES ||--o{ ATHLETE_RACES : "Athlete targets"
```

## Description of Key Flows

1. **Invitation Flow**: 
   A `COACH` (`PROFILES.role = 'COACH'`) creates an `INVITATIONS` record. An athlete uses the token to create their `PROFILES` matching user, establishing the `coach_id`.

2. **Workout Scheduling & Snapshots**: 
   A coach authors `TRAININGS` (templates). When assigned, the system copies the workout blocks into `TRAINING_ASSIGNMENTS.workout_snapshot` (JSONB), creating an immutable historical record.

3. **Race Management**: 
   Coaches build a library of `RACES`. These are mapped to specific athletes via `ATHLETE_RACES`, which stores custom goals like `target_time` and `priority` (A, B, or C).

4. **Strava Synchronization & Matching**: 
   Real-time webhooks populate `ACTIVITIES`. The Matching Engine calculates compliance by comparing `ACTIVITIES` with `TRAINING_ASSIGNMENTS`. Each match attempt is logged in `MATCHING_LOG` for debugging and transparency.
