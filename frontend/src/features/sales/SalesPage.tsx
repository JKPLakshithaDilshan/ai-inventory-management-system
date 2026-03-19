import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { saleApi, type Sale, type SaleStatus } from '@/services/sales';

const PAGE_SIZE = 20;

const statusStyle: Record<SaleStatus, { variant: 'default' | 'secondary' | 'destructive'; className?: string }> = {
    draft: { variant: 'secondary' },
    completed: { variant: 'default', className: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400' },
    cancelled: { variant: 'destructive' },
    refunded: { variant: 'destructive' },
};

export function SalesPage() {
    const navigate = useNavigate();
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const loadSales = useCallback(async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            setError(null);

            const skip = (page - 1) * PAGE_SIZE;
            const response = await saleApi.list({ skip, limit: PAGE_SIZE });

            // Apply client-side search within current page only
            const displayItems = searchTerm
                ? response.items.filter(
                      (sale) =>
                          sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : response.items;

            setSales(displayItems);
            setTotal(response.total ?? 0);
            setTotalPages(response.total_pages ?? 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sales');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [page, searchTerm]);

    useEffect(() => {
        loadSales();
    }, [loadSales]);

    const columns = useMemo<ColumnDef<Sale>[]>(() => [
        {
            accessorKey: 'invoice_number',
            header: 'Invoice',
            cell: ({ row }) => (
                <button className="font-medium text-primary hover:underline" onClick={() => navigate(`/sales/${row.original.id}`)}>
                    {row.original.invoice_number}
                </button>
            ),
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            cell: ({ row }) => row.original.customer_name || <span className="text-muted-foreground italic">Walk-in</span>,
        },
        {
            accessorKey: 'sale_date',
            header: 'Date',
            cell: ({ row }) => new Date(row.original.sale_date).toLocaleDateString(),
        },
        {
            accessorKey: 'total_amount',
            header: 'Total',
            cell: ({ row }) =>
                new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }).format(row.original.total_amount),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                const style = statusStyle[status] ?? { variant: 'secondary' as const };
                return (
                    <Badge variant={style.variant} className={style.className}>
                        {status.toUpperCase()}
                    </Badge>
                );
            },
        },
    ], [navigate]);

    const handleSearchSubmit = () => {
        setPage(1);
        setSearchTerm(searchInput.trim());
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-4">
                    <PageHeader
                        title="Sales"
                        description="Manage sales orders and completion workflow."
                        action={
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => loadSales(true)} disabled={isRefreshing}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                                </Button>
                                <Button onClick={() => navigate('/sales/new')}>
                                    <Plus className="mr-2 h-4 w-4" /> New Sale
                                </Button>
                            </div>
                        }
                    />

                    <Card className="p-4">
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search by invoice or customer (current page only)"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            handleSearchSubmit();
                                        }
                                    }}
                                />
                                <Button variant="outline" onClick={handleSearchSubmit}>
                                    <Search className="mr-2 h-4 w-4" /> Search
                                </Button>
                            </div>
                            {searchTerm && (
                                <p className="text-xs text-muted-foreground">
                                    Searching within current page. Showing {sales.length} of {PAGE_SIZE} items.
                                </p>
                            )}
                        </div>
                    </Card>

                    {error && (
                        <Card className="p-6 border-destructive/30 bg-destructive/5">
                            <div className="space-y-3">
                                <p className="font-medium text-destructive">Error Loading Sales</p>
                                <p className="text-sm text-destructive">{error}</p>
                                <Button variant="outline" size="sm" onClick={() => loadSales(true)}>
                                    Retry
                                </Button>
                            </div>
                        </Card>
                    )}

                    {isLoading ? (
                        <Card className="p-6">
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-4">
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ) : sales.length > 0 ? (
                        <>
                            <DataTable columns={columns} data={sales} />
                            <Card className="p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <p className="text-muted-foreground">
                                        Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} sales
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                                            Previous
                                        </Button>
                                        <span className="text-muted-foreground">
                                            Page {page} of {Math.max(totalPages, 1)}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((prev) => prev + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <EmptyState
                            title="No Sales Found"
                            description={searchTerm ? 'No sales match your current search.' : 'Start by creating a new sale.'}
                            action={
                                <Button onClick={() => navigate('/sales/new')}>
                                    <Plus className="mr-2 h-4 w-4" /> New Sale
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
