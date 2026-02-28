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

type SaleListDto = {
    id: string;
    date: string;
    customer: string;
    total: number;
    status: 'COMPLETED' | 'REFUNDED' | 'DRAFT';
};

const mockSales: SaleListDto[] = [
    { id: 'INV-001', date: '2026-02-28', customer: 'Walker Industries', total: 1250.00, status: 'COMPLETED' },
    { id: 'INV-002', date: '2026-02-27', customer: 'Retail Hub LLC', total: 340.50, status: 'DRAFT' },
];

const columns: ColumnDef<SaleListDto>[] = [
    {
        accessorKey: 'id',
        header: 'Invoice ID',
    },
    {
        accessorKey: 'customer',
        header: 'Customer',
        cell: ({ row }) => row.getValue('customer') || <span className="text-muted-foreground italic">Walk-in</span>,
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
                    className={status === 'COMPLETED' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400' : ''}
                >
                    {status}
                </Badge>
            );
        },
    }
];

export function SalesPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const hasData = mockSales.length > 0;

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-4">
                    <PageHeader
                        title="Sales"
                        description="Manage stock-outs and customer invoices."
                        action={
                            <Button onClick={() => navigate('/sales/new')}>
                                <Plus className="mr-2 h-4 w-4" /> New Sale
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
                        <DataTable columns={columns} data={mockSales} />
                    ) : (
                        <EmptyState
                            title="No Sales Found"
                            description="Start by creating a new sale."
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
