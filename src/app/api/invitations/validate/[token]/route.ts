import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const token = params.token;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Validate invitation token
        const { data: invitation, error } = await supabase
            .from('invitations')
            .select('email, expires_at, accepted')
            .eq('token', token)
            .single();

        if (error || !invitation) {
            return NextResponse.json(
                { error: 'Invalid invitation token' },
                { status: 400 }
            );
        }

        if (invitation.accepted) {
            return NextResponse.json(
                { error: 'Invitation already accepted' },
                { status: 400 }
            );
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'Invitation has expired' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            valid: true,
            email: invitation.email,
        });
    } catch (error) {
        console.error('Validate invitation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
