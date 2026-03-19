import { http } from '@/services/http';
import type { PaginatedResponse } from '@/types/common';

export type SaleStatus = 'draft' | 'completed' | 'cancelled' | 'refunded';

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  notes?: string;
  total_price: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    quantity: number;
  };
  created_at: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  user_id: number;
  warehouse_id: number;
  customer_id?: number;
  sale_date: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  status: SaleStatus;
  payment_status: string;
  tax_amount: number;
  discount_amount: number;
  paid_amount: number;
  subtotal: number;
  total_amount: number;
  notes?: string;
  items: SaleItem[];
  customer?: {
    id: number;
    customer_code: string;
    full_name: string;
    company_name?: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface SaleItemCreateInput {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  notes?: string;
}

export interface SaleCreateInput {
  warehouse_id: number;
  customer_id?: number;
  sale_date: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  tax_amount?: number;
  discount_amount?: number;
  paid_amount?: number;
  notes?: string;
  items: SaleItemCreateInput[];
}

export interface SaleUpdateInput {
  customer_id?: number;
  sale_date?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  status?: SaleStatus;
  tax_amount?: number;
  discount_amount?: number;
  paid_amount?: number;
  notes?: string;
  items?: SaleItemCreateInput[];
}

export interface SaleListParams {
  skip?: number;
  limit?: number;
  status?: SaleStatus;
  payment_status?: string;
}

export const saleApi = {
  async list(params: SaleListParams = {}): Promise<PaginatedResponse<Sale>> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append('skip', String(params.skip));
    if (params.limit !== undefined) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.payment_status) query.append('payment_status', params.payment_status);

    const url = query.toString() ? `/sales?${query.toString()}` : '/sales';
    return http.get(url);
  },

  async getById(saleId: number): Promise<Sale> {
    return http.get(`/sales/${saleId}`);
  },

  async create(data: SaleCreateInput): Promise<Sale> {
    return http.post('/sales', data);
  },

  async update(saleId: number, data: SaleUpdateInput): Promise<Sale> {
    return http.put(`/sales/${saleId}`, data);
  },

  async complete(saleId: number): Promise<Sale> {
    return http.post(`/sales/${saleId}/complete`);
  },

  async delete(saleId: number): Promise<{ message: string }> {
    return http.delete(`/sales/${saleId}`);
  },
};
