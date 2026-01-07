import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    const coachProfileData = Array.isArray(profile.coach_profile)
      ? profile.coach_profile[0]
      : profile.coach_profile;

    const athleteProfileData = Array.isArray(profile.athlete_profile)
      ? profile.athlete_profile[0]
      : profile.athlete_profile;

    const transformedProfile = {
      ...profile,
      coachProfile: coachProfileData || null,
      athleteProfile: athleteProfileData ? {
        ...athleteProfileData,
        restHR: athleteProfileData.rest_hr,
        maxHR: athleteProfileData.max_hr,
      } : null,
    };

    // Remove snake_case versions
    delete (transformedProfile as any).coach_profile;
    delete (transformedProfile as any).athlete_profile;

    return NextResponse.json(transformedProfile);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

    const body = await request.json();
    const { name, ...profileData } = body;

    // Update profile
    const updates: any = {};
    if (name !== undefined) updates.name = name;

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
      let filteredData: any = {};

      if (isCoach) {
        // Only allow coach-specific fields
        const { bio, specialty, experience } = profileData;
        if (bio !== undefined) filteredData.bio = bio;
        if (specialty !== undefined) filteredData.specialty = specialty;
        if (experience !== undefined) filteredData.experience = experience;
      } else {
        // Only allow athlete-specific fields
        // Accept both camelCase (from frontend) and snake_case, convert to snake_case for DB
        const { height, weight, injuries, rest_hr, max_hr, vam, uan, dob, restHR, maxHR } = profileData;
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

