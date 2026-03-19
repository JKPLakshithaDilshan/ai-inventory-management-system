import { http } from '@/services/http';
import type { PaginatedResponse } from '@/types/common';

export type CustomerType = 'individual' | 'business';

export interface Customer {
  id: number;
  customer_code: string;
  full_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  customer_type: CustomerType;
  credit_limit: number;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateInput {
  customer_code: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  customer_type: CustomerType;
  credit_limit?: number;
  is_active?: boolean;
  notes?: string;
}

export interface CustomerUpdateInput extends Partial<CustomerCreateInput> {}

export interface CustomerListParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  customer_type?: CustomerType;
}

export interface CustomerSummary {
  customer: Customer;
  total_orders: number;
  total_purchase_value: number;
  recent_sales: Array<{
    id: number;
    invoice_number: string;
    sale_date: string;
    status: string;
    total_amount: number;
    created_at: string;
  }>;
}

export function buildCustomersListQuery(params: CustomerListParams = {}): string {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', String(params.skip));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.search) query.append('search', params.search);
  if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
  if (params.customer_type) query.append('customer_type', params.customer_type);
  return query.toString();
}

export const customerApi = {
  async list(params: CustomerListParams = {}): Promise<PaginatedResponse<Customer>> {
    const query = buildCustomersListQuery(params);
    const url = query ? `/customers?${query}` : '/customers';
    return http.get(url);
  },

  async getById(customerId: number): Promise<Customer> {
    return http.get(`/customers/${customerId}`);
  },

  async getSummary(customerId: number): Promise<CustomerSummary> {
    return http.get(`/customers/${customerId}/summary`);
  },

  async create(data: CustomerCreateInput): Promise<Customer> {
    return http.post('/customers', data);
  },

  async update(customerId: number, data: CustomerUpdateInput): Promise<Customer> {
    return http.patch(`/customers/${customerId}`, data);
  },

  async delete(customerId: number): Promise<{ message: string }> {
    return http.delete(`/customers/${customerId}`);
  },
};

export async function getCustomers(params: CustomerListParams = {}): Promise<PaginatedResponse<Customer>> {
  return customerApi.list(params);
}

export async function getCustomer(customerId: number): Promise<Customer> {
  return customerApi.getById(customerId);
}

export async function createCustomer(data: CustomerCreateInput): Promise<Customer> {
  return customerApi.create(data);
}

export async function updateCustomer(customerId: number, data: CustomerUpdateInput): Promise<Customer> {
  return customerApi.update(customerId, data);
}

export async function deleteCustomer(customerId: number): Promise<{ message: string }> {
  return customerApi.delete(customerId);
}
