/**
 * Audit Logs API
 */

import { http } from '@/services/http';
import { type AuditLog, type AuditLogsResponse } from './audit.types';

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(params?: {
    skip?: number;
    limit?: number;
    user_id?: number;
    action?: string;
    resource_type?: string;
}): Promise<AuditLogsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) {
        queryParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
    }
    if (params?.user_id !== undefined) {
        queryParams.append('user_id', params.user_id.toString());
    }
    if (params?.action) {
        queryParams.append('action', params.action);
    }
    if (params?.resource_type) {
        queryParams.append('resource_type', params.resource_type);
    }

    const url = `/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return http.get<AuditLogsResponse>(url);
}

/**
 * Get single audit log by ID
 */
export async function getAuditLogById(id: number): Promise<AuditLog> {
    return http.get<AuditLog>(`/audit-logs/${id}`);
}

