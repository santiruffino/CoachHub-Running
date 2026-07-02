# Endurix - Account Setup & Onboarding Guide

This guide outlines the step-by-step process for provisioning new teams and onboarding users (Admins, Coaches, and Athletes) to the platform.

---

## 1. Persona: Platform Owner (Santi)
**Goal:** Provision the initial "Admin" account for a new Running Team.

The platform owner is responsible for creating the "Super Coach" (Admin) who will own the Running Team.

### Steps:
1. **Run the Provisioning Script:**
   Use the administrative script to create the first user and the team entity.
   ```bash
   npx tsx scripts/create-admin.ts
   ```
2. **Follow the Prompts:**
   - **Admin email:** The email of the club owner/head coach.
   - **Password:** A temporary password (the user can change it later).
   - **Full name:** The name of the head coach.
   - **Running Team:** Select `0. Create a new Running Team` and enter the name of the club (e.g., "Endurix Racing Team").
3. **Notify the Admin:** 
   Share the login credentials and the platform URL with the new Team Admin.

---

## 2. Persona: Team Admin (Club Owner)
**Goal:** Configure the club and invite the staff/athletes.

The Team Admin has "Global" visibility over the entire team. They can act as a coach themselves or manage other coaches.

### Steps:
1. **Login:** Access the platform using the credentials provided by the Platform Owner.
2. **Complete Onboarding:** Fill in personal physiological data (HR zones, VAM, etc.) which serves as a template/reference.
3. **Invite Staff (Optional):**
   - Go to the **Coaches** section in the sidebar.
   - Click **Invite Coach**.
   - Enter the assistant coach's email. 
   - A unique invitation link will be generated. Copy and send it to them via WhatsApp/Email.
4. **Create Training Groups:**
   - Go to the **Groups** section.
   - Click **New Group** (e.g., "Marathon Group", "Beginners 5k").
   - Optionally link a **Target Race** to the group.
5. **Invite Athletes:** three options in **Add Athlete**:
   - Invite a single athlete by email.
   - Use **Bulk Upload (CSV)** to invite many at once.
   - Create a reusable **Team Invite Link** (share via WhatsApp/QR; athletes sign
     up at `/join/[token]` and join automatically). Manage/rotate/revoke links in
     **Settings → Team**.
   - Assign them to a specific coach (or yourself) and a group.
   - Note: the **athlete limit** (`max_athletes`, admin-only in Team settings)
     caps sign-ups across both email invites and team links.

---

## 3. Persona: Assistant Coach (Optional)
**Goal:** Manage assigned athletes and training plans.

Assistant coaches only see athletes assigned to them or athletes within their team scope (depending on configured permissions).

### Steps:
1. **Accept Invitation:** Click the link shared by the Team Admin.
2. **Create Account:** Set a name and password.
3. **Complete Onboarding:** Configure coach profile (Specialty, Bio, Experience) so athletes can see who is training them.
4. **Manage Athletes:** View assigned athletes in the **Athletes** list and start assigning workouts.

---

## 4. Persona: Athlete
**Goal:** Connect Strava, receive training, and provide feedback.

Athletes are the end-users executing the plans.

### Steps:
1. **Accept Invitation:** Click the link shared by the Coach/Admin.
2. **Create Account:** Set name and password.
3. **Complete Onboarding:** 
   - Enter physiological data (Crucial for correct pace/HR zone calculations).
   - Select experience level.
4. **Connect Strava (Recommended):**
   - Go to **Profile** -> **Integrations**.
   - Click **Connect with Strava**.
   - This allows the platform to automatically sync activities and calculate compliance scores.
5. **Start Training:** View the assigned workouts on the **Dashboard** weekly calendar.
6. **Provide Feedback:** After finishing a run (synced via Strava), click on the activity to rate the **RPE** (effort) and add comments for the coach.
7. **Stay in the loop:** Chat with your coach from the dashboard, and enable
   notifications (**Settings → Notifications**) to get in-app + push alerts for
   messages, assigned workouts, and race reminders.

---

## Summary of URL Formats
- **Main App:** `https://your-domain.com`
- **Login:** `/login`
- **Accept Invitation:** `/accept-invitation?token=[TOKEN]`
