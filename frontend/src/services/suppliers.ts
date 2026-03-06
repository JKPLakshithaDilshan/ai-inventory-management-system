import { http } from './http';

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

export interface SupplierUpdateInput extends Partial<SupplierCreateInput> {}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export async function getSuppliers(
    skip = 0,
    limit = 100,
    search?: string,
    isActive?: boolean
): Promise<PaginatedResponse<Supplier>> {
    const params = new URLSearchParams({
        skip: String(skip),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(typeof isActive === 'boolean' ? { is_active: String(isActive) } : {}),
    });

    return http.get(`/suppliers?${params}`, { method: 'GET' });
}

export async function getSupplier(id: number): Promise<Supplier> {
    return http.get(`/suppliers/${id}`);
}

export async function createSupplier(data: SupplierCreateInput): Promise<Supplier> {
    return http.post('/suppliers', data);
}

export async function updateSupplier(id: number, data: SupplierUpdateInput): Promise<Supplier> {
    return http.put(`/suppliers/${id}`, data);
}

export async function deleteSupplier(id: number): Promise<{ message: string }> {
    return http.delete(`/suppliers/${id}`);
}
