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
3. **Group Management**: Coaches can create multiple training groups (e.g., "Beginners", "Marathon Prep") and assign athletes to these groups for easier bulk management.
4. **Workout Templates**: Coaches assemble reusable "Trainings" or workout templates (e.g., intervals, easy runs, long runs) using a structured block builder.
5. **Assignment**: The coach schedules workouts on the calendar for individual athletes or entire groups.
6. **Monitoring**: Once athletes complete workouts (especially if synced via Strava), the coach reviews the performance, completion status, and adherence to the prescribed plan.

### Athlete Workflow
1. **Onboarding**: The athlete clicks the invite link, creates an account, and completes their profile (including health metrics like max HR, resting HR, VAM, UAN).
2. **Strava Connection**: The athlete connects their Strava account via OAuth to allow automatic synchronization of their activities.
3. **Calendar View**: The athlete visits their dashboard to see the upcoming training assignments.
4. **Execution & Sync**: The athlete performs the workout and uploads it to Strava. The system automatically syncs this activity and attempts to match it against the planned workout to determine compliance (completed, partial, skipped).

## Key Features
- **Strava Integration**: Automated syncing of activities and deep integration with Strava data streams (Heart Rate, GPS, Pace).
- **Automated Matching Engine**: An algorithm that matches an athlete's real-world Strava activity with the coach's scheduled workout to provide automated compliance reporting.
- **Role-Based Access**: Specialized interfaces and access rules for `COACH` vs `ATHLETE`.
- **Localization**: Full Spanish localization for a localized user experience.
- **Premium User Experience**: The platform adheres to high-end "Performance Curator" design guidelines, offering a smooth, borderless ("No-Line" design), and highly aesthetic user interface.
