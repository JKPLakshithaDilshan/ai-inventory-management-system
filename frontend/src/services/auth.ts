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
        const response = await http.post<TokenResponse>('/auth/refresh');
        
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
