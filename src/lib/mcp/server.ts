import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAssignments, type ResolvedAssignment, type TrainingSnapshotSource } from "@/lib/trainings/assign";
import { resolveAthleteTargets } from "@/lib/trainings/expand-targets";
import { loadPlanWithItems, verifyTrainingsInTeam, insertPlanItems, type PlanItemInput } from "@/lib/trainings/plans";
import { planItemDate } from "@/lib/trainings/plan-dates";
import { createNotification } from "@/lib/notifications/create-notification";

/**
 * Endurix Running MCP Server
 * Exposes tools for coaches to interact with athlete data via AI.
 */
export const mcpServer = new McpServer({
  name: "Endurix",
  version: "1.0.0",
});

/**
 * Helper to calculate compliance for a set of athletes
 */
async function calculateCompliance(athleteIds: string[], days: number) {
  const supabase = await createClient();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const { data: assignments, error } = await supabase
    .from('training_assignments')
    .select('user_id, completed')
    .in('user_id', athleteIds)
    .gte('scheduled_date', startDate.toISOString())
    .lte('scheduled_date', endDate.toISOString());

  if (error) throw new Error(error.message);

  return athleteIds.map(id => {
    const athleteAssignments = assignments?.filter(a => a.user_id === id) || [];
    const total = athleteAssignments.length;
    const completed = athleteAssignments.filter(a => a.completed).length;
    return {
      athleteId: id,
      total,
      completed,
      rate: total > 0 ? (completed / total) * 100 : 0
    };
  });
}

/**
 * Resolve the authenticated coach's identity + team. Every write tool locks its
 * rows to this team, mirroring the `requireRole('COACH')` + `team_id` checks the
 * REST routes perform. Throws on missing auth or team so callers surface a clear
 * error string.
 */
async function requireCoachContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string; teamId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single();

  if (!profile?.team_id) throw new Error("Coach has no team assigned.");
  return { userId: user.id, teamId: profile.team_id };
}

