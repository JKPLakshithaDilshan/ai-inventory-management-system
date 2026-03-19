/**
 * Warehouse API Service
 */

import { http } from './http';
import type { PaginatedResponse } from '@/types/common';

export interface Warehouse {
    id: number;
    code: string;
    name: string;
    address?: string;
    city?: string;
    contact_person?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateWarehouseInput {
    code: string;
    name: string;
    address?: string;
    city?: string;
    contact_person?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
}

export type WarehouseUpdateInput = Partial<CreateWarehouseInput>;

/**
 * Warehouse API endpoints
 */
export const warehouseApi = {
    async list(params?: { skip?: number; limit?: number; search?: string; is_active?: boolean }) {
        const query = new URLSearchParams();
        if (params?.skip !== undefined) query.append('skip', String(params.skip));
        if (params?.limit !== undefined) query.append('limit', String(params.limit));
        if (params?.search) query.append('search', params.search);
        if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
        
        const url = query.toString() ? `/warehouses?${query.toString()}` : '/warehouses';
        return http.get<PaginatedResponse<Warehouse>>(url);
    },

    async getById(id: number) {
        return http.get<Warehouse>(`/warehouses/${id}`);
    },

    async create(data: CreateWarehouseInput) {
        return http.post<Warehouse>('/warehouses', data);
    },

    async update(id: number, data: WarehouseUpdateInput) {
        return http.patch<Warehouse>(`/warehouses/${id}`, data);
    },

    async delete(id: number) {
        return http.delete<{ message: string }>(`/warehouses/${id}`);
    },
};

/**
 * Legacy function wrappers for backwards compatibility
 */
export async function getWarehouses(
    skip = 0,
    limit = 100,
    search?: string,
    isActive?: boolean
): Promise<PaginatedResponse<Warehouse>> {
    return warehouseApi.list({ skip, limit, search, is_active: isActive });
}

export async function getWarehouse(id: number): Promise<Warehouse> {
    return warehouseApi.getById(id);
}

export async function createWarehouse(data: CreateWarehouseInput): Promise<Warehouse> {
    return warehouseApi.create(data);
}

export async function updateWarehouse(id: number, data: WarehouseUpdateInput): Promise<Warehouse> {
    return warehouseApi.update(id, data);
}

export async function deleteWarehouse(id: number): Promise<{ message: string }> {
    return warehouseApi.delete(id);
}
