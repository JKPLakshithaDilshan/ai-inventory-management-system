import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

type Supplier = {
    id: string;
    name: string;
    contactName: string;
    email: string;
    status: 'ACTIVE' | 'INACTIVE';
    leadTimeDays: number;
};

const mockSuppliers: Supplier[] = [
    { id: '1', name: 'TechWiz Supplies', contactName: 'John Doe', email: 'john@techwiz.com', status: 'ACTIVE', leadTimeDays: 3 },
    { id: '2', name: 'Global Logistics', contactName: 'Jane Smith', email: 'jane@globallogistics.com', status: 'ACTIVE', leadTimeDays: 5 },
    { id: '3', name: 'Local Office Co.', contactName: 'Bob Brown', email: 'bob@localoffice.com', status: 'INACTIVE', leadTimeDays: 1 },
];


const columns: ColumnDef<Supplier>[] = [
    {
        accessorKey: 'name',
        header: 'Supplier Name',
    },
    {
        accessorKey: 'contactName',
        header: 'Primary Contact',
    },
    {
        accessorKey: 'email',
        header: 'Email',
    },
    {
        accessorKey: 'leadTimeDays',
        header: 'Lead Time (Days)',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            return (
                <Badge
                    variant={status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={
                        status === 'ACTIVE'
                            ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400'
                            : ''
                    }
                >
                    {status}
                </Badge>
            );
        },
    },
];

export function SuppliersPage() {
    const [isLoading, setIsLoading] = useState(true);
    const hasData = mockSuppliers.length > 0;

    useEffect(() => {
        // Simulate data fetch
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-4">
                    <PageHeader
                        title="Suppliers"
                        description="Manage your supplier directory, contacts, and lead times."
                        action={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Supplier
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
                        <DataTable columns={columns} data={mockSuppliers} />
                    ) : (
                        <EmptyState
                            title="No Suppliers Found"
                            description="Start by adding a new supplier."
                            action={<Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
