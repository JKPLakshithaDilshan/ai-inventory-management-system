import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getMovingAverageForecast, type MovingAverageForecastResponse } from '@/services/forecast';
import type { Product } from '@/services/products';

interface ForecastPanelProps {
    products: Product[];
}

export function ForecastPanel({ products }: ForecastPanelProps) {
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [forecastData, setForecastData] = useState<MovingAverageForecastResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedProductId && products.length > 0) {
            setSelectedProductId(String(products[0].id));
        }
    }, [products, selectedProductId]);

    const loadForecast = useCallback(async () => {
        if (!selectedProductId) return;
        try {
            setIsLoading(true);
            setError(null);
            const response = await getMovingAverageForecast(Number(selectedProductId), 7, 14);
            setForecastData(response);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load forecast');
        } finally {
            setIsLoading(false);
        }
    }, [selectedProductId]);

    useEffect(() => {
        if (selectedProductId) {
            void loadForecast();
        }
    }, [selectedProductId, loadForecast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Forecast (Moving Average)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger className="w-[320px]">
                            <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map((product) => (
                                <SelectItem key={product.id} value={String(product.id)}>
                                    {product.name} ({product.sku})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={loadForecast} disabled={isLoading || !selectedProductId}>
                        Refresh Forecast
                    </Button>
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading forecast...</p>
                ) : error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : forecastData ? (
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left p-2">Date</th>
                                    <th className="text-left p-2">Predicted Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecastData.forecast.map((row) => (
                                    <tr key={row.date} className="border-t">
                                        <td className="p-2">{row.date}</td>
                                        <td className="p-2">{row.predicted_qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No forecast data yet.</p>
                )}
            </CardContent>
        </Card>
    );
}
