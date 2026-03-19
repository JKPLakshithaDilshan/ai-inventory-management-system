/**
 * Common Types & Interfaces
 * Shared across all API services
 */

/**
 * Pagination metadata returned by backend
 */
export interface PaginationMeta {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * Paginated response wrapper from backend
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * Standard error response from backend
 */
export interface ErrorResponse {
    detail: string | Record<string, any>;
    status_code?: number;
    message?: string;
}

/**
 * Request options for API calls
 */
export interface ApiRequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, any>;
}

/**
 * Generic API response envelope
 */
export interface ApiResponse<T> {
    data: T;
    error?: ErrorResponse;
    status: 'success' | 'error';
}
