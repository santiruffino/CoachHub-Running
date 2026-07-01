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