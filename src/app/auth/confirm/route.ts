import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { appLogger } from '@/lib/app-logger';

function sanitizeNextPath(nextParam: string | null): string {
    if (!nextParam) return '/dashboard';
    if (!nextParam.startsWith('/')) return '/dashboard';
    if (nextParam.startsWith('//')) return '/dashboard';

    return nextParam;
}

/**
 * Server-side verification for email-token flows (password recovery, magic
 * link, email change) using the modern `token_hash` + `verifyOtp` flow.
 *
 * Unlike the implicit `/verify` redirect, this consumes the one-time token via
 * a single server call and writes the session to cookies before redirecting,
 * so a page refresh never re-submits an already-consumed token.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const nextPath = sanitizeNextPath(searchParams.get('next'));

    if (token_hash && type) {
        const cookieStore: Array<{ name: string; value: string; options?: unknown }> = [];

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.push({ name, value, options });
                        });
                    },
                },
            }
        );

        const { error } = await supabase.auth.verifyOtp({ type, token_hash });

        if (!error) {
            const response: NextResponse = NextResponse.redirect(`${origin}${nextPath}`);

            // Apply the session cookies from the verification
            cookieStore.forEach(({ name, value, options }) => {
                if (options && typeof options === 'object') {
                    response.cookies.set(
                        name,
                        value,
                        options as Parameters<typeof response.cookies.set>[2]
                    );
                    return;
                }

                response.cookies.set(name, value);
            });

            return response;
        }

        appLogger.error('❌ [Auth Confirm] verifyOtp failed:', error.message);
    }

    // Missing/invalid params or verification failed
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
