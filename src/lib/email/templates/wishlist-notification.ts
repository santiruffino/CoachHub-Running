import { escapeHtml, loadEmailTemplate, renderEmailTemplate } from './template-utils';

export type WishlistRole = 'head_coach' | 'assistant_coach' | 'other';
export type WishlistTeamSize = '1_5' | '6_15' | '16_30' | '30_plus';

const ROLE_LABELS: Record<WishlistRole, string> = {
    head_coach: 'Head Coach',
    assistant_coach: 'Coach Asistente',
    other: 'Otro',
};

const TEAM_SIZE_LABELS: Record<WishlistTeamSize, string> = {
    '1_5': '1 — 5 atletas',
    '6_15': '6 — 15 atletas',
    '16_30': '16 — 30 atletas',
    '30_plus': '30+ atletas',
};

const WISHLIST_TEMPLATE = loadEmailTemplate('wishlist-notification.html');

export interface WishlistNotificationParams {
    name: string;
    email: string;
    role: WishlistRole;
    teamSize: WishlistTeamSize;
    locale: string | null;
    userAgent: string | null;
    createdAt: Date;
    appUrl?: string;
}

export function wishlistNotificationEmailTemplate({
    name,
    email,
    role,
    teamSize,
    locale,
    userAgent,
    createdAt,
    appUrl = 'https://endurix.app',
}: WishlistNotificationParams): string {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeLocale = escapeHtml(locale ?? '—');
    const safeUa = escapeHtml(userAgent ?? '—');
    const roleLabel = ROLE_LABELS[role];
    const teamSizeLabel = TEAM_SIZE_LABELS[teamSize];
    const timestamp = createdAt.toLocaleString('es-AR', {
        dateStyle: 'long',
        timeStyle: 'short',
    });
    const adminUrl = `${appUrl.replace(/\/$/, '')}/settings/team`;

    return renderEmailTemplate(WISHLIST_TEMPLATE, {
        name: safeName,
        email: safeEmail,
        roleLabel: escapeHtml(roleLabel),
        teamSizeLabel: escapeHtml(teamSizeLabel),
        locale: safeLocale,
        userAgent: safeUa,
        createdAt: escapeHtml(timestamp),
        adminUrl: escapeHtml(adminUrl),
    });
}
