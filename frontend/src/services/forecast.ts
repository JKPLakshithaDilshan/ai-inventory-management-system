import { http } from './http';

export interface ForecastHistoryPoint {
    date: string;
    qty: number;
}

export interface ForecastPredictionPoint {
    date: string;
    predicted_qty: number;
}

export interface MovingAverageForecastResponse {
    product_id: number;
    window: number;
    days: number;
    history: ForecastHistoryPoint[];
    forecast: ForecastPredictionPoint[];
}

export async function getMovingAverageForecast(
    productId: number,
    window = 7,
    days = 14
): Promise<MovingAverageForecastResponse> {
    const params = new URLSearchParams({
        product_id: String(productId),
        window: String(window),
        days: String(days),
    });

    return http.get<MovingAverageForecastResponse>(`/forecast/moving-average?${params.toString()}`);
}
