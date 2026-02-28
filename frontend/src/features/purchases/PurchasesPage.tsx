import { useState, useEffect } from 'react';
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

type PurchaseListDto = {
    id: string;
    referenceNo: string;
    supplier: string;
    date: string;
    total: number;
    status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
};

const mockPurchases: PurchaseListDto[] = [
    { id: 'PO-001', referenceNo: 'INV-2049', supplier: 'Tech Corp', date: '2026-02-28', total: 4500.00, status: 'COMPLETED' },
    { id: 'PO-002', referenceNo: '', supplier: 'Office Supplies Inc', date: '2026-02-27', total: 120.50, status: 'DRAFT' },
];

const columns: ColumnDef<PurchaseListDto>[] = [
    {
        accessorKey: 'id',
        header: 'Purchase ID',
    },
    {
        accessorKey: 'referenceNo',
        header: 'Reference',
        cell: ({ row }) => row.getValue('referenceNo') || <span className="text-muted-foreground italic">None</span>,
    },
    {
        accessorKey: 'supplier',
        header: 'Supplier',
    },
    {
        accessorKey: 'date',
        header: 'Date',
    },
    {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('total'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
            return <div className="font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            return (
                <Badge
                    variant={status === 'COMPLETED' ? 'default' : status === 'DRAFT' ? 'secondary' : 'destructive'}
                    className={
                        status === 'COMPLETED' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400'
                            : ''
                    }
                >
                    {status}
                </Badge>
            );
        },
    }
];

export function PurchasesPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const hasData = mockPurchases.length > 0;

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-4">
                    <PageHeader
                        title="Purchases"
                        description="Manage incoming purchase orders and stock-ins."
                        action={
                            <Button onClick={() => navigate('/purchases/new')}>
                                <Plus className="mr-2 h-4 w-4" /> New Purchase
                            </Button>
                        }
                    />

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
                    ) : hasData ? (
                        <DataTable columns={columns} data={mockPurchases} />
                    ) : (
                        <EmptyState
                            title="No Purchases Found"
                            description="Start by creating a new purchase order."
                            action={
                                <Button onClick={() => navigate('/purchases/new')}>
                                    <Plus className="mr-2 h-4 w-4" /> New Purchase
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
