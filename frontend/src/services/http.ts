/**
 * HTTP Client Service
 * Central place for API configuration and requests
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
    data?: unknown;
    isFormData?: boolean;
    skipAuth?: boolean;
}

class HttpClient {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Get JWT token from localStorage
     */
    private getAuthToken(): string | null {
        return localStorage.getItem('access_token');
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
     * Make HTTP POST with form data (for OAuth2)
     */
    async postForm<T>(endpoint: string, data: Record<string, string>, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            data,
            isFormData: true,
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
     * Make HTTP PATCH request
     */
    async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
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
        const { data, headers: customHeaders, isFormData, skipAuth, ...restOptions } = options;

        const headers = new Headers(customHeaders || {});

        // Set appropriate Content-Type
        if (isFormData) {
            headers.set('Content-Type', 'application/x-www-form-urlencoded');
        } else {
            headers.set('Content-Type', 'application/json');
        }

        // Add JWT token if available
        const token = this.getAuthToken();
        if (token && !skipAuth && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const config: RequestInit = {
            ...restOptions,
            headers,
            mode: 'cors',
        };

        // Handle request body
        if (data) {
            if (isFormData) {
                // For form data (OAuth2 login)
                const params = new URLSearchParams();
                Object.entries(data as Record<string, string>).forEach(([key, value]) => {
                    params.append(key, value);
                });
                config.body = params.toString();
            } else {
                // For JSON data
                config.body = JSON.stringify(data);
            }
        }

        const url = this.buildUrl(endpoint);

        // Log request in development
        if (import.meta.env.DEV) {
            console.log(`[HTTP] ${config.method} ${url}`, {
                hasAuth: !!token,
                contentType: headers.get('Content-Type'),
                data,
            });
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.detail || errorData.message || response.statusText || 'Request failed';
                throw new Error(`[${response.status}] ${message}`);
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
