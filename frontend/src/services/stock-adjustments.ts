import { http } from '@/services/http';
import type { PaginatedResponse } from '@/types/common';

export type StockAdjustmentType = 'increase' | 'decrease';

export interface StockAdjustment {
  id: number;
  product_id: number;
  warehouse_id: number;
  adjustment_type: StockAdjustmentType;
  quantity: number;
  reason: string;
  note?: string | null;
  adjustment_reference?: string | null;
  created_by?: number | null;
  created_at: string;
}

export interface StockAdjustmentCreateInput {
  product_id: number;
  warehouse_id: number;
  adjustment_type: StockAdjustmentType;
  quantity: number;
  reason: string;
  note?: string;
  adjustment_reference?: string;
  allow_negative?: boolean;
}

export interface StockAdjustmentListParams {
  skip?: number;
  limit?: number;
  product_id?: number;
  warehouse_id?: number;
  adjustment_type?: StockAdjustmentType;
  date_from?: string;
  date_to?: string;
}

export interface CurrentStockResponse {
  product_id: number;
  warehouse_id: number;
  quantity: number;
}

export function buildStockAdjustmentsQuery(params: StockAdjustmentListParams = {}): string {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', String(params.skip));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.product_id !== undefined) query.append('product_id', String(params.product_id));
  if (params.warehouse_id !== undefined) query.append('warehouse_id', String(params.warehouse_id));
  if (params.adjustment_type) query.append('adjustment_type', params.adjustment_type);
  if (params.date_from) query.append('date_from', params.date_from);
  if (params.date_to) query.append('date_to', params.date_to);
  return query.toString();
}

export const stockAdjustmentApi = {
  async list(params: StockAdjustmentListParams = {}): Promise<PaginatedResponse<StockAdjustment>> {
    const query = buildStockAdjustmentsQuery(params);
    const url = query ? `/stock-adjustments?${query}` : '/stock-adjustments';
    return http.get(url);
  },

  async getById(adjustmentId: number): Promise<StockAdjustment> {
    return http.get(`/stock-adjustments/${adjustmentId}`);
  },

  async create(data: StockAdjustmentCreateInput): Promise<StockAdjustment> {
    return http.post('/stock-adjustments', data);
  },

  async getCurrentStock(productId: number, warehouseId: number): Promise<CurrentStockResponse> {
    return http.get(`/stock-adjustments/current-stock?product_id=${productId}&warehouse_id=${warehouseId}`);
  },
};

export async function getStockAdjustments(params: StockAdjustmentListParams = {}): Promise<PaginatedResponse<StockAdjustment>> {
  return stockAdjustmentApi.list(params);
}

export async function createStockAdjustment(data: StockAdjustmentCreateInput): Promise<StockAdjustment> {
  return stockAdjustmentApi.create(data);
}
