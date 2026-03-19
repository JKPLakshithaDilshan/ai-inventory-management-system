import { http } from './http';

export interface ReorderSuggestion {
    product_id: number;
    product_sku: string;
    product_name: string;
    current_stock: number;
    reorder_level: number;
    suggested_order_qty: number;
    avg_daily_sales: number;
    estimated_lead_time_days: number;
    days_until_stockout: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    supplier_id: number | null;
    supplier_name: string | null;
}

export interface ReorderSuggestionsResponse {
    suggestions: ReorderSuggestion[];
    total_count: number;
    critical_count: number;
    high_priority_count: number;
}

export interface ForecastDataPoint {
    date: string;
    qty?: number;
    predicted_qty?: number;
}

export interface DemandForecastResponse {
    product_id: number;
    product_sku: string | null;
    product_name: string | null;
    method: 'weighted_average' | 'moving_average';
    days_history: number;
    days_forecast: number;
    history: ForecastDataPoint[];
    forecast: ForecastDataPoint[];
    avg_daily_demand: number;
    total_forecast_demand: number;
}

export interface SlowMovingStockItem {
    product_id: number;
    product_sku: string;
    product_name: string;
    current_stock: number;
    stock_value: number;
    days_since_last_sale: number;
    last_sale_date: string | null;
    units_sold_last_90_days: number;
    turnover_ratio: number;
    severity: 'dead_stock' | 'critical' | 'slow' | 'moderate';
    recommendation: string;
}

export interface SlowMovingStockResponse {
    items: SlowMovingStockItem[];
    total_count: number;
    dead_stock_count: number;
    total_stock_value: number;
    days_analyzed: number;
}

export interface ReorderSuggestionsParams {
    days_lookback?: number;
    safety_stock_multiplier?: number;
    min_lead_time_days?: number;
}

export interface DemandForecastParams {
    days_history?: number;
    days_forecast?: number;
    method?: 'weighted_average' | 'moving_average';
}

export interface SlowMovingStockParams {
    days_lookback?: number;
    min_days_no_sales?: number;
    turnover_threshold?: number;
}

/**
 * Get AI-powered reorder suggestions
 */
export async function getReorderSuggestions(
    params: ReorderSuggestionsParams = {}
): Promise<ReorderSuggestionsResponse> {
    const queryParams = new URLSearchParams();
    if (params.days_lookback) queryParams.append('days_lookback', params.days_lookback.toString());
    if (params.safety_stock_multiplier) queryParams.append('safety_stock_multiplier', params.safety_stock_multiplier.toString());
    if (params.min_lead_time_days) queryParams.append('min_lead_time_days', params.min_lead_time_days.toString());
    
    const query = queryParams.toString();
    return http.get(`/analytics/reorder-suggestions${query ? `?${query}` : ''}`, { method: 'GET' });
}

/**
 * Get demand forecast for a specific product
 */
export async function getDemandForecast(
    productId: number,
    params: DemandForecastParams = {}
): Promise<DemandForecastResponse> {
    const queryParams = new URLSearchParams();
    if (params.days_history) queryParams.append('days_history', params.days_history.toString());
    if (params.days_forecast) queryParams.append('days_forecast', params.days_forecast.toString());
    if (params.method) queryParams.append('method', params.method);
    
    const query = queryParams.toString();
    return http.get(`/analytics/demand-forecast/${productId}${query ? `?${query}` : ''}`, { method: 'GET' });
}

/**
 * Get slow-moving and dead stock detection
 */
export async function getSlowMovingStock(
    params: SlowMovingStockParams = {}
): Promise<SlowMovingStockResponse> {
    const queryParams = new URLSearchParams();
    if (params.days_lookback) queryParams.append('days_lookback', params.days_lookback.toString());
    if (params.min_days_no_sales) queryParams.append('min_days_no_sales', params.min_days_no_sales.toString());
    if (params.turnover_threshold) queryParams.append('turnover_threshold', params.turnover_threshold.toString());
    
    const query = queryParams.toString();
    return http.get(`/analytics/slow-moving-stock${query ? `?${query}` : ''}`, { method: 'GET' });
}
