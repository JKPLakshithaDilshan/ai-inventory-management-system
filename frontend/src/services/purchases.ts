import { http } from "@/services/http";

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

export interface PurchaseItemCreateInput {
  product_id: number;
  quantity: number;
  unit_price: number;
  batch_number?: string;
  expiry_date?: string;
  manufacture_date?: string;
  notes?: string;
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
  status: "draft" | "ordered" | "received" | "cancelled";
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
    email: string;
    phone: string;
  };
  created_at: string;
  updated_at: string;
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
  status?: string;
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

export interface PaginatedPurchases {
  items: Purchase[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// API Methods
export async function getPurchases(
  skip: number = 0,
  limit: number = 100,
  status?: string,
  supplier_id?: number
): Promise<PaginatedPurchases> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  if (status) params.append("status", status);
  if (supplier_id) params.append("supplier_id", supplier_id.toString());

  const response = await http.get(`/api/v1/purchases?${params}`);
  return (response as any).data;
}

export async function getPurchaseById(purchaseId: number): Promise<Purchase> {
  const response = await http.get(`/api/v1/purchases/${purchaseId}`);
  return (response as any).data;
}

export async function createPurchase(
  data: PurchaseCreateInput
): Promise<Purchase> {
  const response = await http.post("/api/v1/purchases", data);
  return (response as any).data;
}

export async function updatePurchase(
  purchaseId: number,
  data: PurchaseUpdateInput
): Promise<Purchase> {
  const response = await http.put(`/api/v1/purchases/${purchaseId}`, data);
  return (response as any).data;
}

export async function deletePurchase(purchaseId: number): Promise<void> {
  await http.delete(`/api/v1/purchases/${purchaseId}`);
}

export async function receivePurchase(
  purchaseId: number,
  items: ReceiveItemInput[],
  received_date: string
): Promise<Purchase> {
  const response = await http.post(`/api/v1/purchases/${purchaseId}/receive`, {
    items,
    received_date,
  });
  return (response as any).data;
}