// Tool: get_coach_profile
mcpServer.tool(
  "get_coach_profile",
  {},
  async () => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw new Error(error.message);

      return {
        content: [{ type: "text", text: `You are logged in as Coach: ${profile.name} (${profile.email}). Team ID: ${profile.team_id}` }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: list_coach_athletes
mcpServer.tool(
  "list_coach_athletes",
  {},
  async () => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // Get coach profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (!profile?.team_id) return { content: [{ type: "text", text: "Coach has no team assigned." }] };

      // Get athletes in the same team
      const { data: athletes, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('team_id', profile.team_id)
        .eq('role', 'ATHLETE');

      if (error) throw new Error(error.message);

      if (!athletes || athletes.length === 0) {
        return { content: [{ type: "text", text: "No athletes found in your team." }] };
      }

      const list = athletes.map(a => `- ${a.name} (${a.email}): ID=${a.id}`).join('\n');
      return {
        content: [{ type: "text", text: `Your athletes:\n${list}` }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: list_coach_groups
mcpServer.tool(
  "list_coach_groups",
  {},
  async () => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('coach_id', user.id);

      if (error) throw new Error(error.message);

      if (!groups || groups.length === 0) {
        return { content: [{ type: "text", text: "No groups found." }] };
      }

      const list = groups.map(g => `- ${g.name}: ID=${g.id}`).join('\n');
      return {
        content: [{ type: "text", text: `Your groups:\n${list}` }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_athlete_compliance
mcpServer.tool(
  "get_athlete_compliance",
  {
    athleteId: z.string().describe("The UUID of the athlete"),
    days: z.number().optional().default(30).describe("Number of days to look back (default 30)"),
  },
  async ({ athleteId, days }) => {
    try {
      const stats = await calculateCompliance([athleteId], days);
      const s = stats[0];
      return {
        content: [
          {
            type: "text",
            text: `Athlete ${athleteId} compliance over last ${days} days: ${s.completed}/${s.total} workouts completed (${s.rate.toFixed(1)}%).`,
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_group_compliance
mcpServer.tool(
  "get_group_compliance",
  {
    groupId: z.string().describe("The UUID of the group"),
    days: z.number().optional().default(30).describe("Number of days to look back (default 30)"),
  },
  async ({ groupId, days }) => {
    try {
      const supabase = await createClient();
      const { data: members, error: membersError } = await supabase
        .from('athlete_groups')
        .select('athlete_id')
        .eq('group_id', groupId);

      if (membersError) throw new Error(membersError.message);

      const athleteIds = members?.map(m => m.athlete_id) || [];
      if (athleteIds.length === 0) {
        return { content: [{ type: "text", text: "Group has no members." }] };
      }

      const stats = await calculateCompliance(athleteIds, days);
      const totalWorkouts = stats.reduce((acc, s) => acc + s.total, 0);
      const completedWorkouts = stats.reduce((acc, s) => acc + s.completed, 0);
      const avgRate = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

      return {
        content: [
          {
            type: "text",
            text: `Group ${groupId} compliance over last ${days} days: ${completedWorkouts}/${totalWorkouts} total workouts completed across ${athleteIds.length} athletes (${avgRate.toFixed(1)}% average).`,
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_upcoming_races
mcpServer.tool(
  "get_upcoming_races",
  {
    athleteId: z.string().optional().describe("Filter by athlete UUID"),
    groupId: z.string().optional().describe("Filter by group UUID"),
    days: z.number().optional().default(90).describe("Number of days to look ahead (default 90)"),
  },
  async ({ athleteId, groupId, days }) => {
    try {
      const supabase = await createClient();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      const todayStr = new Date().toISOString();

      let targetAthleteIds: string[] = [];

      if (athleteId) {
        targetAthleteIds = [athleteId];
      } else if (groupId) {
        const { data: members, error: membersError } = await supabase
          .from('athlete_groups')
          .select('athlete_id')
          .eq('group_id', groupId);
        if (membersError) throw new Error(membersError.message);
        targetAthleteIds = members?.map(m => m.athlete_id) || [];
      }

      if (targetAthleteIds.length === 0) {
        return { content: [{ type: "text", text: "No athletes specified or found." }] };
      }

      const { data: races, error: racesError } = await supabase
        .from('athlete_races')
        .select('athlete_id, date, priority, status, name_override')
        .in('athlete_id', targetAthleteIds)
        .gte('date', todayStr)
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true });

      if (racesError) throw new Error(racesError.message);

      if (!races || races.length === 0) {
        return { content: [{ type: "text", text: "No upcoming races found." }] };
      }

      const raceList = races.map(r => {
        const name = r.name_override || "Upcoming Race";
        return `- ${r.date}: ${name} (Priority: ${r.priority}, Athlete: ${r.athlete_id})`;
      }).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `Upcoming races for next ${days} days:\n${raceList}`,
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: create_training
mcpServer.tool(
  "create_training",
  {
    title: z.string().describe("The title of the training template"),
    type: z
      .enum(["RUNNING", "STRENGTH", "CYCLING", "SWIMMING", "OTHER"])
      .default("RUNNING")
      .describe("The training discipline"),
    description: z.string().optional().describe("Optional description / coach notes"),
    blocks: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe("Optional workout structure as an array of block objects"),
    isTemplate: z
      .boolean()
      .default(true)
      .describe("Save as a reusable template shown in the library (true) or a one-off workout (false)"),
  },
  async ({ title, type, description, blocks, isTemplate }) => {
    try {
      const supabase = await createClient();
      const { userId, teamId } = await requireCoachContext(supabase);

      const { data: training, error } = await supabase
        .from('trainings')
        .insert({
          title,
          description: description ?? null,
          type,
          blocks: blocks ?? [],
          is_template: isTemplate,
          coach_id: userId,
          created_by: userId,
          team_id: teamId,
        })
        .select('id, title, type')
        .single();

      if (error) throw new Error(error.message);

      const kind = isTemplate ? 'template' : 'one-off workout';
      return {
        content: [{ type: "text", text: `Created training ${kind} "${training.title}" (${training.type}): ID=${training.id}. Use it with an assignment tool to schedule it for an athlete.` }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: assign_training
mcpServer.tool(
  "assign_training",
  {
    trainingId: z.string().describe("The UUID of the training template to assign"),
    scheduledDate: z.string().describe("The date to schedule the workout for (ISO date, e.g. 2026-07-20)"),
    athleteIds: z.array(z.string()).optional().describe("Athlete UUIDs to assign directly"),
    groupIds: z.array(z.string()).optional().describe("Group UUIDs whose members should be assigned"),
    expectedRpe: z.number().min(1).max(10).optional().describe("Expected RPE for this workout (1-10)"),
    workoutName: z.string().optional().describe("Custom name for this specific assignment"),
  },
  async ({ trainingId, scheduledDate, athleteIds, groupIds, expectedRpe, workoutName }) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (!profile?.team_id) throw new Error("Coach has no team assigned.");
      const teamId = profile.team_id;

      // Verify the template exists and belongs to the coach's team.
      const { data: training, error: trainingError } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', trainingId)
        .single();

      if (trainingError || !training) throw new Error("Training not found.");
      if (training.team_id !== teamId) throw new Error("Training does not belong to your team.");

      // Expand athletes/groups into the unique set of target athletes.
      const { targets, error: targetError } = await resolveAthleteTargets(supabase, {
        teamId,
        athleteIds,
        groupIds,
      });

      if (targetError) throw new Error("One or more groups were not found in your team.");
      if (targets.size === 0) throw new Error("No athletes found to assign the training to.");

      const entries: ResolvedAssignment[] = Array.from(targets.entries()).map(([userId, sourceGroupId]) => ({
        userId,
        training,
        scheduledDate,
        sourceGroupId,
        workoutName: workoutName || null,
        expectedRpe: expectedRpe ?? null,
      }));

      const result = await createAssignments(supabase, { teamId, entries, notify: 'per-workout' });

      return {
        content: [{ type: "text", text: `Assigned "${training.title}" to ${result.assignments.length} athlete(s) on ${scheduledDate}.` }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: list_trainings — discover template IDs to reference in plans/assignments
mcpServer.tool(
  "list_trainings",
  {},
  async () => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const { data: trainings, error } = await supabase
        .from('trainings')
        .select('id, title, type')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      if (!trainings || trainings.length === 0) {
        return { content: [{ type: "text", text: "No training templates found." }] };
      }

      const list = trainings.map(t => `- ${t.title} (${t.type}): ID=${t.id}`).join('\n');
      return { content: [{ type: "text", text: `Your training templates:\n${list}` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: update_training
mcpServer.tool(
  "update_training",
  {
    trainingId: z.string().describe("The UUID of the training template to update"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    type: z.enum(["RUNNING", "STRENGTH", "CYCLING", "SWIMMING", "OTHER"]).optional().describe("New discipline"),
    blocks: z.array(z.record(z.string(), z.unknown())).optional().describe("New workout structure"),
    expectedRpe: z.number().min(1).max(10).optional().describe("New global expected RPE (1-10)"),
  },
  async ({ trainingId, title, description, type, blocks, expectedRpe }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      // Ownership check.
      const { data: existing } = await supabase
        .from('trainings')
        .select('id, team_id')
        .eq('id', trainingId)
        .maybeSingle();
      if (!existing || existing.team_id !== teamId) throw new Error("Training not found.");

      const patch: Record<string, unknown> = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (type !== undefined) patch.type = type;
      if (blocks !== undefined) patch.blocks = blocks;
      if (expectedRpe !== undefined) patch.expected_rpe = expectedRpe;

      if (Object.keys(patch).length === 0) {
        return { content: [{ type: "text", text: "Nothing to update." }] };
      }

      const { data: training, error } = await supabase
        .from('trainings')
        .update(patch)
        .eq('id', trainingId)
        .select('id, title, type')
        .single();

      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Updated training "${training.title}" (${training.type}).` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: delete_training
mcpServer.tool(
  "delete_training",
  {
    trainingId: z.string().describe("The UUID of the training template to delete"),
  },
  async ({ trainingId }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const { data: existing } = await supabase
        .from('trainings')
        .select('id, team_id, title')
        .eq('id', trainingId)
        .maybeSingle();
      if (!existing || existing.team_id !== teamId) throw new Error("Training not found.");

      const { error } = await supabase.from('trainings').delete().eq('id', trainingId);
      if (error) throw new Error(error.message);

      return { content: [{ type: "text", text: `Deleted training "${existing.title}".` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: list_plans — mesocycles for the coach's team
mcpServer.tool(
  "list_plans",
  {},
  async () => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const { data: plans, error } = await supabase
        .from('training_plans')
        .select('id, name, type, duration_weeks, focus, training_plan_items(count)')
        .eq('team_id', teamId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw new Error(error.message);
      if (!plans || plans.length === 0) {
        return { content: [{ type: "text", text: "No plans (mesocycles) found." }] };
      }

      const list = plans.map(p => {
        const count = Array.isArray(p.training_plan_items) ? (p.training_plan_items[0]?.count ?? 0) : 0;
        return `- ${p.name} (${p.type}, ${p.duration_weeks}w, ${count} sessions${p.focus ? `, focus: ${p.focus}` : ''}): ID=${p.id}`;
      }).join('\n');
      return { content: [{ type: "text", text: `Your plans (mesocycles):\n${list}` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: get_plan — full plan detail with its scheduled items
mcpServer.tool(
  "get_plan",
  {
    planId: z.string().describe("The UUID of the plan (mesocycle)"),
  },
  async ({ planId }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const plan = await loadPlanWithItems(supabase, planId, teamId);
      if (!plan) throw new Error("Plan not found.");

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const items = (plan.items as Array<Record<string, unknown>> | undefined) || [];
      const itemLines = items
        .slice()
        .sort((a, b) =>
          (a.week_index as number) - (b.week_index as number) ||
          (a.day_of_week as number) - (b.day_of_week as number) ||
          (a.sort_order as number) - (b.sort_order as number))
        .map((i) => {
          const training = i.training as { title?: string } | null;
          const name = (i.workout_name as string) || training?.title || 'Workout';
          return `  W${(i.week_index as number) + 1} ${days[i.day_of_week as number]}: ${name}`;
        }).join('\n');

      const header = `Plan "${plan.name}" (${plan.type}, ${plan.duration_weeks} weeks, ${items.length} sessions)`;
      return { content: [{ type: "text", text: itemLines ? `${header}\n${itemLines}` : `${header}\n  (no items yet)` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// A plan item slot (references a template, positioned by week + day).
const planItemShape = z.object({
  trainingId: z.string().describe("Template UUID for this slot"),
  weekIndex: z.number().int().min(0).max(51).describe("0-based week number"),
  dayOfWeek: z.number().int().min(0).max(6).describe("0 = Monday ... 6 = Sunday"),
  workoutName: z.string().optional().describe("Optional custom name for this slot"),
  expectedRpe: z.number().int().min(1).max(10).optional().describe("Optional expected RPE (1-10)"),
});

// Tool: create_plan — a mesocycle template with optional weekly sessions
mcpServer.tool(
  "create_plan",
  {
    name: z.string().describe("Name of the plan / mesocycle"),
    durationWeeks: z.number().int().min(1).max(52).describe("Length of the plan in weeks"),
    type: z.enum(["RUNNING", "STRENGTH", "CYCLING", "SWIMMING", "OTHER"]).default("RUNNING").describe("Discipline"),
    description: z.string().optional().describe("Optional description"),
    focus: z.string().optional().describe("Optional focus, e.g. 'Base', 'Build', 'Peak'"),
    items: z.array(planItemShape).max(500).optional().describe("Optional scheduled sessions referencing your templates"),
  },
  async ({ name, durationWeeks, type, description, focus, items }) => {
    try {
      const supabase = await createClient();
      const { userId, teamId } = await requireCoachContext(supabase);

      const planItems = items || [];
      const trainingsOk = await verifyTrainingsInTeam(supabase, teamId, planItems.map(i => i.trainingId));
      if (!trainingsOk) throw new Error("One or more referenced templates were not found in your team.");

      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          name,
          description: description ?? null,
          type,
          duration_weeks: durationWeeks,
          focus: focus ?? null,
          coach_id: userId,
          created_by: userId,
          team_id: teamId,
        })
        .select('id, name')
        .single();

      if (planError || !plan) throw new Error(planError?.message || "Failed to create plan.");

      if (planItems.length > 0) {
        const { error: itemsError } = await insertPlanItems(supabase, plan.id, planItems as PlanItemInput[]);
        if (itemsError) {
          // Roll back so we don't leave an empty shell behind.
          await supabase.from('training_plans').delete().eq('id', plan.id);
          throw new Error(itemsError.message);
        }
      }

      return { content: [{ type: "text", text: `Created plan "${plan.name}" (${planItems.length} session(s)): ID=${plan.id}. Apply it with apply_plan.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: update_plan — patch metadata and/or fully replace items
mcpServer.tool(
  "update_plan",
  {
    planId: z.string().describe("The UUID of the plan to update"),
    name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
    type: z.enum(["RUNNING", "STRENGTH", "CYCLING", "SWIMMING", "OTHER"]).optional().describe("New discipline"),
    durationWeeks: z.number().int().min(1).max(52).optional().describe("New length in weeks"),
    focus: z.string().optional().describe("New focus"),
    items: z.array(planItemShape).max(500).optional().describe("When provided, REPLACES all existing sessions"),
  },
  async ({ planId, name, description, type, durationWeeks, focus, items }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const { data: existing } = await supabase
        .from('training_plans')
        .select('id, team_id')
        .eq('id', planId)
        .maybeSingle();
      if (!existing || existing.team_id !== teamId) throw new Error("Plan not found.");

      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name;
      if (description !== undefined) patch.description = description;
      if (type !== undefined) patch.type = type;
      if (durationWeeks !== undefined) patch.duration_weeks = durationWeeks;
      if (focus !== undefined) patch.focus = focus;

      if (Object.keys(patch).length > 0) {
        const { error: updateError } = await supabase.from('training_plans').update(patch).eq('id', planId);
        if (updateError) throw new Error(updateError.message);
      }

      // When items are provided, fully replace them (delete-then-insert).
      if (items !== undefined) {
        const trainingsOk = await verifyTrainingsInTeam(supabase, teamId, items.map(i => i.trainingId));
        if (!trainingsOk) throw new Error("One or more referenced templates were not found in your team.");

        const { error: deleteError } = await supabase.from('training_plan_items').delete().eq('plan_id', planId);
        if (deleteError) throw new Error(deleteError.message);

        const { error: itemsError } = await insertPlanItems(supabase, planId, items as PlanItemInput[]);
        if (itemsError) throw new Error(itemsError.message);
      }

      return { content: [{ type: "text", text: `Updated plan ${planId}${items !== undefined ? ` (${items.length} session(s))` : ''}.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: apply_plan — materialize a plan onto athletes/groups from a start date
mcpServer.tool(
  "apply_plan",
  {
    planId: z.string().describe("The UUID of the plan to apply"),
    startDate: z.string().describe("Start date (ISO, e.g. 2026-07-20); anchored to the Monday of that week"),
    athleteIds: z.array(z.string()).optional().describe("Athlete UUIDs to apply the plan to"),
    groupIds: z.array(z.string()).optional().describe("Group UUIDs whose members get the plan"),
    weekIndexes: z.array(z.number().int().min(0).max(51)).optional().describe("Optional subset of 0-based weeks to apply (default: all)"),
  },
  async ({ planId, startDate, athleteIds, groupIds, weekIndexes }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const plan = await loadPlanWithItems(supabase, planId, teamId);
      if (!plan) throw new Error("Plan not found.");

      const allItems = (plan.items as Array<{
        week_index: number; day_of_week: number; workout_name: string | null;
        expected_rpe: number | null; blocks: unknown | null; training: TrainingSnapshotSource | null;
      }>) || [];
      const weekFilter = weekIndexes && weekIndexes.length > 0 ? new Set(weekIndexes) : null;
      const items = allItems.filter(i => i.training && (!weekFilter || weekFilter.has(i.week_index)));
      if (items.length === 0) throw new Error("Plan has no items to apply (for the selected weeks).");

      const { targets, error: targetError } = await resolveAthleteTargets(supabase, { teamId, athleteIds, groupIds });
      if (targetError) throw new Error("One or more groups were not found in your team.");
      if (targets.size === 0) throw new Error("No athletes found to apply the plan to.");

      const entries: ResolvedAssignment[] = [];
      for (const [userId, sourceGroupId] of targets.entries()) {
        for (const item of items) {
          // Per-slot blocks override wins over the template's structure.
          const training: TrainingSnapshotSource =
            item.blocks != null ? { ...item.training!, blocks: item.blocks } : item.training!;
          entries.push({
            userId,
            training,
            scheduledDate: planItemDate(startDate, item.week_index, item.day_of_week),
            sourceGroupId,
            workoutName: item.workout_name,
            expectedRpe: item.expected_rpe,
          });
        }
      }

      // Suppress per-workout notifications; send one summary per athlete instead.
      const result = await createAssignments(supabase, { teamId, entries, notify: 'none' });

      const planName = (plan.name as string) || 'Plan';
      const sessionsPerAthlete = items.length;
      await Promise.all(
        result.affectedAthleteIds.map(athleteId =>
          createNotification({
            userId: athleteId,
            category: 'workout_assigned',
            title: `Plan "${planName}" asignado`,
            body: `${sessionsPerAthlete} ${sessionsPerAthlete === 1 ? 'sesión programada' : 'sesiones programadas'}`,
            link: '/dashboard',
          }),
        ),
      );

      return { content: [{ type: "text", text: `Applied "${planName}": ${result.assignments.length} assignment(s) across ${result.affectedAthleteIds.length} athlete(s), starting ${startDate}.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: duplicate_plan
mcpServer.tool(
  "duplicate_plan",
  {
    planId: z.string().describe("The UUID of the plan to duplicate"),
  },
  async ({ planId }) => {
    try {
      const supabase = await createClient();
      const { userId, teamId } = await requireCoachContext(supabase);

      const plan = await loadPlanWithItems(supabase, planId, teamId);
      if (!plan) throw new Error("Plan not found.");

      const { data: copy, error: createError } = await supabase
        .from('training_plans')
        .insert({
          name: `${plan.name} (copia)`,
          description: (plan.description as string | null) ?? null,
          type: (plan.type as string | null) ?? 'RUNNING',
          duration_weeks: (plan.duration_weeks as number | null) ?? 1,
          focus: (plan.focus as string | null) ?? null,
          coach_id: userId,
          created_by: userId,
          team_id: teamId,
        })
        .select('id, name')
        .single();

      if (createError || !copy) throw new Error(createError?.message || "Failed to duplicate plan.");

      const items = (plan.items as Array<{
        training_id: string; week_index: number; day_of_week: number;
        workout_name: string | null; expected_rpe: number | null; sort_order: number; blocks: unknown[] | null;
      }>) || [];
      if (items.length > 0) {
        const cloned: PlanItemInput[] = items.map(i => ({
          trainingId: i.training_id,
          weekIndex: i.week_index,
          dayOfWeek: i.day_of_week,
          workoutName: i.workout_name,
          expectedRpe: i.expected_rpe,
          sortOrder: i.sort_order,
          blocks: i.blocks,
        }));
        const { error: itemsError } = await insertPlanItems(supabase, copy.id, cloned);
        if (itemsError) {
          await supabase.from('training_plans').delete().eq('id', copy.id);
          throw new Error(itemsError.message);
        }
      }

      return { content: [{ type: "text", text: `Duplicated plan as "${copy.name}": ID=${copy.id}.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: delete_plan — soft-archives the plan (assignments keep their meaning)
mcpServer.tool(
  "delete_plan",
  {
    planId: z.string().describe("The UUID of the plan to archive"),
  },
  async ({ planId }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      const { data: existing } = await supabase
        .from('training_plans')
        .select('id, team_id, name')
        .eq('id', planId)
        .maybeSingle();
      if (!existing || existing.team_id !== teamId) throw new Error("Plan not found.");

      const { error } = await supabase.from('training_plans').update({ is_archived: true }).eq('id', planId);
      if (error) throw new Error(error.message);

      return { content: [{ type: "text", text: `Archived plan "${existing.name}".` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: create_group
mcpServer.tool(
  "create_group",
  {
    name: z.string().describe("Name of the group"),
    description: z.string().optional().describe("Optional description"),
    groupType: z.enum(["REGULAR", "RACE"]).default("REGULAR").describe("Group type"),
  },
  async ({ name, description, groupType }) => {
    try {
      const supabase = await createClient();
      const { userId, teamId } = await requireCoachContext(supabase);

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name,
          description: description ?? null,
          group_type: groupType,
          created_by: userId,
          team_id: teamId,
        })
        .select('id, name')
        .single();

      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Created group "${group.name}": ID=${group.id}. Add athletes with add_athlete_to_group.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: add_athlete_to_group
mcpServer.tool(
  "add_athlete_to_group",
  {
    groupId: z.string().describe("The UUID of the group"),
    athleteId: z.string().describe("The UUID of the athlete to add"),
  },
  async ({ groupId, athleteId }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      // Group must belong to the coach's team.
      const { data: group } = await supabase
        .from('groups')
        .select('id, team_id')
        .eq('id', groupId)
        .maybeSingle();
      if (!group || group.team_id !== teamId) throw new Error("Group not found.");

      // Target must be an athlete on the same team.
      const { data: athlete } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', athleteId)
        .maybeSingle();
      if (!athlete || athlete.team_id !== teamId) throw new Error("Athlete not found in your team.");
      if (athlete.role !== 'ATHLETE') throw new Error("Target user is not an athlete.");

      const { data: existing } = await supabase
        .from('athlete_groups')
        .select('id')
        .eq('group_id', groupId)
        .eq('athlete_id', athleteId)
        .maybeSingle();
      if (existing) throw new Error("Athlete is already a member of this group.");

      const { error } = await supabase
        .from('athlete_groups')
        .insert({ group_id: groupId, athlete_id: athleteId });
      if (error) throw new Error(error.message);

      return { content: [{ type: "text", text: `Added athlete ${athleteId} to group ${groupId}.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: create_race
mcpServer.tool(
  "create_race",
  {
    name: z.string().describe("Name of the race"),
    date: z.string().optional().describe("Race date (ISO date, e.g. 2026-10-05)"),
    distance: z.string().optional().describe("Distance as text, e.g. '10km', '21.1km', 'Marathon'"),
    location: z.string().optional().describe("Race location"),
    elevationGain: z.number().int().optional().describe("Elevation gain in meters"),
    description: z.string().optional().describe("Optional description"),
  },
  async ({ name, date, distance, location, elevationGain, description }) => {
    try {
      const supabase = await createClient();
      const { userId } = await requireCoachContext(supabase);

      const { data: race, error } = await supabase
        .from('races')
        .insert({
          name,
          description: description ?? null,
          distance: distance ?? null,
          date: date ?? null,
          elevation_gain: elevationGain ?? null,
          location: location ?? null,
          coach_id: userId,
          // team_id intentionally null: DB migration bug references groups(id).
          team_id: null,
        })
        .select('id, name')
        .single();

      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Created race "${race.name}": ID=${race.id}.` }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// Tool: notify_athlete
mcpServer.tool(
  "notify_athlete",
  {
    athleteId: z.string().describe("The UUID of the athlete to notify"),
    message: z.string().describe("The feedback message to send"),
    title: z.string().optional().describe("Optional notification title (defaults to 'Mensaje de tu entrenador')"),
  },
  async ({ athleteId, message, title }) => {
    try {
      const supabase = await createClient();
      const { teamId } = await requireCoachContext(supabase);

      // createNotification uses the service-role client (bypasses RLS), so verify
      // the target athlete belongs to the coach's team before sending.
      const { data: athlete } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', athleteId)
        .maybeSingle();
      if (!athlete || athlete.team_id !== teamId) throw new Error("Athlete not found in your team.");
      if (athlete.role !== 'ATHLETE') throw new Error("Target user is not an athlete.");

      // Deliver through the canonical notification pipeline so it reaches the
      // athlete's in-app feed and Web Push (respecting their preferences).
      await createNotification({
        userId: athleteId,
        category: 'system',
        title: title || 'Mensaje de tu entrenador',
        body: message,
        link: '/dashboard',
      });

      return {
        content: [{ type: "text", text: `Notification delivered to athlete ${athleteId}.` }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);
