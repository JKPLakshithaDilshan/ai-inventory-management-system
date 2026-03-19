/**
 * Stock Ledger API Service
 * Immutable audit trail of all stock changes
 */

import { http } from './http';
import type { PaginatedResponse } from '@/types/common';

export type StockTransactionType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';

export interface StockLedgerEntry {
    id: number;
    product_id: number;
    warehouse_id: number;
    type: StockTransactionType;
    qty_change: number;
    qty_before: number;
    qty_after: number;
    reference_type?: string;
    reference_id?: number;
    note?: string;
    created_by?: number;
    created_at: string;
    product?: {
        id: number;
        sku: string;
        name: string;
    };
    warehouse?: {
        id: number;
        code: string;
        name: string;
    };
}

export interface StockLedgerFilter {
    page?: number;
    page_size?: number;
    product_id?: number;
    warehouse_id?: number;
    type?: StockTransactionType;
    date_from?: string;
    date_to?: string;
    reference_type?: string;
}

/**
 * Stock Ledger API endpoints
 */
export const stockLedgerApi = {
    async list(filters: StockLedgerFilter = {}) {
        const query = new URLSearchParams();
        if (filters.page !== undefined) query.append('page', String(filters.page));
        if (filters.page_size !== undefined) query.append('page_size', String(filters.page_size));
        if (filters.product_id !== undefined) query.append('product_id', String(filters.product_id));
        if (filters.warehouse_id !== undefined) query.append('warehouse_id', String(filters.warehouse_id));
        if (filters.type) query.append('type', filters.type);
        if (filters.date_from) query.append('date_from', filters.date_from);
        if (filters.date_to) query.append('date_to', filters.date_to);
        if (filters.reference_type) query.append('reference_type', filters.reference_type);

        const url = query.toString() ? `/stock-ledger?${query.toString()}` : '/stock-ledger';
        return http.get<PaginatedResponse<StockLedgerEntry>>(url);
    },

    async getById(id: number) {
        return http.get<StockLedgerEntry>(`/stock-ledger/${id}`);
    },

    /**
     * Get stock movement history for a product
     */
    async getProductHistory(productId: number, limit = 50) {
        return http.get<StockLedgerEntry[]>(`/stock-ledger?product_id=${productId}&page_size=${limit}`);
    },

    /**
     * Get stock movement history for a warehouse
     */
    async getWarehouseHistory(warehouseId: number, limit = 50) {
        return http.get<PaginatedResponse<StockLedgerEntry>>(`/stock-ledger?warehouse_id=${warehouseId}&page_size=${limit}`);
    },
};
