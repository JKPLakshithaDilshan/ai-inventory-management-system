/**
 * HTTP Client Service
 * Central place for API configuration and requests
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
    data?: unknown;
}

class HttpClient {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Build full URL from endpoint
     */
    private buildUrl(endpoint: string): string {
        if (endpoint.startsWith('http')) {
            return endpoint; // Already a full URL
        }
        return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    }

    /**
     * Make HTTP GET request
     */
    async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    /**
     * Make HTTP POST request
     */
    async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            data,
        });
    }

    /**
     * Make HTTP PUT request
     */
    async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            data,
        });
    }

    /**
     * Make HTTP DELETE request
     */
    async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Main request method
     */
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { data, headers: customHeaders, ...restOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...customHeaders,
        };

        const config: RequestInit = {
            ...restOptions,
            headers,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const url = this.buildUrl(endpoint);

        // Log request in development
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MODE) {
            console.log(`[HTTP] ${config.method} ${url}`, config.body ? JSON.parse(config.body as string) : '');
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            return result as T;
        } catch (error) {
            // Log errors in development
            if (import.meta.env.DEV) {
                console.error(`[HTTP ERROR] ${config.method} ${url}:`, error);
            }
            throw error;
        }
    }
}

// Export singleton instance
export const http = new HttpClient();

// Export class for testing/advanced usage
export { HttpClient };
