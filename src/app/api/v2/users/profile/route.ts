import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { normalizeOptionalNumber } from '@/features/profiles/utils/normalizeOptionalNumber';
import { updateProfileSchema, validateBody } from '@/lib/validation/schemas';
import { reportApiError } from '@/lib/api/report-error';
import { recordTestMetricHistory } from '@/lib/athlete/metric-history';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET(request: Request) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/profile', request);
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED'),
        { status: 401 }
      );
    }

    // Get user profile with related data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        coach_profile:coach_profiles(*),
        athlete_profile:athlete_profiles(*)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(apiError('FAILED_TO_FETCH_PROFILE'),
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend
    // Note: Supabase returns related data as arrays
    const profileRecord = profile as Record<string, unknown>;
    const coachProfileRaw = profileRecord.coach_profile;
    const athleteProfileRaw = profileRecord.athlete_profile;

    const coachProfileData = Array.isArray(coachProfileRaw)
      ? coachProfileRaw[0]
      : coachProfileRaw;

    const athleteProfileData = Array.isArray(athleteProfileRaw)
      ? athleteProfileRaw[0]
      : athleteProfileRaw;

    const athleteProfileRecord = isRecord(athleteProfileData) ? athleteProfileData : null;
    const { coach_profile: unusedCoachProfileSnake, athlete_profile: unusedAthleteProfileSnake, ...profileWithoutSnake } = profileRecord;
    void unusedCoachProfileSnake;
    void unusedAthleteProfileSnake;

    // Fetch the athlete's VAM/UAN test history. `athlete_metrics` has RLS enabled with
    // no policies, so it must be read with the service-role client.
    let metricsHistory: unknown[] = [];
    const athleteProfileId = athleteProfileRecord?.id;
    if (typeof athleteProfileId === 'string') {
      const { data: metricsData } = await createServiceRoleClient()
        .from('athlete_metrics')
        .select('id, type, value, date, created_at')
        .eq('athlete_profile_id', athleteProfileId)
        .order('date', { ascending: false })
        .limit(20);
      metricsHistory = metricsData ?? [];
    }

    const transformProfile = (p: Record<string, unknown>, cp: unknown, ap: Record<string, unknown> | null) => ({
      ...p,
      firstName: p.first_name,
      lastName: p.last_name,
      isOnboardingCompleted: p.is_onboarding_completed,
      mustChangePassword: p.must_change_password,
      coachProfile: cp || null,
      athleteProfile: ap ? {
        ...ap,
        restHR: ap.rest_hr,
        maxHR: ap.max_hr,
        lthr: ap.lthr,
        hrZones: ap.hr_zones,
        ftp: ap.ftp,
        metricsHistory,
      } : null,
    });

    return NextResponse.json(transformProfile(profileWithoutSnake, coachProfileData, athleteProfileRecord));
    } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/users/profile', method: 'GET', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
      { status: 500 }
    );
    }
    }

    export async function PATCH(request: Request) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/profile', request);
    try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const rawBody = await request.json();
    const { data: body, error: validationError } = validateBody(updateProfileSchema, rawBody);

    if (validationError || !body) {
      logger.warn('Profile update validation failed', { error: validationError?.issues });
      return NextResponse.json(apiError('VALIDATION_INVALID_REQUEST_BODY'),
        { status: 400 }
      );
    }

    const { name, firstName, lastName, phone, gender, isOnboardingCompleted, ...profileData } = body;

    // Update profile
    const updates: Record<string, string | boolean> = {};
    if (name !== undefined) updates.name = name;
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (gender !== undefined) updates.gender = gender;
    if (isOnboardingCompleted !== undefined) updates.is_onboarding_completed = isOnboardingCompleted;

    const { data: profileUpdate, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('role')
      .single();

    if (updateError || !profileUpdate) {
      return NextResponse.json(apiError('FAILED_TO_UPDATE_PROFILE'),
        { status: 500 }
      );
    }

    // Update role-specific profile
    if (profileData && Object.keys(profileData).length > 0) {
      const isCoach = profileUpdate.role === 'COACH';
      const profileTable = isCoach ? 'coach_profiles' : 'athlete_profiles';

      // Filter fields based on role
      const filteredData: Record<string, unknown> = {};

      // VAM/UAN test values before this update, used to append history rows on change.
      let previousVam: string | null = null;
      let previousUan: string | null = null;

      if (isCoach) {
        // Only allow coach-specific fields
        const { bio, specialty, experience } = profileData;
        if (bio !== undefined) filteredData.bio = bio;
        if (specialty !== undefined) filteredData.specialty = specialty;
        if (experience !== undefined) filteredData.experience = experience;
      } else {
        // Only allow athlete-specific fields
        // Accept both camelCase (from frontend) and snake_case, convert to snake_case for DB
        const { height, weight, injuries, rest_hr, max_hr, vam, uan, dob, restHR, maxHR, lthr, hrZones, ftp } = profileData;
        if (height !== undefined) filteredData.height = normalizeOptionalNumber(height);
        if (weight !== undefined) filteredData.weight = normalizeOptionalNumber(weight);
        if (injuries !== undefined) filteredData.injuries = injuries;
        // Accept both camelCase and snake_case
        if (rest_hr !== undefined) filteredData.rest_hr = normalizeOptionalNumber(rest_hr);
        if (restHR !== undefined) filteredData.rest_hr = normalizeOptionalNumber(restHR);
        if (max_hr !== undefined) filteredData.max_hr = normalizeOptionalNumber(max_hr);
        if (maxHR !== undefined) filteredData.max_hr = normalizeOptionalNumber(maxHR);
        if (lthr !== undefined) {
          filteredData.lthr = normalizeOptionalNumber(lthr);
        }
        if (vam !== undefined) filteredData.vam = vam;
        if (uan !== undefined) filteredData.uan = uan;
        if (ftp !== undefined) filteredData.ftp = ftp;
        if (dob !== undefined) filteredData.dob = dob;
        if (hrZones !== undefined) filteredData.hr_zones = hrZones;

        // Snapshot the current test values before upserting so we can detect changes.
        if (vam !== undefined || uan !== undefined) {
          const { data: prevMetrics } = await supabase
            .from('athlete_profiles')
            .select('vam, uan')
            .eq('user_id', user.id)
            .maybeSingle();
          previousVam = prevMetrics?.vam ?? null;
          previousUan = prevMetrics?.uan ?? null;
        }
      }

      const { data: roleProfile, error: roleProfileError } = await supabase
        .from(profileTable)
        .upsert({
          user_id: user.id,
          ...filteredData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select('id')
        .single();

      if (roleProfileError || !roleProfile) {
        logger.error('Supabase error updating profile', { error: roleProfileError });
        return NextResponse.json(apiError('FAILED_TO_UPDATE_ROLE_PROFILE'),
          { status: 500 }
        );
      }

      // Append a test-history record for each VAM/UAN value that actually changed.
      // Best-effort: history failures are logged but never fail the profile update.
      if (!isCoach && (filteredData.vam !== undefined || filteredData.uan !== undefined)) {
        const { error: historyError } = await recordTestMetricHistory(
          createServiceRoleClient(),
          roleProfile.id,
          [
            { type: 'VAM', previous: previousVam, next: filteredData.vam as string | undefined },
            { type: 'UAN', previous: previousUan, next: filteredData.uan as string | undefined },
          ],
        );
        if (historyError) {
          logger.error('Failed to record test metric history', { error: historyError });
        }
      }
    }

    // Fetch updated profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        *,
        coach_profile:coach_profiles(*),
        athlete_profile:athlete_profiles(*)
      `)
      .eq('id', user.id)
      .single();

    if (fetchError || !updatedProfile) {
      return NextResponse.json(apiError('FAILED_TO_FETCH_UPDATED_PROFILE'),
        { status: 500 }
      );
    }

    // Transform updated profile before returning
    const profileRecord = updatedProfile as Record<string, unknown>;
    const coachProfileRaw = profileRecord.coach_profile;
    const athleteProfileRaw = profileRecord.athlete_profile;

    const coachProfileData = Array.isArray(coachProfileRaw) ? coachProfileRaw[0] : coachProfileRaw;
    const athleteProfileData = Array.isArray(athleteProfileRaw) ? athleteProfileRaw[0] : athleteProfileRaw;
    const athleteProfileRecord = isRecord(athleteProfileData) ? athleteProfileData : null;

    const { coach_profile: cp, athlete_profile: ap, ...p } = profileRecord;
    void cp; void ap;

    const transformProfile = (p: Record<string, unknown>, cp: unknown, ap: Record<string, unknown> | null) => ({
      ...p,
      firstName: p.first_name,
      lastName: p.last_name,
      isOnboardingCompleted: p.is_onboarding_completed,
      mustChangePassword: p.must_change_password,
      coachProfile: cp || null,
      athleteProfile: ap ? {
        ...ap,
        restHR: ap.rest_hr,
        maxHR: ap.max_hr,
        hrZones: ap.hr_zones,
        ftp: ap.ftp,
      } : null,
    });

    return NextResponse.json(transformProfile(p, coachProfileData, athleteProfileRecord));
    } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/users/profile', method: 'PATCH', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
      { status: 500 }
    );
  }
}
