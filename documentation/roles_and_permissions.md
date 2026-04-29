# Roles & Permissions Guide

Coach Hub Running uses a tiered permission system to ensure security and focused user experiences. The three primary roles are **Super Admin**, **Coach**, and **Athlete**.

---

## 1. Super Admin (`ADMIN`)
The Super Admin is the system-wide overseer. They manage the infrastructure and the high-level business entities.

### **What can they do?**
*   **System Dashboard**: Access a global view of all athletes, groups, and active coaches.
*   **Coach Management**: 
    *   List all coaches registered in the system.
    *   Delete coaches (this triggers a logic that reassigns their orphaned athletes to the current Admin).
*   **Global Visibility**: Can visit the `/athletes`, `/groups`, and `/trainings` pages to see and manage data across **all** coaches.
*   **Settings Oversight**: Manage global system defaults (e.g., default heart rate zone models).

### **How to use it?**
1.  Log in with an account that has the `role = 'ADMIN'` in the `profiles` table.
2.  The main dashboard will show aggregate counts for the entire platform.
3.  Use the **"Entrenadores"** link in the navigation to audit coach activity and manage their accounts.

---

## 2. Coach (`COACH`)
The Coach is the primary operational user. They manage their specific "pod" of athletes and training plans.

### **What can they do?**
*   **Athlete Management**: Invite runners via email, edit their profiles, and monitor their health metrics (HR Zones, VAM, etc.).
*   **Group Orchestration**: Organize athletes into squads. A coach can only see and manage athletes assigned to them.
*   **Training Builder**: Create sophisticated workout templates using a visual block-based interface.
*   **Smart Scheduling**: 
    *   Assign workouts to individuals or entire groups.
    *   **Batch Operations**: Move or delete group-wide workouts in a single action.
*   **Race Planning**: Manage a personal library of race templates and assign them to athletes with Priority (A/B/C) indicators.
*   **Performance Monitoring**: Review Strava sync results and RPE mismatches via the specialized Coach Dashboard.

### **How to use it?**
1.  Navigate to **"Atletas"** to invite your team.
2.  Use **"Entrenamientos"** to build your template library.
3.  Use the **"Calendario"** in the dashboard to drag-and-drop workouts for your athletes.

---

## 3. Athlete (`ATHLETE`)
The end-user who receives training guidance.

### **What can they do?**
*   **Personal Calendar**: View upcoming workouts and target races assigned by their coach.
*   **Strava Integration**: Link their Strava account for automated data collection and compliance matching.
*   **Activity Analysis**: View detailed telemetry (Pace, Heart Rate, Laps) for their completed runs.
*   **Feedback Loop**: Provide RPE (Rate of Perceived Exertion) and comments on completed sessions.
*   **Onboarding**: Complete a structured setup to define their running level and physiological zones.

### **How to use it?**
1.  Complete the **Onboarding** flow upon first login.
2.  Connect **Strava** via the profile settings.
3.  Check the **Dashboard** daily to see what's on the schedule.

---

## Technical Enforcement
Permissions are enforced at three levels:
1.  **UI Level**: Conditional rendering hides buttons and pages not applicable to the user's role.
2.  **API Level**: Route Handlers use `requireRole('COACH')` or `requireRole('ADMIN')` helpers to block unauthorized requests.
3.  **Database Level**: **Supabase Row Level Security (RLS)** ensures that `SELECT` and `UPDATE` queries are scoped to the user's ID or their coach's ID, providing an absolute data boundary.
