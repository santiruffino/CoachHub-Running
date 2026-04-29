import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { token, name, password } = await request.json();

        if (!token || !name || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create Supabase admin client (server-side only)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SECRET_KEY!, // Secret key for admin operations
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // Validate invitation token
        const { data: invitation, error: invitationError } = await supabase
            .from('invitations')
            .select('*')
            .eq('token', token)
            .eq('accepted', false)
            .single();

        if (invitationError || !invitation) {
            return NextResponse.json(
                { error: 'Invalid or expired invitation' },
                { status: 400 }
            );
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'Invitation has expired' },
                { status: 400 }
            );
        }

        // Create user in Supabase Auth using admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: invitation.email,
            password: password,
            email_confirm: true, // Auto-confirm email for invited users
        });

        if (authError || !authData.user) {
            console.error('Auth error:', authError);
            return NextResponse.json(
                { error: 'Failed to create user account' },
                { status: 500 }
            );
        }

        // Determine the role, defaulting to ATHLETE if not specified in old invitations
        const userRole = invitation.role || 'ATHLETE';

        // Update profile with name, role, and coach/team relationships
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                name: name,
                must_change_password: false, // User already set their own password
                role: userRole, 
                coach_id: invitation.coach_id, // Link athlete to coach (null if invited directly by Super Coach or if user is a coach)
                team_id: invitation.team_id,   // Link user directly to the Running Team
            })
            .eq('id', authData.user.id);

        if (profileError) {
            console.error('Profile update error:', profileError);
            // User created but profile update failed - still proceed
        }

        // Mark invitation as accepted
        const { error: updateError } = await supabase
            .from('invitations')
            .update({ accepted: true })
            .eq('id', invitation.id);

        if (updateError) {
            console.error('Invitation update error:', updateError);
        }

        // Create specific profile based on role
        if (userRole === 'COACH') {
            const { error: coachProfileError } = await supabase
                .from('coach_profiles')
                .insert({
                    id: authData.user.id,
                });

            if (coachProfileError && !coachProfileError.message.includes('duplicate')) {
                console.error('Coach profile creation error:', coachProfileError);
            }
        } else {
            // Default to creating an athlete profile
            const { error: athleteProfileError } = await supabase
                .from('athlete_profiles')
                .insert({
                    user_id: authData.user.id,
                });

            if (athleteProfileError && !athleteProfileError.message.includes('duplicate')) {
                console.error('Athlete profile creation error:', athleteProfileError);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
            email: invitation.email,
        });
    } catch (error: any) {
        console.error('Accept invitation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
