/**
 * Audit Logs Mock API
 */

import { type AuditLog } from './audit.types';

/**
 * Generate mock audit logs spanning last 7 days
 */
function generateMockAuditLogs(): AuditLog[] {
    const logs: AuditLog[] = [];
    const now = new Date();
    const modules = ['Products', 'Suppliers', 'Purchases', 'Sales', 'Stock', 'AI'] as const;
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const;
    const severities = ['low', 'medium', 'high'] as const;

    const actors = [
        { name: 'John Admin', role: 'ADMIN' },
        { name: 'Sarah Manager', role: 'MANAGER' },
        { name: 'Mike Staff', role: 'STAFF' },
        { name: 'Lisa HR', role: 'HR' },
    ];

    // Generate logs for last 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(now);
        dayDate.setDate(dayDate.getDate() - dayOffset);

        // 3-6 logs per day
        const logsPerDay = Math.floor(Math.random() * 4) + 3;

        for (let i = 0; i < logsPerDay; i++) {
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);

            const logDate = new Date(dayDate);
            logDate.setHours(hour, minute, second);

            const module = modules[Math.floor(Math.random() * modules.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];
            const actor = actors[Math.floor(Math.random() * actors.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];

            let entityType = '';
            let entityName = '';
            let description = '';
            let before = null;
            let after = null;

            // Generate module-specific data
            switch (module) {
                case 'Products':
                    entityType = 'Product';
                    const productNames = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones'];
                    entityName = productNames[Math.floor(Math.random() * productNames.length)];
                    if (action === 'CREATE') {
                        description = `Created product: ${entityName}`;
                        after = { sku: 'SKU-' + Math.random().toString(36).substring(7), price: Math.floor(Math.random() * 2000) + 100 };
                    } else if (action === 'UPDATE') {
                        description = `Updated product: ${entityName}`;
                        before = { price: Math.floor(Math.random() * 2000) + 100 };
                        after = { price: Math.floor(Math.random() * 2000) + 100 };
                    } else if (action === 'DELETE') {
                        description = `Deleted product: ${entityName}`;
                    }
                    break;

                case 'Suppliers':
                    entityType = 'Supplier';
                    const supplierNames = ['TechCorp', 'Global Electronics', 'Quality Parts', 'FastShip'];
                    entityName = supplierNames[Math.floor(Math.random() * supplierNames.length)];
                    if (action === 'CREATE') {
                        description = `Added supplier: ${entityName}`;
                        after = { email: entityName.toLowerCase().replace(/\s/g, '') + '@example.com', paymentTerms: '30 days' };
                    } else if (action === 'UPDATE') {
                        description = `Updated supplier: ${entityName}`;
                        before = { status: 'active' };
                        after = { status: 'inactive' };
                    }
                    break;

                case 'Purchases':
                    entityType = 'Purchase Order';
                    entityName = 'PO-' + Math.random().toString(36).substring(7).toUpperCase();
                    if (action === 'CREATE') {
                        description = `Created purchase order`;
                        after = { totalAmount: Math.floor(Math.random() * 10000) + 500, itemCount: Math.floor(Math.random() * 20) + 1 };
                    } else if (action === 'UPDATE') {
                        description = `Updated purchase order status`;
                        before = { status: 'draft' };
                        after = { status: 'confirmed' };
                    }
                    break;

                case 'Sales':
                    entityType = 'Sales Order';
                    entityName = 'SO-' + Math.random().toString(36).substring(7).toUpperCase();
                    if (action === 'CREATE') {
                        description = `Created sales order`;
                        after = { totalAmount: Math.floor(Math.random() * 15000) + 1000, itemCount: Math.floor(Math.random() * 10) + 1 };
                    } else if (action === 'UPDATE') {
                        description = `Updated sales order`;
                        before = { status: 'pending' };
                        after = { status: 'shipped' };
                    }
                    break;

                case 'Stock':
                    entityType = 'Stock Level';
                    const items = ['Laptop', 'Mouse', 'Monitor', 'Keyboard'];
                    entityName = items[Math.floor(Math.random() * items.length)];
                    if (action === 'UPDATE') {
                        description = `Adjusted stock level for ${entityName}`;
                        before = { quantity: Math.floor(Math.random() * 100) + 10 };
                        after = { quantity: Math.floor(Math.random() * 100) + 10 };
                    }
                    break;

                case 'AI':
                    entityType = 'AI Forecast';
                    entityName = 'Forecast Model';
                    if (action === 'UPDATE') {
                        description = `Updated AI forecast data`;
                        before = { modelVersion: '1.0' };
                        after = { modelVersion: '1.1' };
                    }
                    break;
            }

            // Handle auth actions
            if (action === 'LOGIN') {
                entityType = 'User Session';
                entityName = actor.name;
                description = `${actor.name} logged in`;
            } else if (action === 'LOGOUT') {
                entityType = 'User Session';
                entityName = actor.name;
                description = `${actor.name} logged out`;
            }

            logs.push({
                id: 'AUD-' + Math.random().toString(36).substring(7).toUpperCase(),
                timestamp: logDate.toISOString(),
                actorName: actor.name,
                actorRole: actor.role,
                module,
                action,
                entityType,
                entityId: 'ENT-' + Math.random().toString(36).substring(7).toUpperCase(),
                entityName,
                description,
                before,
                after,
                severity,
            });
        }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const mockAuditLogs = generateMockAuditLogs();

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(filters?: {
    search?: string;
    module?: string;
    action?: string;
    dateRange?: 'today' | '7days' | '30days' | 'all';
}): Promise<AuditLog[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!filters) {
        return mockAuditLogs;
    }

    // Basic filtering
    return mockAuditLogs.filter(log => {
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matches =
                log.entityName.toLowerCase().includes(searchLower) ||
                log.description.toLowerCase().includes(searchLower) ||
                log.actorName.toLowerCase().includes(searchLower);
            if (!matches) return false;
        }

        if (filters.module && log.module !== filters.module) {
            return false;
        }

        if (filters.action && log.action !== filters.action) {
            return false;
        }

        // Date filtering would be implemented here if needed

        return true;
    });
}
