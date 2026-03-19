/**
 * Stock Movements Report Tab
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Filter, RefreshCw, Package, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { reportsApi, type StockMovementReportItem, type StockMovementReportSummary } from '@/services/reports';

export function StockMovementsReportTab() {
    const [data, setData] = useState<StockMovementReportItem[]>([]);
    const [summary, setSummary] = useState<StockMovementReportSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Date filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    const loadReport = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await reportsApi.getStockMovementsReport({
                skip: (page - 1) * limit,
                limit,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            setData(response.items);
            setSummary(response.summary);
            setTotalPages(response.total_pages);
        } catch (err) {
            console.error('Failed to load stock movement report:', err);
            setError(err instanceof Error ? err.message : 'Failed to load report');
        } finally {
            setIsLoading(false);
        }
    }, [page, dateFrom, dateTo, limit]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await reportsApi.exportStockMovementsReport({
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock_movements_report_${new Date().toISOString().split('T')[0]}.csv`;
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

    const getTransactionTypeBadge = (type: string) => {
        switch (type.toLowerCase()) {
            case 'in':
                return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">IN</Badge>;
            case 'out':
                return <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">OUT</Badge>;
            case 'adjust':
                return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">ADJUST</Badge>;
            case 'transfer':
                return <Badge variant="default" className="bg-amber-100 text-amber-800 border-amber-200">TRANSFER</Badge>;
            default:
                return <Badge variant="secondary">{type}</Badge>;
        }
    };

    const formatQuantity = (qty: number, type: string) => {
        const prefix = type.toLowerCase() === 'in' || type.toLowerCase() === 'adjust' && qty > 0 ? '+' : '';
        return `${prefix}${qty}`;
    };

    return (
        <div className="space-y-6">
            {/* Header with Export Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Stock Movements Report</h2>
                    <p className="text-muted-foreground">Inventory transaction history and activity</p>
                </div>
                <Button onClick={handleExport} disabled={isExporting || isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && !isLoading && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_movements}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Units Moved</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_units_moved}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inbound</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{summary.total_inbound}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Outbound</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.total_outbound}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                        <div className="flex-1 min-w-[200px]">
                            <Label htmlFor="date-from">From Date</Label>
                            <Input
                                id="date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <Label htmlFor="date-to">To Date</Label>
                            <Input
                                id="date-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
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
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No stock movements found for the selected period</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Warehouse</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Qty Change</TableHead>
                                            <TableHead className="text-right">Before</TableHead>
                                            <TableHead className="text-right">After</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((item) => (
                                            <TableRow key={item.ledger_id}>
                                                <TableCell className="font-mono text-sm">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{item.product_name}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{item.warehouse_name}</TableCell>
                                                <TableCell>{getTransactionTypeBadge(item.type)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <span className={
                                                        item.qty_change > 0 ? 'text-green-600' :
                                                        item.qty_change < 0 ? 'text-red-600' : ''
                                                    }>
                                                        {formatQuantity(item.qty_change, item.type)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">{item.qty_before}</TableCell>
                                                <TableCell className="text-right font-medium">{item.qty_after}</TableCell>
                                                <TableCell className="text-sm">
                                                    {item.reference_type ? (
                                                        <div>
                                                            <div className="font-mono">{item.reference_type}</div>
                                                            {item.reference_id && (
                                                                <div className="text-xs text-muted-foreground">#{item.reference_id}</div>
                                                            )}
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                                    {item.note || '-'}
                                                </TableCell>
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
