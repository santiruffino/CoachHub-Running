import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';

type AdminActionLogInput = {
  actorId: string;
  actorRole: 'ADMIN';
  teamId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function appendAdminActionLog(input: AdminActionLogInput): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('admin_action_logs').insert({
      actor_id: input.actorId,
      actor_role: input.actorRole,
      team_id: input.teamId,
      action: input.action,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      metadata: input.metadata || {},
    });

    if (error) {
      appLogger.error('admin_action_log.insert_failed', { error, action: input.action, actorId: input.actorId });
    }
  } catch (error) {
    appLogger.error('admin_action_log.unhandled_error', { error, action: input.action, actorId: input.actorId });
  }
}
