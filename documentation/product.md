# Product & Behavior

## Overview
Coach Hub Running is a sophisticated running coach management platform designed to facilitate the relationship and training workflows between running coaches and their athletes. The platform serves as a centralized hub for planning, assigning, tracking, and analyzing running workouts.

## Target Audience
1. **Coaches**: Professionals or team leaders who manage multiple running athletes. They need tools to build training templates, assign workouts in bulk, manage groups, and monitor the performance of their athletes over time.
2. **Athletes**: Runners of varying levels who receive structured training plans from their coaches. They need to view their schedule, log their completed workouts, and connect their fitness tracking devices.

## Core Workflows

### Coach Workflow
1. **Onboarding & Setup**: A coach creates an account (initially provisioned or set up via admin) and sets up their profile.
2. **Athlete Invitation**: The coach generates invitation links and sends them to athletes to join the platform under their mentorship.
3. **Group Management**: Coaches can create training groups (e.g., "Beginners", "Marathon Prep"). They can assign workouts to the entire group at once and manage the collective schedule via the **Group Calendar**.
4. **Race Library & season Planning**: Coaches can create a library of races (templates). These can be assigned to individuals or entire groups as "Target Races," which appear prominently on dashboards and calendars with custom countdowns.
5. **Workout Templates**: Coaches assemble reusable "Trainings" or workout templates (e.g., intervals, easy runs, long runs) using a structured block builder.
6. **Assignment**: The coach schedules workouts on the calendar for individual athletes or entire groups. The system creates **Immutable Snapshots** of the workout at the time of assignment to preserve the coach's intent.
7. **Monitoring & Batch Edits**: Once athletes complete workouts, the coach reviews performance. Coaches can batch-edit or reschedule group workouts for the entire squad in one action.

### Athlete Workflow
1. **Onboarding**: The athlete clicks the invite link, creates an account, and completes their profile (including health metrics like max HR, resting HR, VAM, UAN).
2. **Strava Connection**: The athlete connects their Strava account via OAuth to allow automatic synchronization of their activities.
3. **Calendar View**: The athlete visits their dashboard to see the upcoming training assignments and targeted races (with Priority A/B/C indicators).
4. **Execution & Sync**: The athlete performs the workout and uploads it to Strava. The system automatically syncs this activity and attempts to match it against the planned workout to determine compliance (completed, partial, skipped).

## Key Features
- **Strava Integration**: Automated syncing of activities and deep integration with Strava data streams (Heart Rate, GPS, Pace).
- **Race Management System**: Dedicated workflows for managing race templates, group-wide race targets, and season-long planning.
- **Automated Matching Engine**: An advanced algorithm that uses both "Simple Match" (Distance/Duration) and "Lap Match" logic to accurately correlate Strava data with planned workouts.
- **Workout Snapshots**: Automatic creation of immutable JSON snapshots for every assignment, ensuring that if a coach updates a template, existing assignments remain consistent.
- **Role-Based Access**: Specialized interfaces and access rules for `ADMIN`, `COACH`, and `ATHLETE`.
- **Localization**: Full Spanish localization for a localized user experience.
- **Premium User Experience**: The platform adheres to high-end "Performance Curator" design guidelines, offering a smooth, borderless ("No-Line" design), and highly aesthetic user interface.
