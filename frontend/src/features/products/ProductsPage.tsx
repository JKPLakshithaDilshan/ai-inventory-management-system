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
import { ProductForm } from './ProductForm';

// Temporary mock data
type Product = {
    id: string;
    name: string;
    sku: string;
    stock: number;
    status: 'OK' | 'LOW' | 'OUT';
    price: number;
};

const mockProducts: Product[] = [
    { id: '1', name: 'Ergonomic Chair', sku: 'CH-001', stock: 45, status: 'OK', price: 199.99 },
    { id: '2', name: 'MacBook Pro M3', sku: 'LT-012', stock: 5, status: 'LOW', price: 1999.00 },
    { id: '3', name: 'Wireless Mouse', sku: 'MS-099', stock: 0, status: 'OUT', price: 49.99 },
];

const columns: ColumnDef<Product>[] = [
    {
        accessorKey: 'name',
        header: 'Product Name',
    },
    {
        accessorKey: 'sku',
        header: 'SKU',
    },
    {
        accessorKey: 'stock',
        header: 'Stock Level',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            return (
                <Badge
                    variant={
                        status === 'OK' ? 'default' : status === 'LOW' ? 'secondary' : 'destructive'
                    }
                    className={
                        status === 'OK' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400'
                            : status === 'LOW' ? 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400'
                                : ''
                    }
                >
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('price'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
            return <div className="font-medium">{formatted}</div>;
        },
    },
];

export function ProductsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const hasData = mockProducts.length > 0;

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
                        title="Products"
                        description="Manage your inventory products, variants, and stock levels."
                        action={
                            <ProductForm open={isAddOpen} setOpen={setIsAddOpen}>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Add Product
                                </Button>
                            </ProductForm>
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
                        <DataTable columns={columns} data={mockProducts} />
                    ) : (
                        <EmptyState
                            title="No Products Found"
                            description="Start by adding a new product to your inventory."
                            action={
                                <ProductForm open={isAddOpen} setOpen={setIsAddOpen}>
                                    <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
                                </ProductForm>
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
