import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

function sanitizeNextPath(nextParam: string | null): string {
    if (!nextParam) return '/dashboard';
    if (!nextParam.startsWith('/')) return '/dashboard';
    if (nextParam.startsWith('//')) return '/dashboard';

    return nextParam;
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const nextPath = sanitizeNextPath(searchParams.get('next'));

    if (code) {
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

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const response: NextResponse = NextResponse.redirect(`${origin}${nextPath}`);

            // Apply the cookies from the exchange
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
        } else {
            console.error('❌ [Auth Callback] Code exchange failed:', error.message);
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
