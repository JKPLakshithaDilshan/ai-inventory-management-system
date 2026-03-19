/**
 * Inventory Report Tab
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Filter, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { reportsApi, type InventoryReportItem, type StockStatus } from '@/services/reports';

export function InventoryReportTab() {
    const [data, setData] = useState<InventoryReportItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Filters
    const [category, setCategory] = useState<string>('all');
    const [stockStatus, setStockStatus] = useState<StockStatus | 'all'>('all');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    const loadReport = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await reportsApi.getInventoryReport({
                skip: (page - 1) * limit,
                limit,
                category: category === 'all' ? undefined : category,
                stock_status: stockStatus === 'all' ? undefined : stockStatus,
            });
            setData(response.items);
            setTotalPages(response.total_pages);
        } catch (err) {
            console.error('Failed to load inventory report:', err);
            setError(err instanceof Error ? err.message : 'Failed to load report');
        } finally {
            setIsLoading(false);
        }
    }, [page, category, stockStatus, limit]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await reportsApi.exportInventoryReport({
                category: category === 'all' ? undefined : category,
                stock_status: stockStatus === 'all' ? undefined : stockStatus,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Export failed:', err);
            setError('Failed to export report');
        } finally {
            setIsExporting(false);
        }
    };

    const getStockStatusBadge = (status: string) => {
        switch (status) {
            case 'in_stock':
                return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
            case 'low_stock':
                return <Badge variant="default" className="bg-amber-100 text-amber-800 border-amber-200">Low Stock</Badge>;
            case 'out_of_stock':
                return <Badge variant="destructive">Out of Stock</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    // Get unique categories from data
    const categories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));

    return (
        <div className="space-y-6">
            {/* Header with Export Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Inventory Summary Report</h2>
                    <p className="text-muted-foreground">Current stock levels and values across all products</p>
                </div>
                <Button onClick={handleExport} disabled={isExporting || isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={stockStatus} onValueChange={(v) => setStockStatus(v as StockStatus | 'all')}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Stock Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                                <SelectItem value="low_stock">Low Stock</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setCategory('all');
                                setStockStatus('all');
                            }}
                        >
                            Clear Filters
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadReport}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Report Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No inventory data found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Cost Price</TableHead>
                                            <TableHead className="text-right">Selling Price</TableHead>
                                            <TableHead className="text-right">Stock Value</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Reorder Level</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((item) => (
                                            <TableRow key={item.product_id}>
                                                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.category || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    {item.quantity} {item.unit || ''}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.selling_price)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(item.stock_value)}</TableCell>
                                                <TableCell>{getStockStatusBadge(item.stock_status)}</TableCell>
                                                <TableCell className="text-right">{item.reorder_level}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-4 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        Page {page} of {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
