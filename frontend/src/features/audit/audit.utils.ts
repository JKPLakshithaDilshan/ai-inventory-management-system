/**
 * Audit Logs Utilities
 */

import { type AuditLog } from './audit.types';
import { isToday, isYesterday, format, startOfDay, isBefore } from 'date-fns';

/**
 * Group audit logs by date
 */
export function groupByDate(logs: AuditLog[]): Record<string, AuditLog[]> {
    const grouped: Record<string, AuditLog[]> = {};

    logs.forEach(log => {
        const date = new Date(log.created_at);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(log);
    });

    return grouped;
}

/**
 * Get human-readable date label
 */
export function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);

    if (isToday(date)) {
        return 'Today';
    }
    if (isYesterday(date)) {
        return 'Yesterday';
    }

    return format(date, 'MMM dd, yyyy');
}

/**
 * Get sorted date keys (newest first)
 */
export function getSortedDateKeys(grouped: Record<string, AuditLog[]>): string[] {
    return Object.keys(grouped).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
    });
}

/**
 * Format time as HH:mm
 */
export function formatTime(timestamp: string): string {
    return format(new Date(timestamp), 'HH:mm');
}

/**
 * Get user name from audit log
 */
export function getUserName(log: AuditLog): string {
    if (log.user?.full_name) {
        return log.user.full_name;
    }
    if (log.user?.username) {
        return log.user.username;
    }
    return 'System';
}

/**
 * Get user role from audit log
 */
export function getUserRole(log: AuditLog): string {
    return log.user?.role || 'SYSTEM';
}

/**
 * Get entity name from audit log
 */
export function getEntityName(log: AuditLog): string {
    if (log.description) {
        return log.description;
    }
    return `${log.resource_type} #${log.resource_id || 'N/A'}`;
}

/**
 * Filter logs based on criteria
 */
export function filterLogs(logs: AuditLog[], filters: {
    search?: string;
    resource_type?: string;
    action?: string;
    dateRange?: 'today' | '7days' | '30days' | 'all';
}): AuditLog[] {
    return logs.filter(log => {
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const entityName = getEntityName(log);
            const userName = getUserName(log);
            const matches =
                entityName.toLowerCase().includes(searchLower) ||
                (log.description || '').toLowerCase().includes(searchLower) ||
                userName.toLowerCase().includes(searchLower) ||
                log.resource_type.toLowerCase().includes(searchLower);
            if (!matches) return false;
        }

        // Resource type filter
        if (filters.resource_type && log.resource_type !== filters.resource_type) {
            return false;
        }

        // Action filter
        if (filters.action && log.action !== filters.action) {
            return false;
        }

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all') {
            const logDate = new Date(log.created_at);
            const now = new Date();

            switch (filters.dateRange) {
                case 'today': {
                    if (!isToday(logDate)) return false;
                    break;
                }
                case '7days': {
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    if (isBefore(logDate, startOfDay(sevenDaysAgo))) return false;
                    break;
                }
                case '30days': {
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    if (isBefore(logDate, startOfDay(thirtyDaysAgo))) return false;
                    break;
                }
            }
        }

        return true;
    });
}

/**
 * Get color for action
 */
export function getActionColor(action: string): string {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('add')) {
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    }
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) {
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    }
    if (actionLower.includes('login') || actionLower.includes('signin')) {
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    }
    if (actionLower.includes('logout') || actionLower.includes('signout')) {
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
    }
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
}

/**
 * Format JSON for display
 */
export function formatJSON(data: unknown): string {
    if (!data) return 'No data';
    return JSON.stringify(data, null, 2);
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str: string): string {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

