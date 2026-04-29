# Coach Hub B2B Setup: First Steps

This document outlines the standard operating procedure (SOP) for onboarding a new Running Team (B2B client) to the Coach Hub platform.

## Phase 1: Platform Setup (Platform Owner)

As the platform owner, your responsibility is to initialize the new tenant. This process creates the Running Team and sets up the primary Head Coach (Admin).

1. **Run the Initialization Script**
   Open your terminal in the `frontend` directory and execute:
   ```bash
   npx tsx scripts/create-admin.ts
   ```
2. **Enter Head Coach Details**
   Provide the Head Coach's email, a secure temporary password, and their full name.
3. **Create the Running Team**
   When prompted to select a team, choose `0` to create a new Running Team, then type in the name of the client's club.
4. **Handoff**
   Securely send the Head Coach their temporary credentials and the platform login link (`https://coachhub.club/login`). Advise them to change their password upon their first login (if the feature is enabled) or instruct them to keep it secure.

---

## Phase 2: Building the Coaching Roster (Head Coach)

Once the Head Coach logs into Coach Hub, they act as the `ADMIN` for their Running Team. Their first task is to bring their assistant coaches onto the platform.

1. **Navigate to the Coaches Management Page**
   From the main sidebar navigation, the Head Coach should click on **Coaches**. *(Note: This page is only visible to Admins).*
2. **Invite Assistant Coaches**
   Click the **Invitar Coach** button in the top right corner.
3. **Send Invitations**
   Enter the email addresses of the assistant coaches. 
4. **Acceptance**
   The assistant coaches will receive an email containing an invitation link. When they click the link and register, Coach Hub will automatically:
   - Assign them to the correct Running Team.
   - Grant them the `COACH` role.
   - Create their Coach Profile.

---

## Phase 3: Inviting Athletes (Coaching Staff)

With the coaching staff established, the team can begin onboarding their athletes. Both Admins and standard Coaches can perform this step.

1. **Navigate to the Athletes Management Page**
   From the main sidebar navigation, click on **Athletes**.
2. **Invite Athletes**
   Click the **Invitar Atleta** button and enter the athlete's email address.
   - *If a regular Coach invites the athlete:* The athlete will automatically be assigned to that specific coach upon registration.
   - *If an Admin invites the athlete:* The athlete is added to the Running Team but may not be assigned a specific coach by default (depending on team workflow).
3. **Acceptance & Strava Sync**
   Athletes will receive an email link to sign up. Upon creating their account, they will be prompted to connect their Strava account so their activity data begins syncing to the Coach Hub matching engine.
4. **Training Assignment**
   Coaches can now begin assigning workouts to the newly onboarded athletes using the Training builder.
