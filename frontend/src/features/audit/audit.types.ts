/**
 * Audit Log Types - Backend Schema
 */

// Backend response types
export interface AuditLogUser {
    id: number;
    username: string;
    email: string;
    full_name?: string;
    role: string;
}

export interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    resource_type: string;
    resource_id: number | null;
    ip_address: string | null;
    user_agent: string | null;
    description: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    created_at: string;
    user?: AuditLogUser;
}

export interface AuditLogsResponse {
    items: AuditLog[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface AuditFilters {
    search?: string;
    user_id?: number;
    action?: string;
    resource_type?: string;
    dateRange?: 'today' | '7days' | '30days' | 'all';
}
