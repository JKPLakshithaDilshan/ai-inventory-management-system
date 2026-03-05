import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { ProductForm } from './ProductForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { ForecastPanel } from '@/features/ai/ForecastPanel';
import { createProduct, deleteProduct, getProducts, updateProduct } from '@/services/products';
import type { Product, ProductCreateInput } from '@/services/products';
import { useAuthStore } from '@/stores/useAuthStore';

// Map backend stock_status to display labels
const statusMap: Record<string, 'OK' | 'LOW' | 'OUT'> = {
    'in_stock': 'OK',
    'low_stock': 'LOW',
    'out_of_stock': 'OUT',
};

export function ProductsPage() {
    const { toast } = useToast();
    const { isAuthenticated } = useAuthStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const loggedFirstShape = useRef(false);

    const loadProducts = useCallback(async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);
            const response = await getProducts(0, 100);
            setProducts(response.items);
            if (response.items.length > 0 && !loggedFirstShape.current) {
                console.log('ProductsPage first product shape:', response.items[0]);
                loggedFirstShape.current = true;
            }
        } catch (err: any) {
            const message = err?.message || 'Failed to load products';
            setError(message);
            console.error('Error loading products:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Only load products if user is authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadProducts();
        } else {
            setIsLoading(false);
            setError('Not authenticated');
        }
    }, [isAuthenticated, loadProducts]);

    const handleCreateProduct = async (payload: ProductCreateInput) => {
        await createProduct(payload);
        toast({
            title: 'Product created',
            description: `${payload.name} was created successfully.`,
        });
        await loadProducts(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditOpen(true);
    };

    const handleUpdateProduct = async (payload: ProductCreateInput) => {
        if (!editingProduct) return;
        await updateProduct(editingProduct.id, payload);
        toast({
            title: 'Product updated',
            description: `${payload.name} was updated successfully.`,
        });
        setEditingProduct(null);
        await loadProducts(true);
    };

    const handleDeleteProduct = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            await deleteProduct(deleteTarget.id);
            toast({
                title: 'Product deleted',
                description: `${deleteTarget.name} was removed.`,
            });
            setDeleteTarget(null);
            await loadProducts(true);
        } catch (err: any) {
            toast({
                title: 'Delete failed',
                description: err?.message || 'Could not delete product.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = useMemo<ColumnDef<Product>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Product Name',
        },
        {
            accessorKey: 'sku',
            header: 'SKU',
        },
        {
            accessorKey: 'quantity',
            header: 'Stock Level',
        },
        {
            accessorKey: 'stock_status',
            header: 'Status',
            cell: ({ row }) => {
                const stockStatus = row.getValue('stock_status') as string;
                const status = statusMap[stockStatus] || 'OUT';
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
            accessorKey: 'selling_price',
            header: 'Price',
            cell: ({ row }) => {
                const amount = parseFloat(String(row.getValue('selling_price')));
                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }).format(amount);
                return <div className="font-medium">{formatted}</div>;
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row.original)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ], []);

    const hasData = products.length > 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-4">
                    <PageHeader
                        title="Products"
                        description="Manage your inventory products, variants, and stock levels."
                        action={
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => loadProducts(true)} disabled={isRefreshing}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                                </Button>
                                <ProductForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateProduct}>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" /> Add Product
                                    </Button>
                                </ProductForm>
                            </div>
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
                    ) : error ? (
                        <Card className="p-6 bg-red-50 border-red-200">
                            <div className="text-red-800">
                                <h3 className="font-semibold">Error Loading Products</h3>
                                <p className="text-sm mt-1">{error}</p>
                                <Button
                                    onClick={() => loadProducts(true)}
                                    className="mt-4"
                                    variant="outline"
                                >
                                    Retry
                                </Button>
                            </div>
                        </Card>
                    ) : hasData ? (
                        <DataTable columns={columns} data={products} />
                    ) : (
                        <EmptyState
                            title="No Products Found"
                            description="Start by adding a new product to your inventory."
                            action={
                                <ProductForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateProduct}>
                                    <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
                                </ProductForm>
                            }
                        />
                    )}

                    {editingProduct && (
                        <ProductForm
                            open={isEditOpen}
                            setOpen={(open) => {
                                setIsEditOpen(open);
                                if (!open) setEditingProduct(null);
                            }}
                            mode="edit"
                            defaultValues={{
                                sku: editingProduct.sku,
                                name: editingProduct.name,
                                description: editingProduct.description || '',
                                cost_price: editingProduct.cost_price,
                                selling_price: editingProduct.selling_price,
                                quantity: editingProduct.quantity,
                                reorder_level: editingProduct.reorder_level,
                                reorder_quantity: editingProduct.reorder_quantity,
                                unit: editingProduct.unit,
                                barcode: editingProduct.barcode || '',
                                image_url: editingProduct.image_url || '',
                            }}
                            onSubmit={handleUpdateProduct}
                        >
                            <span />
                        </ProductForm>
                    )}

                    <ConfirmDialog
                        open={!!deleteTarget}
                        onOpenChange={(open) => {
                            if (!open) setDeleteTarget(null);
                        }}
                        title="Delete Product"
                        description={deleteTarget ? `Are you sure you want to delete ${deleteTarget.name}?` : 'Are you sure?'}
                        confirmLabel="Delete"
                        variant="destructive"
                        onConfirm={handleDeleteProduct}
                        isLoading={isDeleting}
                    />

                    {products.length > 0 && <ForecastPanel products={products} />}
                </div>
            </div>
        </div>
    );
}
