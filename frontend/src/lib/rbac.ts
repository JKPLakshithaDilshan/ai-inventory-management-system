/**
 * RBAC (Role-Based Access Control) Model
 * Core permission and role definitions
 */

// Define all permissions in the system
export const PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard:view',

    // AI Features
    AI_FORECAST_VIEW: 'ai:forecast:view',
    AI_REORDER_VIEW: 'ai:reorder:view',

    // Inventory Management
    PRODUCTS_VIEW: 'products:view',
    PRODUCTS_MANAGE: 'products:manage',

    SUPPLIERS_VIEW: 'suppliers:view',
    SUPPLIERS_MANAGE: 'suppliers:manage',

    WAREHOUSE_VIEW: 'warehouse:view',
    WAREHOUSE_CREATE: 'warehouse:create',
    WAREHOUSE_UPDATE: 'warehouse:update',
    WAREHOUSE_DELETE: 'warehouse:delete',

    CUSTOMER_VIEW: 'customer:view',
    CUSTOMER_CREATE: 'customer:create',
    CUSTOMER_UPDATE: 'customer:update',
    CUSTOMER_DELETE: 'customer:delete',

    PURCHASES_VIEW: 'purchases:view',
    PURCHASES_MANAGE: 'purchases:manage',

    SALES_VIEW: 'sales:view',
    SALES_MANAGE: 'sales:manage',

    STOCK_ADJUSTMENT_VIEW: 'stock_adjustment:view',
    STOCK_ADJUSTMENT_CREATE: 'stock_adjustment:create',

    STOCK_LEDGER_VIEW: 'stock_ledger:view',

    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',

    ALERTS_VIEW: 'alerts:view',
    ALERTS_MANAGE: 'alerts:manage',

    // Admin/Settings
    ADMIN_USERS_MANAGE: 'admin:users:manage',
    ADMIN_AUDIT_VIEW: 'admin:audit:view',
    ADMIN_SETTINGS: 'admin:settings',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Define all roles in the system
export const ROLES = {
    ADMIN: 'ADMIN',
    HR: 'HR',
    MANAGER: 'MANAGER',
    STAFF: 'STAFF',
    VIEWER: 'VIEWER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Map roles to their permissions
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [ROLES.ADMIN]: [
        // Admin has all permissions
        Object.values(PERMISSIONS) as Permission[],
    ].flat(),

    [ROLES.HR]: [
        // HR can view and manage most features
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.AI_FORECAST_VIEW,
        PERMISSIONS.AI_REORDER_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_MANAGE,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.SUPPLIERS_MANAGE,
        PERMISSIONS.WAREHOUSE_VIEW,
        PERMISSIONS.WAREHOUSE_CREATE,
        PERMISSIONS.WAREHOUSE_UPDATE,
        PERMISSIONS.WAREHOUSE_DELETE,
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_CREATE,
        PERMISSIONS.CUSTOMER_UPDATE,
        PERMISSIONS.CUSTOMER_DELETE,
        PERMISSIONS.PURCHASES_VIEW,
        PERMISSIONS.PURCHASES_MANAGE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_MANAGE,
        PERMISSIONS.STOCK_ADJUSTMENT_VIEW,
        PERMISSIONS.STOCK_ADJUSTMENT_CREATE,
        PERMISSIONS.ALERTS_VIEW,
        PERMISSIONS.ALERTS_MANAGE,
        PERMISSIONS.ADMIN_AUDIT_VIEW,
    ],

    [ROLES.MANAGER]: [
        // Manager can view most things and manage inventory
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.AI_FORECAST_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_MANAGE,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.SUPPLIERS_MANAGE,
        PERMISSIONS.WAREHOUSE_VIEW,
        PERMISSIONS.WAREHOUSE_CREATE,
        PERMISSIONS.WAREHOUSE_UPDATE,
        PERMISSIONS.WAREHOUSE_DELETE,
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_CREATE,
        PERMISSIONS.CUSTOMER_UPDATE,
        PERMISSIONS.CUSTOMER_DELETE,
        PERMISSIONS.PURCHASES_VIEW,
        PERMISSIONS.PURCHASES_MANAGE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_MANAGE,
        PERMISSIONS.STOCK_ADJUSTMENT_VIEW,
        PERMISSIONS.STOCK_ADJUSTMENT_CREATE,
        PERMISSIONS.ALERTS_VIEW,
        PERMISSIONS.ADMIN_AUDIT_VIEW,
    ],

    [ROLES.STAFF]: [
        // Staff can view dashboard and basic inventory
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.WAREHOUSE_VIEW,
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.PURCHASES_VIEW,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.STOCK_ADJUSTMENT_VIEW,
        PERMISSIONS.ALERTS_VIEW,
    ],

    [ROLES.VIEWER]: [
        // Viewer can only see dashboard
        PERMISSIONS.DASHBOARD_VIEW,
    ],
};

// User interface
export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    permissions: Permission[];
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false;
    if (user.role === ROLES.ADMIN) return true;
    return user.permissions.includes(permission);
}

/**
 * Check if a user has any of multiple permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
    return permissions.some(perm => hasPermission(user, perm));
}

/**
 * Check if a user has all of multiple permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
    return permissions.every(perm => hasPermission(user, perm));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role];
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: Role): string {
    return {
        [ROLES.ADMIN]: 'Administrator',
        [ROLES.HR]: 'HR Manager',
        [ROLES.MANAGER]: 'Manager',
        [ROLES.STAFF]: 'Staff',
        [ROLES.VIEWER]: 'Viewer',
    }[role];
}
