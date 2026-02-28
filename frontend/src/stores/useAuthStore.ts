import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ROLES, type Role, type User } from '@/lib/rbac';

interface AuthState {
    // State
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;

    // Actions
    login: (user: User, token: string) => void;
    loginAsRole: (role: Role) => void; // Dev helper
    logout: () => void;
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

            // Login with user data
            login: (user, token) =>
                set({
                    isAuthenticated: true,
                    user,
                    token,
                }),

            // Dev helper: Login as a specific role
            loginAsRole: (role: Role) => {
                const user = MOCK_USERS[role];
                const mockToken = `mock-token-${role}-${Date.now()}`;
                set({
                    isAuthenticated: true,
                    user,
                    token: mockToken,
                });
            },

            // Logout
            logout: () =>
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                }),
        }),
        {
            name: 'auth-store', // localStorage key
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                token: state.token,
            }),
        }
    )
);
