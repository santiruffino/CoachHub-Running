import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw new Error(membersError.message);
      
      const athleteIds = members?.map(m => m.user_id) || [];
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
          .select('user_id')
          .eq('group_id', groupId);
        if (membersError) throw new Error(membersError.message);
        targetAthleteIds = members?.map(m => m.user_id) || [];
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

// Tool: notify_athlete
mcpServer.tool(
  "notify_athlete",
  {
    athleteId: z.string().describe("The UUID of the athlete to notify"),
    message: z.string().describe("The feedback message to send"),
  },
  async ({ athleteId, message }) => {
    try {
      const supabase = await createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // Fetch team_id from profile to ensure it's set
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('alerts')
        .insert({
          athlete_id: athleteId,
          team_id: profile?.team_id,
          type: 'coach_feedback',
          message: message,
          status: 'OPEN',
          priority: 'P2',
        });

      if (error) throw new Error(error.message);

      return {
        content: [{ type: "text", text: `Successfully sent notification to athlete ${athleteId}.` }],
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
