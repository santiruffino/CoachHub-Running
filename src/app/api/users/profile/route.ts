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

    return NextResponse.json(profile);
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
      const profileTable = user.user_metadata?.role === 'COACH' 
        ? 'coach_profiles' 
        : 'athlete_profiles';

      const { error: roleProfileError } = await supabase
        .from(profileTable)
        .upsert({
          user_id: user.id,
          ...profileData,
          updated_at: new Date().toISOString(),
        });

      if (roleProfileError) {
        return NextResponse.json(
          { error: 'Failed to update role profile' },
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

