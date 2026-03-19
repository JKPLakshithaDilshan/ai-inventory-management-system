/**
 * Authentication API Service
 * Handles login, logout, and user authentication
 */

import { http } from './http';

/**
 * Token response from backend
 */
interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

/**
 * User information response from backend
 */
interface UserResponse {
    id: number;
    email: string;
    username: string;
    full_name: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    roles: Array<{
        id: number;
        name: string;
        description?: string;
        permissions: any[];
    }>;
    permissions: Array<{
        id: number;
        name: string;
        description?: string;
        resource: string;
        action: string;
    }>;
}

interface MessageResponse {
    message: string;
}

/**
 * Login with username and password
 * Uses OAuth2 form-encoded format as required by FastAPI backend
 */
export async function login(username: string, password: string): Promise<TokenResponse> {
    try {
        console.log('[AUTH] Attempting login for:', username);
        const response = await http.postForm<TokenResponse>('/auth/login', {
            username,
            password,
        });
        
        console.log('[AUTH] Login successful, token:', response.access_token.substring(0, 20) + '...');
        
        // Store tokens
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        
        return response;
    } catch (error) {
        console.error('[AUTH] Login failed:', error);
        throw error;
    }
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<UserResponse> {
    try {
        return await http.get<UserResponse>('/auth/me');
    } catch (error) {
        console.error('Failed to get current user:', error);
        throw error;
    }
}

export async function me(): Promise<UserResponse> {
    return getCurrentUser();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(): Promise<TokenResponse> {
    try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) {
            throw new Error('Missing refresh token');
        }

        const response = await http.post<TokenResponse>(
            '/auth/refresh',
            { refresh_token: refresh },
            { skipAuth: true }
        );
        
        // Update stored token
        localStorage.setItem('access_token', response.access_token);
        if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        return response;
    } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear tokens on refresh failure
        logout();
        throw error;
    }
}

/**
 * Logout user
 */
export function logout(): void {
    // Fire and forget server-side logout lifecycle endpoint.
    http.post('/auth/logout', undefined, { skipAuth: true }).catch(() => undefined);

    // Clear stored tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
    return localStorage.getItem('access_token');
}

/**
 * Request a password reset email.
 * Always returns a generic response to avoid account enumeration.
 */
export async function requestPasswordReset(email: string): Promise<MessageResponse> {
    return http.post<MessageResponse>(
        '/auth/forgot-password',
        { email },
        { skipAuth: true }
    );
}

/**
 * Reset password using one-time token.
 */
export async function resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
): Promise<MessageResponse> {
    return http.post<MessageResponse>(
        '/auth/reset-password',
        {
            token,
            new_password: newPassword,
            confirm_password: confirmPassword,
        },
        { skipAuth: true }
    );
}
