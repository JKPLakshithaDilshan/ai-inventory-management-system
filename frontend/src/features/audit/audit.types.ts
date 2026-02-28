/**
 * Audit Log Types
 */

export type AuditModule = 'Products' | 'Suppliers' | 'Purchases' | 'Sales' | 'Stock' | 'AI';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type AuditSeverity = 'low' | 'medium' | 'high';

export interface AuditLog {
    id: string;
    timestamp: string; // ISO format
    actorName: string;
    actorRole: string;
    module: AuditModule;
    action: AuditAction;
    entityType: string;
    entityId: string;
    entityName: string;
    description: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    severity: AuditSeverity;
}

export interface AuditFilters {
    search?: string;
    module?: AuditModule;
    action?: AuditAction;
    dateRange?: 'today' | '7days' | '30days' | 'all';
}
