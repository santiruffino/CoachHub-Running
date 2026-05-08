export interface ApiErrorPayload {
    success: false;
    error: string;
    message: string;
    code: string;
}

export function apiError(code: string, error: string): ApiErrorPayload {
    return { success: false, code, error, message: error };
}
