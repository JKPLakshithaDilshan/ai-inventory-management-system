/**
 * Products Service
 * API calls for product management
 */

import { http } from './http';
import type { PaginatedResponse } from '@/types/common';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

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
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
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
  is_active?: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

/**
 * Product API service methods
 */
export const productApi = {
  /**
   * Get all products with pagination
   */
  async list(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    stock_status?: string;
  }): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams();
    
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.category_id !== undefined) query.append('category_id', String(params.category_id));
    if (params?.stock_status) query.append('stock_status', params.stock_status);

    const url = query.toString() ? `/products?${query.toString()}` : '/products';
    return http.get(url);
  },

  /**
   * Get single product by ID
   */
  async getById(id: number): Promise<Product> {
    return http.get(`/products/${id}`);
  },

  /**
   * Create a new product
   */
  async create(data: ProductCreateInput): Promise<Product> {
    return http.post('/products', data);
  },

  /**
   * Update a product
   */
  async update(id: number, data: ProductUpdateInput): Promise<Product> {
    return http.put(`/products/${id}`, data);
  },

  /**
   * Delete a product
   */
  async delete(id: number): Promise<{ message: string }> {
    return http.delete(`/products/${id}`);
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    return http.get('/categories');
  },

  /**
   * Create a new category
   */
  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    return http.post('/categories', data);
  },
};

/**
 * Legacy function wrappers for backwards compatibility
 */
export async function getProducts(
  skip = 0,
  limit = 100,
  search?: string,
  categoryId?: number,
  stockStatus?: string
): Promise<PaginatedResponse<Product>> {
  return productApi.list({ skip, limit, search, category_id: categoryId, stock_status: stockStatus });
}

export async function getProduct(id: number): Promise<Product> {
  return productApi.getById(id);
}

export async function createProduct(data: ProductCreateInput): Promise<Product> {
  return productApi.create(data);
}

export async function updateProduct(id: number, data: Partial<ProductCreateInput>): Promise<Product> {
  return productApi.update(id, data);
}

export async function deleteProduct(id: number): Promise<{ message: string }> {
  return productApi.delete(id);
}
