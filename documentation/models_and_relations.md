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

    COACH_PROFILES {
        uuid id PK
        uuid user_id FK
        text bio
        text specialty
    }

    ATHLETE_PROFILES {
        uuid id PK
        uuid user_id FK
        int rest_hr
        int max_hr
    }

    %% Grouping
    GROUPS {
        uuid id PK
        string name
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
        uuid coach_id FK
    }

    TRAINING_ASSIGNMENTS {
        uuid id PK
        uuid user_id FK
        uuid training_id FK
        timestamp scheduled_date
        boolean completed
    }

    %% External Data
    ACTIVITIES {
        uuid id PK
        string external_id
        uuid user_id FK
        float distance
        int duration
    }

    STRAVA_ACTIVITY_STREAMS {
        uuid id PK
        uuid activity_id FK
        enum type
        jsonb data
    }

    STRAVA_CONNECTIONS {
        uuid id PK
        uuid user_id FK
        string strava_athlete_id
        string access_token
    }

    INVITATIONS {
        uuid id PK
        string email
        string token
        uuid coach_id FK
    }

    %% Relationships
    PROFILES ||--o| COACH_PROFILES : "extends (if coach)"
    PROFILES ||--o| ATHLETE_PROFILES : "extends (if athlete)"
    
    PROFILES ||--o{ PROFILES : "Coach manages Athlete"
    
    PROFILES ||--o{ GROUPS : "Coach creates"
    GROUPS ||--o{ ATHLETE_GROUPS : "includes"
    PROFILES ||--o{ ATHLETE_GROUPS : "Athlete joins"
    
    PROFILES ||--o{ TRAININGS : "Coach authors"
    TRAININGS ||--o{ TRAINING_ASSIGNMENTS : "template for"
    PROFILES ||--o{ TRAINING_ASSIGNMENTS : "Athlete assigned"
    
    PROFILES ||--o{ ACTIVITIES : "Athlete performs"
    ACTIVITIES ||--o{ STRAVA_ACTIVITY_STREAMS : "contains data points"
    
    PROFILES ||--o| STRAVA_CONNECTIONS : "authorizes"
    PROFILES ||--o{ INVITATIONS : "Coach sends"
```

## Description of Key Flows

1. **Invitation Flow**: 
   A `COACH` (`PROFILES.role = 'COACH'`) creates an `INVITATIONS` record. An athlete uses the token to create their `PROFILES` matching user, effectively establishing the `coach_id` relationship.

2. **Group Assignment Flow**: 
   A coach organizes athletes by creating `GROUPS` and linking them via `ATHLETE_GROUPS`.

3. **Workout Scheduling Flow**: 
   A coach authors `TRAININGS` (templates), and then instantiates `TRAINING_ASSIGNMENTS` on specific dates for athletes. 

4. **Strava Synchronization Flow**: 
   An athlete authorizes the app, populating `STRAVA_CONNECTIONS`. Webhooks or background jobs pull completed workouts into `ACTIVITIES` and their detailed telemetry into `STRAVA_ACTIVITY_STREAMS`. The system then compares `ACTIVITIES` against `TRAINING_ASSIGNMENTS` to calculate compliance.
