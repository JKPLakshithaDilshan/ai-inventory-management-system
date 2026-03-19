import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERMISSIONS, ROLES, type Permission, type Role, type User } from '@/lib/rbac';
import { login as apiLogin, me as apiMe, logout as apiLogout } from '@/services/auth';

interface AuthState {
    // State
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;

    // Actions
    login: (username: string, password: string) => Promise<void>;
    bootstrap: () => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

function normalizeRoleName(roleName: string | undefined): Role {
    if (!roleName) return ROLES.VIEWER;
    const upperRole = roleName.toUpperCase();
    return (Object.values(ROLES).includes(upperRole as Role) ? upperRole : ROLES.VIEWER) as Role;
}

function buildUserFromBackend(userResponse: {
    id: number;
    email: string;
    username: string;
    full_name: string;
    is_superuser: boolean;
    role_id?: number;
    role_name?: string;
    role?: { id: number; role_name?: string; name?: string; permissions?: Array<{ name: string }> };
    roles?: Array<{ id: number; role_name?: string; name?: string; permissions?: Array<{ name: string }> }>;
}): User {
    const roles = userResponse.roles || [];
    const primaryRoleName =
        userResponse.role_name ||
        userResponse.role?.role_name ||
        userResponse.role?.name ||
        roles[0]?.role_name ||
        roles[0]?.name;
    const primaryRoleId = userResponse.role_id || userResponse.role?.id || roles[0]?.id;
    const role = userResponse.is_superuser && !primaryRoleName ? ROLES.ADMIN : normalizeRoleName(primaryRoleName);

    const permissions = new Set<Permission>();
    if (userResponse.is_superuser) {
        Object.values(PERMISSIONS).forEach((permission) => permissions.add(permission));
    }
    const backendRolesForPermissions = userResponse.role ? [userResponse.role, ...roles] : roles;
    for (const backendRole of backendRolesForPermissions) {
        for (const permission of backendRole.permissions || []) {
            if (permission?.name) {
                permissions.add(permission.name as Permission);
            }
        }
    }

    return {
        id: String(userResponse.id),
        name: userResponse.full_name || userResponse.username || userResponse.email,
        email: userResponse.email,
        role,
        role_id: primaryRoleId,
        role_name: primaryRoleName,
        permissions: Array.from(permissions),
    };
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // Initial state
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: null,

            // Real backend login
            login: async (username: string, password: string) => {
                set({ loading: true, error: null });
                try {
                    // Step 1: Login to get token
                    const tokenResponse = await apiLogin(username, password);
                    
                    // Token is already saved to localStorage by auth service
                    set({ token: tokenResponse.access_token });

                    // Step 2: Fetch user info
                    const userResponse = await apiMe();
                    
                    // Step 3: Transform backend user to frontend auth profile
                    const user = buildUserFromBackend(userResponse);

                    set({
                        isAuthenticated: true,
                        user,
                        loading: false,
                        error: null,
                    });
                } catch (error: any) {
                    const errorMessage = error.message || 'Login failed';
                    set({
                        loading: false,
                        error: errorMessage,
                        isAuthenticated: false,
                        user: null,
                        token: null,
                    });
                    throw error;
                }
            },

            // Bootstrap: Check token on app load
            bootstrap: async () => {
                const token = localStorage.getItem('access_token');
                
                // Clear any stale error on app startup
                set({ error: null });
                
                if (!token) {
                    set({ isAuthenticated: false, user: null, loading: false });
                    return;
                }

                set({ loading: true });
                
                try {
                    // Verify token by calling /me
                    const userResponse = await apiMe();
                    
                    const user = buildUserFromBackend(userResponse);

                    set({
                        isAuthenticated: true,
                        user,
                        token,
                        loading: false,
                    });
                } catch (error) {
                    // Token invalid, clear everything
                    apiLogout();
                    set({
                        isAuthenticated: false,
                        user: null,
                        token: null,
                        loading: false,
                    });
                }
            },

            // Logout
            logout: () => {
                apiLogout();
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    error: null,
                });
            },

            // Clear error
            clearError: () => set({ error: null }),

        }),
        {
            name: 'auth-store',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                token: state.token,
                // Never persist error state
            }),
            onRehydrateStorage: () => (state) => {
                // Clear error on rehydration
                if (state) {
                    state.error = null;
                }
            },
        }
    )
);

