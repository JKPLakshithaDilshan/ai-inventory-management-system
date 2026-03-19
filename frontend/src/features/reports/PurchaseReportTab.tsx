/**
 * Purchase Report Tab
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Filter, RefreshCw, ShoppingCart, DollarSign, TrendingDown } from 'lucide-react';
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
import { reportsApi, type PurchaseReportItem, type PurchaseReportSummary } from '@/services/reports';

export function PurchaseReportTab() {
    const [data, setData] = useState<PurchaseReportItem[]>([]);
    const [summary, setSummary] = useState<PurchaseReportSummary | null>(null);
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
            const response = await reportsApi.getPurchaseReport({
                skip: (page - 1) * limit,
                limit,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            setData(response.items);
            setSummary(response.summary);
            setTotalPages(response.total_pages);
        } catch (err) {
            console.error('Failed to load purchase report:', err);
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
            const blob = await reportsApi.exportPurchaseReport({
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `purchase_report_${new Date().toISOString().split('T')[0]}.csv`;
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'received':
                return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Received</Badge>;
            case 'approved':
                return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>;
            case 'pending':
                return <Badge variant="default" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
            case 'cancelled':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Export Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Purchase Report</h2>
                    <p className="text-muted-foreground">Spending and procurement analysis</p>
                </div>
                <Button onClick={handleExport} disabled={isExporting || isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && !isLoading && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_purchases}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summary.total_spending)}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Purchase Value</CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summary.avg_purchase_value)}</div>
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
                            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No purchase data found for the selected period</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Purchase #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead className="text-right">Total Amount</TableHead>
                                            <TableHead className="text-right">Tax</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Received Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((item) => (
                                            <TableRow key={item.purchase_id}>
                                                <TableCell className="font-mono text-sm">{item.purchase_number}</TableCell>
                                                <TableCell>{new Date(item.purchase_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{item.supplier_name || '-'}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.tax_amount)}</TableCell>
                                                <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                <TableCell>
                                                    {item.received_date ? new Date(item.received_date).toLocaleDateString() : '-'}
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
