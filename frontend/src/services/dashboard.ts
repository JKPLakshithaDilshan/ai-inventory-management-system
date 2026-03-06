import { http } from './http';

export interface DashboardStats {
    period_days: number;
    sales: {
        count: number;
        revenue: number;
    };
    purchases: {
        count: number;
        amount: number;
    };
    products: {
        total: number;
        low_stock: number;
        out_of_stock: number;
    };
    inventory_value: number;
}

export interface RecentActivity {
    id: number;
    action: string;
    resource_type: string;
    resource_id: number | null;
    description: string;
    user_id: number | null;
    created_at: string;
}

export async function getDashboardStats(days = 30): Promise<DashboardStats> {
    return http.get(`/dashboard/stats?days=${days}`, { method: 'GET' });
}

export async function getRecentActivities(limit = 10): Promise<RecentActivity[]> {
    return http.get(`/dashboard/recent-activities?limit=${limit}`, { method: 'GET' });
}
