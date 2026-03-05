/**
 * Products Service
 * API calls for product management
 */

import { http } from './http';

// Type from backend ProductResponse
export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category_id?: number;
  cost_price: number;
  selling_price: number;
  quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  unit: string;
  barcode?: string;
  image_url?: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
    description?: string;
  };
}

export interface ProductCreateInput {
  sku: string;
  name: string;
  description?: string;
  category_id?: number;
  cost_price: number;
  selling_price: number;
  quantity?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  unit?: string;
  barcode?: string;
  image_url?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Get all products with pagination
 */
export async function getProducts(
  skip = 0,
  limit = 100,
  search?: string,
  categoryId?: number,
  stockStatus?: string
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    ...(search && { search }),
    ...(categoryId && { category_id: String(categoryId) }),
    ...(stockStatus && { stock_status: stockStatus }),
  });

  return http.get(`/products?${params}`, {
    method: 'GET',
  });
}

/**
 * Get single product by ID
 */
export async function getProduct(id: number): Promise<Product> {
  return http.get(`/products/${id}`);
}

/**
 * Create a new product
 */
export async function createProduct(
  data: ProductCreateInput
): Promise<Product> {
  return http.post(`/products`, data);
}

/**
 * Update a product
 */
export async function updateProduct(
  id: number,
  data: Partial<ProductCreateInput>
): Promise<Product> {
  return http.put(`/products/${id}`, data);
}

/**
 * Delete a product
 */
export async function deleteProduct(id: number): Promise<{ message: string }> {
  return http.delete(`/products/${id}`);
}
