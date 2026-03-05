import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ROLES, type Role, type User } from '@/lib/rbac';
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
    loginAsRole: (role: Role) => void; // Dev helper (keep for settings page)
}

// Mock users for development
const MOCK_USERS: Record<Role, User> = {
    [ROLES.ADMIN]: {
        id: 'user_admin',
        name: 'Admin User',
        email: 'admin@inventory.app',
        role: ROLES.ADMIN,
    },
    [ROLES.HR]: {
        id: 'user_hr',
        name: 'HR Manager',
        email: 'hr@inventory.app',
        role: ROLES.HR,
    },
    [ROLES.MANAGER]: {
        id: 'user_manager',
        name: 'Inventory Manager',
        email: 'manager@inventory.app',
        role: ROLES.MANAGER,
    },
    [ROLES.STAFF]: {
        id: 'user_staff',
        name: 'Staff Member',
        email: 'staff@inventory.app',
        role: ROLES.STAFF,
    },
    [ROLES.VIEWER]: {
        id: 'user_viewer',
        name: 'Viewer Only',
        email: 'viewer@inventory.app',
        role: ROLES.VIEWER,
    },
};

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
                    
                    // Step 3: Transform backend user to frontend user
                    const roles = userResponse.roles || [];
                    let userRole: Role;
                    
                    // If user is superuser but has no roles, assign ADMIN
                    if (userResponse.is_superuser && roles.length === 0) {
                        userRole = ROLES.ADMIN;
                    } else {
                        userRole = (roles[0]?.name || ROLES.VIEWER) as Role;
                    }
                    
                    const user: User = {
                        id: String(userResponse.id),
                        name: userResponse.full_name || userResponse.username || userResponse.email,
                        email: userResponse.email,
                        role: userRole,
                    };

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
                    
                    const roles = userResponse.roles || [];
                    let userRole: Role;
                    
                    // If user is superuser but has no roles, assign ADMIN
                    if (userResponse.is_superuser && roles.length === 0) {
                        userRole = ROLES.ADMIN;
                    } else {
                        userRole = (roles[0]?.name || ROLES.VIEWER) as Role;
                    }
                    
                    const user: User = {
                        id: String(userResponse.id),
                        name: userResponse.full_name || userResponse.username || userResponse.email,
                        email: userResponse.email,
                        role: userRole,
                    };

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

            // Dev helper: Login as a specific role (keep for settings page dev tools)
            loginAsRole: (role: Role) => {
                const user = MOCK_USERS[role];
                const mockToken = `mock-token-${role}-${Date.now()}`;
                localStorage.setItem('access_token', mockToken);
                set({
                    isAuthenticated: true,
                    user,
                    token: mockToken,
                });
            },
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

