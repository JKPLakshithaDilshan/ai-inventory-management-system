import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Guard Component: Requires user to be authenticated
 * Redirects to /auth/login if not authenticated
 * Note: Token verification is handled by bootstrap() in App.tsx
 */
export function RequireAuth() {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }

    return <Outlet />;
}

export function RequireGuest() {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
