import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendWishlistNotificationEmail } from '@/lib/email/send';
import { appLogger } from '@/lib/app-logger';
import { WishlistRole, WishlistTeamSize } from '@/lib/email/templates/wishlist-notification';

const ROLES = ['head_coach', 'assistant_coach', 'other'] as const;
const TEAM_SIZES = ['1_5', '6_15', '16_30', '30_plus'] as const;

type Role = (typeof ROLES)[number];
type TeamSize = (typeof TEAM_SIZES)[number];

interface WishlistBody {
    name?: unknown;
    email?: unknown;
    role?: unknown;
    teamSize?: unknown;
    locale?: unknown;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function sanitize(value: string, max: number): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function POST(request: Request) {
    let body: WishlistBody;
    try {
        body = (await request.json()) as WishlistBody;
    } catch {
        return NextResponse.json(
            { error: 'INVALID_JSON', message: 'Invalid JSON body.' },
            { status: 400 },
        );
    }

    const name = typeof body.name === 'string' ? sanitize(body.name, 120) : '';
    const email = typeof body.email === 'string' ? sanitize(body.email, 254).toLowerCase() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const teamSize = typeof body.teamSize === 'string' ? body.teamSize : '';
    const locale = typeof body.locale === 'string' ? body.locale.slice(0, 8) : null;

    if (!name || !email || !role || !teamSize) {
        return NextResponse.json(
            { error: 'MISSING_FIELDS', message: 'All fields are required.' },
            { status: 400 },
        );
    }

    if (!isValidEmail(email)) {
        return NextResponse.json(
            { error: 'INVALID_EMAIL', message: 'Invalid email address.' },
            { status: 400 },
        );
    }

    if (!(ROLES as readonly string[]).includes(role)) {
        return NextResponse.json(
            { error: 'INVALID_ROLE', message: 'Invalid role.' },
            { status: 400 },
        );
    }

    if (!(TEAM_SIZES as readonly string[]).includes(teamSize)) {
        return NextResponse.json(
            { error: 'INVALID_TEAM_SIZE', message: 'Invalid team size.' },
            { status: 400 },
        );
    }

    const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

    const supabase = createServiceRoleClient();

    const { data: inserted, error } = await supabase
        .from('wishlist_signups')
        .insert({
            name,
            email,
            role: role as Role,
            team_size: teamSize as TeamSize,
            locale,
            user_agent: userAgent,
        })
        .select('id, created_at')
        .single();

    if (error) {
        // Supabase unique violation code on email column
        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'ALREADY_REGISTERED', message: 'Email already on the wishlist.' },
                { status: 409 },
            );
        }

        console.error('[wishlist] insert failed:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Could not save signup.' },
            { status: 500 },
        );
    }

    // Best-effort notification — signup already persisted, do not fail the request
    // if the email provider is down or unconfigured.
    try {
        await sendWishlistNotificationEmail({
            name,
            email,
            role: role as WishlistRole,
            teamSize: teamSize as WishlistTeamSize,
            locale,
            userAgent,
            createdAt: inserted?.created_at ? new Date(inserted.created_at) : new Date(),
            signupId: inserted?.id,
        });
    } catch (emailError) {
        appLogger.error('[wishlist] notification email threw', {
            email,
            error: emailError instanceof Error ? emailError.message : String(emailError),
        });
    }

    return NextResponse.json({ success: true }, { status: 201 });
}
