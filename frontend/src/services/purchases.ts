import { http } from '@/services/http';
import type { PaginatedResponse } from '@/types/common';

export type PurchaseStatus = 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  received_quantity: number;
  batch_number?: string;
  expiry_date?: string;
  manufacture_date?: string;
  notes?: string;
  total_price: number;
  product?: {
    id: number;
    sku: string;
    name: string;
  };
  created_at: string;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_id: number;
  warehouse_id: number;
  user_id: number;
  purchase_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  status: PurchaseStatus;
  tax_amount: number;
  discount_amount: number;
  subtotal: number;
  total_amount: number;
  notes?: string;
  reference_number?: string;
  items: PurchaseItem[];
  supplier?: {
    id: number;
    code: string;
    name: string;
    email?: string;
    phone?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PurchaseItemCreateInput {
  product_id: number;
  quantity: number;
  unit_price: number;
  batch_number?: string;
  expiry_date?: string;
  manufacture_date?: string;
  notes?: string;
}

export interface PurchaseCreateInput {
  supplier_id: number;
  warehouse_id: number;
  purchase_date: string;
  expected_delivery_date?: string;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
  reference_number?: string;
  items: PurchaseItemCreateInput[];
}

export interface PurchaseUpdateInput {
  supplier_id?: number;
  purchase_date?: string;
  expected_delivery_date?: string;
  received_date?: string;
  status?: PurchaseStatus;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
  reference_number?: string;
  items?: PurchaseItemCreateInput[];
}

export interface ReceiveItemInput {
  purchase_item_id: number;
  received_quantity: number;
}

export interface PurchaseListParams {
  skip?: number;
  limit?: number;
  status?: PurchaseStatus;
  supplier_id?: number;
}

export const purchaseApi = {
  async list(params: PurchaseListParams = {}): Promise<PaginatedResponse<Purchase>> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append('skip', String(params.skip));
    if (params.limit !== undefined) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.supplier_id !== undefined) query.append('supplier_id', String(params.supplier_id));

    const url = query.toString() ? `/purchases?${query.toString()}` : '/purchases';
    return http.get(url);
  },

  async getById(purchaseId: number): Promise<Purchase> {
    return http.get(`/purchases/${purchaseId}`);
  },

  async create(data: PurchaseCreateInput): Promise<Purchase> {
    return http.post('/purchases', data);
  },

  async update(purchaseId: number, data: PurchaseUpdateInput): Promise<Purchase> {
    return http.put(`/purchases/${purchaseId}`, data);
  },

  async delete(purchaseId: number): Promise<{ message: string }> {
    return http.delete(`/purchases/${purchaseId}`);
  },

  async receive(purchaseId: number, items: ReceiveItemInput[], received_date: string): Promise<Purchase> {
    return http.post(`/purchases/${purchaseId}/receive`, { items, received_date });
  },

  async markPending(purchaseId: number): Promise<Purchase> {
    return http.put(`/purchases/${purchaseId}`, { status: 'pending' });
  },
};

export async function getPurchases(skip = 0, limit = 100, status?: PurchaseStatus, supplier_id?: number) {
  return purchaseApi.list({ skip, limit, status, supplier_id });
}

export async function getPurchaseById(purchaseId: number) {
  return purchaseApi.getById(purchaseId);
}

export async function createPurchase(data: PurchaseCreateInput) {
  return purchaseApi.create(data);
}

export async function updatePurchase(purchaseId: number, data: PurchaseUpdateInput) {
  return purchaseApi.update(purchaseId, data);
}

export async function deletePurchase(purchaseId: number) {
  return purchaseApi.delete(purchaseId);
}

export async function receivePurchase(purchaseId: number, items: ReceiveItemInput[], received_date: string) {
  return purchaseApi.receive(purchaseId, items, received_date);
}

export async function markPending(purchaseId: number) {
  return purchaseApi.markPending(purchaseId);
}
