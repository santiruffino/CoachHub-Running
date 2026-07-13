import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'New password must be at least 12 characters'),
});

export const wishlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['head_coach', 'assistant_coach', 'other'], { message: 'Invalid role' }),
  teamSize: z.enum(['1_5', '6_15', '16_30', '30_plus'], { message: 'Invalid team size' }),
  locale: z.string().max(8).optional().nullable(),
});

export const acceptInviteSchema = z.object({
  email: z.string().email('A valid email is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  coach_id: z.string().uuid('Invalid coach ID').nullable().optional(),
});

export const createTrainingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(5000).optional(),
  date: z.string().datetime({ offset: true }),
  duration: z.number().int().positive().optional(),
  distance: z.number().positive().optional(),
  type: z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'OTHER']),
  zones: z.array(z.object({
    zone: z.number().int().min(1).max(7),
    duration: z.number().int().positive(),
  })).optional(),
});

export const assignTrainingSchema = z.object({
  trainingId: z.string().uuid('Invalid training ID'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  athleteIds: z.array(z.string().uuid('Invalid athlete ID')).optional(),
  groupIds: z.array(z.string().uuid('Invalid group ID')).optional(),
  expectedRpe: z.number().int().min(1).max(10).optional(),
  workoutName: z.string().max(255).optional(),
}).refine(
  (data) => (data.athleteIds && data.athleteIds.length > 0) || (data.groupIds && data.groupIds.length > 0),
  { message: 'At least one athleteId or groupId is required', path: ['athleteIds'] }
);

const planItemSchema = z.object({
  trainingId: z.string().uuid('Invalid training ID'),
  weekIndex: z.number().int().min(0).max(51),
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Monday ... 6 = Sunday
  workoutName: z.string().max(255).nullable().optional(),
  expectedRpe: z.number().int().min(1).max(10).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  // Optional per-slot structure override. Block internals are validated at the
  // builder layer (same as trainings), so accept an array of objects here.
  blocks: z.array(z.record(z.string(), z.unknown())).max(200).nullable().optional(),
});

const planTypeEnum = z.enum(['RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'OTHER']);

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(5000).nullable().optional(),
  type: planTypeEnum.optional(),
  durationWeeks: z.number().int().min(1).max(52),
  focus: z.string().max(255).nullable().optional(),
  items: z.array(planItemSchema).max(500).optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: planTypeEnum.optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  focus: z.string().max(255).nullable().optional(),
  // When provided, fully replaces the plan's items.
  items: z.array(planItemSchema).max(500).optional(),
});

export const applyPlanSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  athleteIds: z.array(z.string().uuid('Invalid athlete ID')).optional(),
  groupIds: z.array(z.string().uuid('Invalid group ID')).optional(),
  weekIndexes: z.array(z.number().int().min(0).max(51)).optional(),
}).refine(
  (data) => (data.athleteIds && data.athleteIds.length > 0) || (data.groupIds && data.groupIds.length > 0),
  { message: 'At least one athleteId or groupId is required', path: ['athleteIds'] }
);

export const copyWeekSchema = z.object({
  sourceUserId: z.string().uuid('Invalid source athlete ID'),
  sourceWeekStart: z.string().min(1, 'Source week start is required'),
  targetWeekStart: z.string().min(1, 'Target week start is required'),
  targetAthleteIds: z.array(z.string().uuid('Invalid athlete ID')).optional(),
  targetGroupIds: z.array(z.string().uuid('Invalid group ID')).optional(),
}).refine(
  (data) => (data.targetAthleteIds && data.targetAthleteIds.length > 0) || (data.targetGroupIds && data.targetGroupIds.length > 0),
  { message: 'At least one target athleteId or groupId is required', path: ['targetAthleteIds'] }
);

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  isOnboardingCompleted: z.boolean().optional(),
  // Coach-specific fields
  bio: z.string().max(2000).optional(),
  specialty: z.string().max(255).optional(),
  experience: z.union([z.string(), z.number()]).optional(),
  // Athlete-specific fields (accept both camelCase and snake_case, as the route does)
  height: z.union([z.string(), z.number()]).nullable().optional(),
  weight: z.union([z.string(), z.number()]).nullable().optional(),
  injuries: z.string().max(2000).nullable().optional(),
  rest_hr: z.union([z.string(), z.number()]).nullable().optional(),
  restHR: z.union([z.string(), z.number()]).nullable().optional(),
  max_hr: z.union([z.string(), z.number()]).nullable().optional(),
  maxHR: z.union([z.string(), z.number()]).nullable().optional(),
  lthr: z.union([z.string(), z.number()]).nullable().optional(),
  vam: z.union([z.string(), z.number()]).nullable().optional(),
  uan: z.union([z.string(), z.number()]).nullable().optional(),
  ftp: z.union([z.string(), z.number()]).nullable().optional(),
  dob: z.string().nullable().optional(),
  hrZones: z.unknown().optional(),
}).strict();

export const stravaWebhookSchema = z.object({
  subscription_id: z.number().int().positive().optional(),
  object_type: z.enum(['activity', 'athlete']),
  object_id: z.number().int().positive(),
  aspect_type: z.enum(['create', 'update', 'delete']),
  owner_id: z.number().int().positive(),
  updates: z.record(z.string(), z.unknown()).optional(),
});

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T | null; error: z.ZodError | null } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { data: null, error: result.error };
  }
  return { data: result.data, error: null };
}