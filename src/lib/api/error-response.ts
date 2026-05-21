export interface ApiErrorPayload {
    success: false;
    error: string;
    message: string;
    code: string;
    data?: Record<string, any>;
}

export function apiError(code: string, error?: string, data?: Record<string, any>): ApiErrorPayload {
    return { 
        success: false, 
        code, 
        error: error || code, 
        message: error || code, 
        data 
    };
}
