import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for cookies
});

// Note: Authentication is now handled via HTTP-only cookies
// No need for Authorization header with Bearer token

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Session expired or user not authenticated
            // Don't redirect if it's a login attempt failure
            if (error.config.url && !error.config.url.includes('/auth/login')) {
                if (typeof window !== 'undefined') {
                    window.location.href = '/login?error=session_expired';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
