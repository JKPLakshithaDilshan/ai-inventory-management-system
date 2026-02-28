import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { hasPermission, type Permission } from '@/lib/rbac';

interface RequirePermissionProps {
    permission: Permission | Permission[];
}

/**
 * Guard Component: Requires user to have specific permission(s)
 * Redirects to /unauthorized if user lacks permission
 */
export function RequirePermission({ permission }: RequirePermissionProps) {
    const { user } = useAuthStore();

    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasPerms = permissions.some(perm => hasPermission(user, perm));

    if (!hasPerms) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
