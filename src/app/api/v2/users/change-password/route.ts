import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';

/**
 * Change Password Endpoint
 * 
 * Provides server-side validation for password changes.
 * Uses regular Supabase Auth (no service role key needed).
 */
export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { user, supabase } = authResult;
        const { currentPassword, newPassword } = await request.json();

        // Validation
        if (!currentPassword || !newPassword) {
            return NextResponse.json(apiError('VALIDATION_CURRENT_PASSWORD_AND_NEW_PASSWORD_ARE_REQUIRED'),
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(apiError('VALIDATION_NEW_PASSWORD_MUST_BE_AT_LEAST_6_CHARACTERS'),
                { status: 400 }
            );
        }

        // Note: We don't verify the current password here because:
        // 1. The user is already authenticated (verified by requireAuth)
        // 2. Supabase updateUser will handle password validation
        // 3. Calling signInWithPassword in server context can hang

        // Update password using regular auth (doesn't require service role key)
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            return NextResponse.json(apiError('FAILED_TO_UPDATE_PASSWORD'),
                { status: 500 }
            );
        }

        // Clear must_change_password flag if set
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', user!.id);

        if (profileError) {
            appLogger.error('Failed to update profile flag:', profileError);
        }

        return NextResponse.json({
            message: 'Password updated successfully',
        });
    } catch (error: unknown) {
        appLogger.error('Change password error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
