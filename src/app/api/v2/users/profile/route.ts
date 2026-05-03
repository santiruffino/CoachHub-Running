import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ProfileRequestBody {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  isOnboardingCompleted?: boolean;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
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

    const transformedProfile = {
      ...profileWithoutSnake,
      coachProfile: coachProfileData || null,
      athleteProfile: athleteProfileRecord ? {
        ...athleteProfileRecord,
        restHR: athleteProfileRecord.rest_hr,
        maxHR: athleteProfileRecord.max_hr,
        hrZones: athleteProfileRecord.hr_zones,
      } : null,
    };

    return NextResponse.json(transformedProfile);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ProfileRequestBody;
    const { name, firstName, lastName, phone, gender, isOnboardingCompleted, ...profileData } = body;

    // Update profile
    const updates: Record<string, string | boolean> = {};
    if (name !== undefined) updates.name = name;
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (gender !== undefined) updates.gender = gender;
    if (isOnboardingCompleted !== undefined) updates.is_onboarding_completed = isOnboardingCompleted;

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Update role-specific profile
    if (profileData && Object.keys(profileData).length > 0) {
      const isCoach = user.user_metadata?.role === 'COACH';
      const profileTable = isCoach ? 'coach_profiles' : 'athlete_profiles';

      // Filter fields based on role
      const filteredData: Record<string, unknown> = {};

      if (isCoach) {
        // Only allow coach-specific fields
        const { bio, specialty, experience } = profileData;
        if (bio !== undefined) filteredData.bio = bio;
        if (specialty !== undefined) filteredData.specialty = specialty;
        if (experience !== undefined) filteredData.experience = experience;
      } else {
        // Only allow athlete-specific fields
        // Accept both camelCase (from frontend) and snake_case, convert to snake_case for DB
        const { height, weight, injuries, rest_hr, max_hr, vam, uan, dob, restHR, maxHR, hrZones } = profileData;
        if (height !== undefined) filteredData.height = height;
        if (weight !== undefined) filteredData.weight = weight;
        if (injuries !== undefined) filteredData.injuries = injuries;
        // Accept both camelCase and snake_case
        if (rest_hr !== undefined) filteredData.rest_hr = rest_hr;
        if (restHR !== undefined) filteredData.rest_hr = restHR;
        if (max_hr !== undefined) filteredData.max_hr = max_hr;
        if (maxHR !== undefined) filteredData.max_hr = maxHR;
        if (vam !== undefined) filteredData.vam = vam;
        if (uan !== undefined) filteredData.uan = uan;
        if (dob !== undefined) filteredData.dob = dob;
        if (hrZones !== undefined) filteredData.hr_zones = hrZones;
      }

      const { error: roleProfileError } = await supabase
        .from(profileTable)
        .upsert({
          user_id: user.id,
          ...filteredData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (roleProfileError) {
        console.error('Supabase error updating profile:', roleProfileError);
        console.error('Profile table:', profileTable);
        console.error('Filtered data:', filteredData);
        return NextResponse.json(
          { error: 'Failed to update role profile', details: roleProfileError.message },
          { status: 500 }
        );
      }
    }

    // Fetch updated profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select(`
        *,
        coach_profile:coach_profiles(*),
        athlete_profile:athlete_profiles(*)
      `)
      .eq('id', user.id)
      .single();

    return NextResponse.json(updatedProfile);
    } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
