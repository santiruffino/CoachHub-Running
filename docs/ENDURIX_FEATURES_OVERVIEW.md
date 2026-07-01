# Endurix Features Overview

This document explains the main Endurix features and what each one does.

## 1. Roles and Access Control

Endurix is role-based:

- `ADMIN` manages the platform and team-level operations
- `COACH` manages athletes, training, races, and coaching context
- `ATHLETE` consumes training, feedback, and communication

Access is also team-based, so coaches only see athletes in their team.

## 2. Team Management

Teams are the main tenant boundary in the app.

- Coaches and athletes belong to a team
- Team settings control shared behavior such as athlete limits
- Team invite links make it easier to add athletes without manual invites

## 3. Invitations and Onboarding

The onboarding flow covers first-time user setup.

- Admins can invite coaches
- Coaches and admins can invite athletes
- Invite links let athletes join a team through a shareable URL
- The onboarding flow completes the user profile and activates the account

## 4. Athlete Management

This is the core roster feature for coaches.

- View athletes in a searchable list
- Filter athletes by coach, level, and group
- Open athlete detail pages
- Edit athlete profile data
- Assign athletes to groups and coaches

## 5. Private Coach Notes

Coach notes are internal notes only the coach can write and read.

- Used for private observations and coaching context
- Stored on the athlete profile
- Not visible to the athlete
- Separate from chat

## 6. Coach-Athlete Chat

Chat is a two-way conversation between the athlete and assigned coach.

- Both sides can send messages
- Only the assigned coach and athlete can access the thread
- Messages are stored separately from coach notes
- Read state is tracked per message

## 7. Athlete Dashboard

The athlete dashboard is the athlete-facing home screen.

- Shows current training status and load data
- Shows upcoming races
- Shows the coach-athlete chat thread
- Shows personalized fitness and zone information

## 8. Coach Athlete Detail View

This is the coach-facing athlete workspace.

- Shows athlete profile and training history
- Shows weekly calendar and assignments
- Shows training load and risk metrics
- Shows private coach notes
- Shows coach-athlete chat
- Shows upcoming races

## 9. Training Planning and Builder

Endurix includes a workout creation and assignment flow.

- Coaches build reusable training templates
- Workouts support drag-and-drop structure
- The builder calculates estimated load and pacing
- Workouts can be assigned to athletes or groups

## 10. Calendar and Assignments

The calendar helps coaches track planned work.

- Weekly views show assignments alongside activity completion
- Assignments can be linked to athletes
- Completed workouts can be matched to Strava activities

## 11. Races

Race planning is built into the athlete workflow.

- Coaches can create and assign races
- Athletes see upcoming race countdowns
- Race notes and strategy context can be tracked

## 12. Strava Integration

Strava is the main source of activity data.

- OAuth connect / disconnect / status
- Manual sync of recent activities
- Webhook ingestion for new activity updates
- Activity streams for detailed activity visualization
- Initial import of recent activity history after connect

## 13. Fitness and Training Load

Endurix computes training load metrics from activity history.

- CTL, ATL, TSB, and ACWR are calculated and shown in the UI
- Coaches can use this to monitor athlete fatigue and readiness
- Athletes see a simplified version on their dashboard

## 14. Personalized Training Zones

The app adapts to athlete physiology.

- Heart rate zones use resting and max HR
- Pace zones use VAM
- Power zones are available in the workout builder

These values help coaches build more specific sessions.

## 15. Feedback and Compliance

Endurix includes a feedback loop after training.

- On athlete login, the app can prompt for quick feedback on the latest activity only
- Athletes can report RPE, sensations, and comments
- Compliance compares assigned workouts to completed activities
- Alerts highlight low compliance, missing workouts, and load issues

## 16. Alerts and Roster Prioritization

The coach dashboard prioritizes what needs attention.

- Alerts are scored by urgency
- Priority roster surfaces athletes who need coach intervention
- The dashboard highlights compliance, fatigue, and missing workouts

## 17. Settings and Administration

Platform settings are split between coach and team scope.

- Coach settings store coach-specific preferences and thresholds
- Team settings store shared configuration such as max athletes
- Admin audit logs record critical changes

## 18. Why Notes and Chat Are Separate

They solve different problems:

- Notes are private coaching context
- Chat is a two-way conversation with the athlete
- Notes should not be visible to the athlete
- Chat should be visible to both participants only

Keeping them separate makes the product clearer and safer to use.

## 19. What Is Not Yet Core

The main app does not currently focus on:

- Billing and subscriptions
- Full notification productization
- A complete cycling-specific domain model

These are later-stage product areas.
