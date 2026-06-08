import api from '@/lib/axios';

export type ResolveReason = 'not_found' | 'revoked' | 'expired' | 'max_uses_reached';

export interface TeamInviteLink {
    id: string;
    teamId: string;
    createdBy: string;
    role: 'ATHLETE';
    token: string;
    url: string;
    externalUrl: string;
    label: string | null;
    isActive: boolean;
    expiresAt: string | null;
    maxUses: number | null;
    uses: number;
    lastUsedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TeamInviteLinkResolution {
    valid: boolean;
    reason?: ResolveReason;
    teamId?: string;
    teamName?: string | null;
    role?: 'ATHLETE';
    expiresAt?: string | null;
    maxUses?: number | null;
}

interface ApiError {
    error?: string;
    message?: string;
}

async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
    try {
        const res = await promise;
        return res.data;
    } catch (err) {
        const message =
            (err as { response?: { data?: ApiError } })?.response?.data?.message ||
            (err as { response?: { data?: ApiError } })?.response?.data?.error ||
            (err as Error)?.message ||
            'request_failed';
        throw new Error(message);
    }
}

export const teamInviteLinkService = {
    list: () =>
        unwrap<{ items: TeamInviteLink[] }>(api.get('/v2/team-invite-links')),

    create: (params: { label?: string | null; expiresInDays?: number | null; maxUses?: number | null }) =>
        unwrap<TeamInviteLink>(api.post('/v2/team-invite-links', params)),

    update: (
        id: string,
        params: { isActive?: boolean; label?: string | null; expiresInDays?: number | null; maxUses?: number | null }
    ) => unwrap<TeamInviteLink>(api.patch(`/v2/team-invite-links/${id}`, params)),

    rotate: (id: string) => unwrap<TeamInviteLink>(api.post(`/v2/team-invite-links/${id}/rotate`)),

    revoke: async (id: string) => {
        await unwrap<TeamInviteLink>(api.patch(`/v2/team-invite-links/${id}`, { isActive: false }));
    },

    resolvePublic: (token: string) =>
        unwrap<TeamInviteLinkResolution>(api.get(`/join/${token}`)),

    accept: (token: string, data: { email: string; name: string; password: string }) =>
        unwrap<{ success: boolean; email: string }>(api.post(`/join/${token}/accept`, data)),
};
