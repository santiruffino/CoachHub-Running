export interface Invitation {
    id: string;
    email: string;
    token: string;
    accepted: boolean;
    expiresAt: string;
}

export const invitationService = {
    create: async (email: string) => {
        const response = await fetch('/api/invitations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create invitation');
        }

        return response.json();
    },

    validate: async (token: string) => {
        const response = await fetch(`/api/invitations/validate/${token}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to validate invitation');
        }
        return response.json();
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
            const error = await response.json();
            throw new Error(error.error || 'Failed to accept invitation');
        }

        return response.json();
    },
};
