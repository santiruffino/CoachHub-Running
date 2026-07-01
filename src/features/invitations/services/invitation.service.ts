export interface Invitation {
    id: string;
    email: string;
    token: string;
    accepted: boolean;
    expiresAt: string;
    role?: 'ATHLETE' | 'COACH';
}

interface InvitationValidationResponse {
    valid: boolean;
    email: string;
}

interface InvitationAcceptResponse {
    success: boolean;
    message: string;
    email: string;
}

interface InvitationErrorResponse {
    error?: string;
}

export const invitationService = {
    create: async (email: string) => {
        const response = await fetch('/api/v2/invitations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = (await response.json()) as InvitationErrorResponse;
            throw new Error(error.error || 'Failed to create invitation');
        }

        return response.json() as Promise<Invitation>;
    },

    validate: async (token: string) => {
        // Backed by team_invite_links (SAN-59) -- same endpoint the generic
        // "join team" flow uses to resolve a token before showing the signup form.
        const response = await fetch(`/api/join/${token}`);
        if (!response.ok) {
            throw new Error('Failed to validate invitation');
        }
        const data = (await response.json()) as { valid: boolean; email: string | null };
        if (!data.valid || !data.email) {
            throw new Error('Invalid or expired invitation');
        }
        return { valid: data.valid, email: data.email } as InvitationValidationResponse;
    },

    accept: async (token: string, data: { name: string; password: string }) => {
        const response = await fetch('/api/auth/accept-invitation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, ...data }),
        });

        if (!response.ok) {
            const error = (await response.json()) as InvitationErrorResponse;
            throw new Error(error.error || 'Failed to accept invitation');
        }

        return response.json() as Promise<InvitationAcceptResponse>;
    },
};
