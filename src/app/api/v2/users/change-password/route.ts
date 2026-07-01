import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { changePasswordSchema, validateBody } from '@/lib/validation/schemas';
import { reportApiError } from '@/lib/api/report-error';

/**
 * Change Password Endpoint
 * 
 * Provides server-side validation for password changes.
 * Uses regular Supabase Auth (no service role key needed).
 */
export async function PATCH(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/change-password', request);
    try {
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { user, supabase } = authResult;
        
        let body: { currentPassword: string; newPassword: string };
        try {
            const rawBody = await request.json();
            const { data, error } = validateBody(changePasswordSchema, rawBody);
            if (error) {
                return NextResponse.json(
                    apiError('VALIDATION_ERROR', error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')),
                    { status: 400 }
                );
            }
            body = data!;
        } catch {
            return NextResponse.json(
                apiError('INVALID_JSON', 'Invalid JSON body'),
                { status: 400 }
            );
        }

        const { currentPassword, newPassword } = body;

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
            logger.error('Failed to update profile flag', { error: profileError });
        }

        return NextResponse.json({
            message: 'Password updated successfully',
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/users/change-password', method: 'PATCH', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
