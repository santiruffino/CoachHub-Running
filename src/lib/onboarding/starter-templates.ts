import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';

type StarterTemplate = {
  title: string;
  description: string;
  type: 'RUNNING' | 'STRENGTH';
  blocks: unknown[];
};

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    title: 'Base Endurance Builder',
    description: 'Starter aerobic run with controlled RPE for new coached athletes.',
    type: 'RUNNING',
    blocks: [
      { name: 'Warmup', duration: 10, intensity: 'easy' },
      { name: 'Main Set', duration: 30, intensity: 'moderate' },
      { name: 'Cooldown', duration: 10, intensity: 'easy' },
    ],
  },
  {
    title: 'Threshold Intervals Intro',
    description: 'Starter threshold session template with recoveries.',
    type: 'RUNNING',
    blocks: [
      { name: 'Warmup', duration: 12, intensity: 'easy' },
      { name: 'Intervals', repeats: 4, work: { duration: 5, intensity: 'threshold' }, rest: { duration: 2 } },
      { name: 'Cooldown', duration: 10, intensity: 'easy' },
    ],
  },
  {
    title: 'Strength Fundamentals',
    description: 'Starter strength routine for running support.',
    type: 'STRENGTH',
    blocks: [
      { name: 'Activation', duration: 8, intensity: 'easy' },
      { name: 'Circuit', rounds: 3, exercises: ['Squat', 'Lunge', 'Core', 'Hip hinge'] },
      { name: 'Mobility', duration: 8, intensity: 'easy' },
    ],
  },
];

export async function ensureCoachStarterTemplates(userId: string, teamId: string) {
  const supabase = createServiceRoleClient();

  try {
    const { data: existing, error: existingError } = await supabase
      .from('trainings')
      .select('id')
      .eq('created_by', userId)
      .eq('is_template', true)
      .limit(1);

    if (existingError) {
      appLogger.error('starter_templates.lookup_failed', { error: existingError, userId });
      return;
    }

    if ((existing || []).length > 0) {
      return;
    }

    const payload = STARTER_TEMPLATES.map((template) => ({
      title: template.title,
      description: template.description,
      type: template.type,
      blocks: template.blocks,
      is_template: true,
      created_by: userId,
      coach_id: userId,
      team_id: teamId,
    }));

    const { error } = await supabase.from('trainings').insert(payload);
    if (error) {
      appLogger.error('starter_templates.create_failed', { error, userId, teamId });
    }
  } catch (error) {
    appLogger.error('starter_templates.unhandled_error', { error, userId, teamId });
  }
}
