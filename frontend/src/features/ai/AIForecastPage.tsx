import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { mockProducts } from '@/lib/mockData';
import { getForecast, type ForecastResponse } from '@/services/ai.api';
import { getCombinedChartData } from '@/lib/forecast.utils';
import {
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
} from 'recharts';
import { Check, ChevronsUpDown, TrendingUp, Calendar, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function AIForecastPage() {
    const [selectedProduct, setSelectedProduct] = useState(mockProducts[0]);
    const [horizon, setHorizon] = useState<7 | 30>(7);
    const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Load forecast data when product or horizon changes
    useEffect(() => {
        if (!selectedProduct) return;

        const loadForecast = async () => {
            setIsLoading(true);
            try {
                const data = await getForecast(selectedProduct.id, selectedProduct.name, horizon);
                setForecastData(data);
            } catch (error) {
                console.error('Failed to load forecast:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadForecast();
    }, [selectedProduct, horizon]);

    // Prepare chart data
    const chartData = forecastData ? getCombinedChartData(forecastData) : [];

    // Custom tooltip for chart
    type ForecastTooltipPayload = {
        date: string;
        actual?: number;
        forecast?: number;
        confidenceLow?: number;
        confidenceHigh?: number;
    };

    const CustomTooltip = ({
        active,
        payload,
    }: {
        active?: boolean;
        payload?: Array<{ payload: ForecastTooltipPayload }>;
    }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium mb-2">
                        {format(new Date(data.date), 'MMM dd, yyyy')}
                    </p>
                    {data.actual !== undefined && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                            Actual: <span className="font-semibold">{data.actual} units</span>
                        </p>
                    )}
                    {data.forecast !== undefined && (
                        <>
                            <p className="text-sm text-primary">
                                Forecast: <span className="font-semibold">{data.forecast} units</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Range: {data.confidenceLow} - {data.confidenceHigh}
                            </p>
                        </>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="AI Demand Forecast"
                description="Predict future demand using AI-powered time-series analysis."
            />

            {/* Controls Section */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        {/* Product Selector */}
                        <div className="flex-1 w-full md:w-auto">
                            <label className="text-sm font-medium mb-2 block">Select Product</label>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full md:w-[350px] justify-between"
                                    >
                                        <span className="truncate">
                                            {selectedProduct ? selectedProduct.name : "Select product..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search products..." />
                                        <CommandList>
                                            <CommandEmpty>No product found.</CommandEmpty>
                                            <CommandGroup>
                                                {mockProducts.map((product) => (
                                                    <CommandItem
                                                        key={product.id}
                                                        value={product.name}
                                                        onSelect={() => {
                                                            setSelectedProduct(product);
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedProduct?.id === product.id
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{product.name}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {product.sku}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Horizon Toggle */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Forecast Horizon</label>
                            <div className="flex gap-2">
                                <Button
                                    variant={horizon === 7 ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setHorizon(7)}
                                >
                                    7 Days
                                </Button>
                                <Button
                                    variant={horizon === 30 ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setHorizon(30)}
                                >
                                    30 Days
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            {forecastData && !isLoading && (
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        title="Predicted Total Sales"
                        value={forecastData.metrics.predictedTotal}
                        description={`Next ${horizon} days`}
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="Average Daily Demand"
                        value={forecastData.metrics.avgDailyDemand}
                        description="Units per day"
                        icon={Sparkles}
                    />
                    <StatCard
                        title="Peak Forecast Day"
                        value={forecastData.metrics.peakDay.value}
                        description={format(new Date(forecastData.metrics.peakDay.date), 'MMM dd, yyyy')}
                        icon={Calendar}
                    />
                </div>
            )}

            {/* Chart Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Demand Forecast Chart</CardTitle>
                    <CardDescription>
                        Historical data (last 14 days) and AI-predicted demand (next {horizon} days)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[400px]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-muted-foreground">Generating forecast...</p>
                            </div>
                        </div>
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                    className="text-xs"
                                />
                                <YAxis className="text-xs" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />

                                {/* Confidence Band (Area) */}
                                <Area
                                    type="monotone"
                                    dataKey="confidenceHigh"
                                    stroke="none"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.1}
                                    name="Confidence Range"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="confidenceLow"
                                    stroke="none"
                                    fill="hsl(var(--background))"
                                    fillOpacity={1}
                                />

                                {/* Historical Actual Line */}
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', r: 3 }}
                                    name="Historical Sales"
                                    connectNulls={false}
                                />

                                {/* Forecast Line */}
                                <Line
                                    type="monotone"
                                    dataKey="forecast"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                                    name="AI Forecast"
                                    connectNulls={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                            Select a product to view forecast
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Explanation Card */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Info className="h-5 w-5 text-primary" />
                        How This Works
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong>Forecast generated using time-series trend estimation</strong> based on 
                        historical sales patterns. The AI model analyzes past demand, identifies trends, 
                        and projects future requirements.
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Blue solid line represents actual historical sales (last 14 days)</li>
                        <li>Dashed line shows AI-predicted demand (next {horizon} days)</li>
                        <li>Shaded area indicates confidence interval (prediction accuracy range)</li>
                        <li>Algorithm accounts for weekly patterns and trending behavior</li>
                    </ul>
                    <p className="text-xs pt-2 italic">
                        Note: This is a demonstration using simulated data. Production systems would use 
                        real sales history and advanced ML models.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
