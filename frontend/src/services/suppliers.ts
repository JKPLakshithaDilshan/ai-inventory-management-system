/**
 * Suppliers Service
 * API calls for supplier management
 */

import { http } from './http';
import type { PaginatedResponse } from '@/types/common';

export interface Supplier {
    id: number;
    name: string;
    code: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
    contact_person?: string | null;
    tax_id?: string | null;
    payment_terms?: string | null;
    notes?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SupplierCreateInput {
    name: string;
    code: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    contact_person?: string;
    tax_id?: string;
    payment_terms?: string;
    notes?: string;
    is_active?: boolean;
}

export type SupplierUpdateInput = Partial<SupplierCreateInput>;


/**
 * Supplier API service methods
 */
export const supplierApi = {
    async list(params?: {
        skip?: number;
        limit?: number;
        search?: string;
        is_active?: boolean;
    }): Promise<PaginatedResponse<Supplier>> {
        const query = new URLSearchParams();
        
        if (params?.skip !== undefined) query.append('skip', String(params.skip));
        if (params?.limit !== undefined) query.append('limit', String(params.limit));
        if (params?.search) query.append('search', params.search);
        if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

        const url = query.toString() ? `/suppliers?${query.toString()}` : '/suppliers';
        return http.get(url);
    },

    async getById(id: number): Promise<Supplier> {
        return http.get(`/suppliers/${id}`);
    },

    async create(data: SupplierCreateInput): Promise<Supplier> {
        return http.post('/suppliers', data);
    },

    async update(id: number, data: SupplierUpdateInput): Promise<Supplier> {
        return http.put(`/suppliers/${id}`, data);
    },

    async delete(id: number): Promise<{ message: string }> {
        return http.delete(`/suppliers/${id}`);
    },
};

/**
 * Legacy function wrappers for backwards compatibility
 */
export async function getSuppliers(
    skip = 0,
    limit = 100,
    search?: string,
    isActive?: boolean
): Promise<PaginatedResponse<Supplier>> {
    return supplierApi.list({ skip, limit, search, is_active: isActive });
}

export async function getSupplier(id: number): Promise<Supplier> {
    return supplierApi.getById(id);
}

export async function createSupplier(data: SupplierCreateInput): Promise<Supplier> {
    return supplierApi.create(data);
}

export async function updateSupplier(id: number, data: SupplierUpdateInput): Promise<Supplier> {
    return supplierApi.update(id, data);
}

export async function deleteSupplier(id: number): Promise<{ message: string }> {
    return supplierApi.delete(id);
}
