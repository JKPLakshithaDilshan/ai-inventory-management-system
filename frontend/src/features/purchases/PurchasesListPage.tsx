import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/useAuthStore';
import { getPurchases, type Purchase } from '@/services/purchases';
import { useToast } from '@/hooks/use-toast';

export function PurchasesPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuthStore();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const limit = 20;

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadPurchases();
    }, [user, navigate]);

    const loadPurchases = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPurchases(0, limit);
            setPurchases(data.items);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to load purchases';
            setError(errorMsg);
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnDef<Purchase>[] = useMemo(
        () => [
            {
                accessorKey: 'purchase_number',
                header: 'PO Number',
                cell: ({ row }) => (
                    <button
                        className="font-medium text-primary hover:underline"
                        onClick={() => navigate(`/purchases/${row.original.id}`)}
                    >
                        {row.getValue('purchase_number')}
                    </button>
                ),
            },
            {
                accessorKey: 'supplier',
                header: 'Supplier',
                cell: ({ row }) => {
                    const supplier = row.original.supplier;
                    return supplier ? (
                        <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-xs text-muted-foreground">{supplier.code}</div>
                        </div>
                    ) : (
                        '-'
                    );
                },
            },
            {
                accessorKey: 'purchase_date',
                header: 'Date',
                cell: ({ row }) => {
                    const date = new Date(row.getValue('purchase_date'));
                    return date.toLocaleDateString();
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const status = row.getValue('status') as string;
                    const variant = {
                        draft: 'secondary',
                        ordered: 'outline',
                        received: 'default',
                        cancelled: 'destructive',
                    }[status] as any;
                    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
                },
            },
            {
                accessorKey: 'total_amount',
                header: 'Total',
                cell: ({ row }) => {
                    const amount = row.getValue('total_amount') as number;
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    }).format(amount);
                },
            },
        ],
        [navigate]
    );



    if (!user) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Purchases"
                description="Manage purchase orders and track inventory stock-ins."
                action={
                    <Button onClick={() => navigate('/purchases/new')}>
                        <Plus className="mr-2 h-4 w-4" /> New Purchase
                    </Button>
                }
            />

            {error && (
                <Card className="border-destructive/50 bg-destructive/10 p-4 text-destructive">
                    <div className="font-medium mb-2">{error}</div>
                    <Button variant="outline" size="sm" onClick={loadPurchases}>
                        Retry
                    </Button>
                </Card>
            )}

            {loading ? (
                <Card>
                    <div className="space-y-4 p-6">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </Card>
            ) : purchases.length === 0 ? (
                <EmptyState
                    title="No purchases yet"
                    description="Create your first purchase order to track stock-ins."
                    action={
                        <Button onClick={() => navigate('/purchases/new')}>
                            <Plus className="mr-2 h-4 w-4" /> Create Purchase
                        </Button>
                    }
                />
            ) : (
                <DataTable columns={columns} data={purchases} />
            )}
        </div>
    );
}
