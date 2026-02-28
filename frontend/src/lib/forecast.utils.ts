// Forecast utilities for generating realistic time-series data

export interface ForecastDataPoint {
    date: string;
    actual?: number;
    forecast?: number;
    confidenceLow?: number;
    confidenceHigh?: number;
}

interface ForecastResult {
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

// Simple hash function for deterministic randomness
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// Seeded random number generator for deterministic results
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next(): number {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Generate realistic time-series data with trend and seasonality
export function generateForecast(
    productId: string,
    horizonDays: 7 | 30
): ForecastResult {
    const seed = hashCode(productId);
    const rng = new SeededRandom(seed);

    // Product-specific baseline (10-100 units/day)
    const baselineMin = 10;
    const baselineMax = 100;
    const baseline = baselineMin + (rng.next() * (baselineMax - baselineMin));

    // Trend direction and magnitude
    const trendDirection = rng.next() > 0.5 ? 1 : -1;
    const trendStrength = rng.next() * 0.3; // Max 30% change over period

    // Weekly pattern (some products sell more on certain days)
    const weeklyPattern = Array(7).fill(0).map(() => 0.8 + rng.next() * 0.4);

    const today = new Date();
    const historical: ForecastDataPoint[] = [];
    const forecast: ForecastDataPoint[] = [];

    // Generate historical data (last 14 days)
    for (let i = -14; i < 0; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        const dayOfWeek = date.getDay();

        // Calculate value with trend and weekly pattern
        const trendFactor = 1 + (trendDirection * trendStrength * ((i + 14) / 14));
        const weeklyFactor = weeklyPattern[dayOfWeek];
        const noise = 0.9 + rng.next() * 0.2; // ±10% noise

        const value = Math.round(baseline * trendFactor * weeklyFactor * noise);

        historical.push({
            date: dateStr,
            actual: Math.max(0, value),
        });
    }

    // Generate forecast data
    let forecastTotal = 0;
    let peakValue = 0;
    let peakDate = '';

    for (let i = 0; i < horizonDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        const dayOfWeek = date.getDay();

        // Continue trend from historical
        const trendFactor = 1 + (trendDirection * trendStrength * ((i + 14) / 14));
        const weeklyFactor = weeklyPattern[dayOfWeek];
        const forecastNoise = 0.95 + rng.next() * 0.1; // Less noise in forecast

        const forecastValue = Math.round(baseline * trendFactor * weeklyFactor * forecastNoise);
        const clampedValue = Math.max(0, forecastValue);

        // Confidence interval (±20% for near-term, widens over time)
        const confidenceWidth = 0.15 + (i / horizonDays) * 0.15; // 15-30%
        const confidenceLow = Math.max(0, Math.round(clampedValue * (1 - confidenceWidth)));
        const confidenceHigh = Math.round(clampedValue * (1 + confidenceWidth));

        forecast.push({
            date: dateStr,
            forecast: clampedValue,
            confidenceLow,
            confidenceHigh,
        });

        forecastTotal += clampedValue;

        if (clampedValue > peakValue) {
            peakValue = clampedValue;
            peakDate = dateStr;
        }
    }

    const avgDailyDemand = Math.round(forecastTotal / horizonDays);

    return {
        historical,
        forecast,
        metrics: {
            predictedTotal: forecastTotal,
            avgDailyDemand,
            peakDay: {
                date: peakDate,
                value: peakValue,
            },
        },
    };
}

// Combine historical and forecast for chart display
export function getCombinedChartData(result: ForecastResult): ForecastDataPoint[] {
    return [...result.historical, ...result.forecast];
}
