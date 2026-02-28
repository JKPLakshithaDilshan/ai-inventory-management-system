// Mock AI API functions

import { generateForecast, type ForecastDataPoint } from '@/lib/forecast.utils';

export interface ForecastResponse {
    productId: string;
    productName: string;
    horizon: 7 | 30;
    generatedAt: string;
    historical: ForecastDataPoint[];
    forecast: ForecastDataPoint[];
    metrics: {
        predictedTotal: number;
        avgDailyDemand: number;
        peakDay: {
            date: string;
            value: number;
        };
    };
}

// Mock API: Get forecast for a product
export async function getForecast(
    productId: string,
    productName: string,
    horizon: 7 | 30 = 7
): Promise<ForecastResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = generateForecast(productId, horizon);

    return {
        productId,
        productName,
        horizon,
        generatedAt: new Date().toISOString(),
        historical: result.historical,
        forecast: result.forecast,
        metrics: result.metrics,
    };
}
