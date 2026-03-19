/**
 * Reports API Service
 */
import { http } from './http';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type StockTransactionType = 'in' | 'out' | 'adjust' | 'transfer';

export interface InventoryReportItem {
    product_id: number;
    sku: string;
    name: string;
    category: string | null;
    quantity: number;
    unit: string | null;
    cost_price: number;
    selling_price: number;
    stock_value: number;
    stock_status: string;
    reorder_level: number;
}

export interface SalesReportItem {
    sale_id: number;
    invoice_number: string;
    sale_date: string;
    customer_id: number | null;
    customer_name: string | null;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    status: string;
    payment_method: string | null;
}

export interface SalesReportSummary {
    total_sales: number;
    total_revenue: number;
    avg_order_value: number;
    total_discounts: number;
}

export interface PurchaseReportItem {
    purchase_id: number;
    purchase_number: string;
    purchase_date: string;
    supplier_id: number;
    supplier_name: string | null;
    total_amount: number;
    tax_amount: number;
    status: string;
    received_date: string | null;
}

export interface PurchaseReportSummary {
    total_purchases: number;
    total_spending: number;
    avg_purchase_value: number;
}

export interface StockMovementReportItem {
    ledger_id: number;
    created_at: string;
    product_id: number;
    product_name: string | null;
    warehouse_id: number;
    warehouse_name: string | null;
    type: string;
    qty_change: number;
    qty_before: number;
    qty_after: number;
    reference_type: string | null;
    reference_id: number | null;
    note: string | null;
}

export interface StockMovementReportSummary {
    total_movements: number;
    total_units_moved: number;
    total_inbound: number;
    total_outbound: number;
}

export interface InventoryReportResponse {
    items: InventoryReportItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface SalesReportResponse {
    items: SalesReportItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    summary: SalesReportSummary;
}

export interface PurchaseReportResponse {
    items: PurchaseReportItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    summary: PurchaseReportSummary;
}

export interface StockMovementReportResponse {
    items: StockMovementReportItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    summary: StockMovementReportSummary;
}

export interface InventoryReportFilters {
    skip?: number;
    limit?: number;
    warehouse_id?: number;
    category?: string;
    stock_status?: StockStatus;
}

export interface SalesReportFilters {
    skip?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    customer_id?: number;
    product_id?: number;
}

export interface PurchaseReportFilters {
    skip?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    supplier_id?: number;
    product_id?: number;
}

export interface StockMovementReportFilters {
    skip?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    product_id?: number;
    warehouse_id?: number;
    transaction_type?: StockTransactionType;
}

/**
 * Reports API
 */
export const reportsApi = {
    /**
     * Get inventory summary report
     */
    async getInventoryReport(filters: InventoryReportFilters = {}): Promise<InventoryReportResponse> {
        const params = new URLSearchParams();
        if (filters.skip !== undefined) params.append('skip', String(filters.skip));
        if (filters.limit !== undefined) params.append('limit', String(filters.limit));
        if (filters.warehouse_id) params.append('warehouse_id', String(filters.warehouse_id));
        if (filters.category) params.append('category', filters.category);
        if (filters.stock_status) params.append('stock_status', filters.stock_status);

        const url = params.toString() ? `/reports/inventory?${params.toString()}` : '/reports/inventory';
        return http.get<InventoryReportResponse>(url);
    },

    /**
     * Export inventory report to CSV
     */
    async exportInventoryReport(filters: Omit<InventoryReportFilters, 'skip' | 'limit'> = {}): Promise<Blob> {
        const params = new URLSearchParams();
        if (filters.warehouse_id) params.append('warehouse_id', String(filters.warehouse_id));
        if (filters.category) params.append('category', filters.category);
        if (filters.stock_status) params.append('stock_status', filters.stock_status);

        const url = params.toString() ? `/reports/inventory/export?${params.toString()}` : '/reports/inventory/export';
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}${url}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    },

    /**
     * Get sales report
     */
    async getSalesReport(filters: SalesReportFilters = {}): Promise<SalesReportResponse> {
        const params = new URLSearchParams();
        if (filters.skip !== undefined) params.append('skip', String(filters.skip));
        if (filters.limit !== undefined) params.append('limit', String(filters.limit));
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.customer_id) params.append('customer_id', String(filters.customer_id));
        if (filters.product_id) params.append('product_id', String(filters.product_id));

        const url = params.toString() ? `/reports/sales?${params.toString()}` : '/reports/sales';
        return http.get<SalesReportResponse>(url);
    },

    /**
     * Export sales report to CSV
     */
    async exportSalesReport(filters: Omit<SalesReportFilters, 'skip' | 'limit'> = {}): Promise<Blob> {
        const params = new URLSearchParams();
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.customer_id) params.append('customer_id', String(filters.customer_id));
        if (filters.product_id) params.append('product_id', String(filters.product_id));

        const url = params.toString() ? `/reports/sales/export?${params.toString()}` : '/reports/sales/export';
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}${url}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    },

    /**
     * Get purchase report
     */
    async getPurchaseReport(filters: PurchaseReportFilters = {}): Promise<PurchaseReportResponse> {
        const params = new URLSearchParams();
        if (filters.skip !== undefined) params.append('skip', String(filters.skip));
        if (filters.limit !== undefined) params.append('limit', String(filters.limit));
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.supplier_id) params.append('supplier_id', String(filters.supplier_id));
        if (filters.product_id) params.append('product_id', String(filters.product_id));

        const url = params.toString() ? `/reports/purchases?${params.toString()}` : '/reports/purchases';
        return http.get<PurchaseReportResponse>(url);
    },

    /**
     * Export purchase report to CSV
     */
    async exportPurchaseReport(filters: Omit<PurchaseReportFilters, 'skip' | 'limit'> = {}): Promise<Blob> {
        const params = new URLSearchParams();
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.supplier_id) params.append('supplier_id', String(filters.supplier_id));
        if (filters.product_id) params.append('product_id', String(filters.product_id));

        const url = params.toString() ? `/reports/purchases/export?${params.toString()}` : '/reports/purchases/export';
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}${url}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    },

    /**
     * Get stock movements report
     */
    async getStockMovementsReport(filters: StockMovementReportFilters = {}): Promise<StockMovementReportResponse> {
        const params = new URLSearchParams();
        if (filters.skip !== undefined) params.append('skip', String(filters.skip));
        if (filters.limit !== undefined) params.append('limit', String(filters.limit));
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.product_id) params.append('product_id', String(filters.product_id));
        if (filters.warehouse_id) params.append('warehouse_id', String(filters.warehouse_id));
        if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

        const url = params.toString() ? `/reports/stock-movements?${params.toString()}` : '/reports/stock-movements';
        return http.get<StockMovementReportResponse>(url);
    },

    /**
     * Export stock movements report to CSV
     */
    async exportStockMovementsReport(filters: Omit<StockMovementReportFilters, 'skip' | 'limit'> = {}): Promise<Blob> {
        const params = new URLSearchParams();
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.product_id) params.append('product_id', String(filters.product_id));
        if (filters.warehouse_id) params.append('warehouse_id', String(filters.warehouse_id));
        if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

        const url = params.toString() ? `/reports/stock-movements/export?${params.toString()}` : '/reports/stock-movements/export';
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}${url}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    },
};
