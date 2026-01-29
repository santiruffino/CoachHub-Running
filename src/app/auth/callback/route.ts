import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard';

    console.log(`📥 [Auth Callback] Received request. Code present: ${!!code}, Next param: ${next}`);

    if (code) {
        const cookieStore = new Map<string, { name: string, value: string, options: any }>();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return [];
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, { name, value, options });
                        });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            console.log('✅ [Auth Callback] Code exchange successful. Forwarding to:', next);
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';

            let response: NextResponse;

            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                response = NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                response = NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                response = NextResponse.redirect(`${origin}${next}`);
            }

            // Apply the cookies from the exchange
            Array.from(cookieStore.values()).forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
            });

            return response;
        } else {
            console.error('❌ [Auth Callback] Code exchange failed:', error.message);
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
