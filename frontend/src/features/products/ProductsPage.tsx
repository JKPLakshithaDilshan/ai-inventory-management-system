import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ProductForm, type ProductFormValues } from './ProductForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  type Product,
  type ProductCreateInput,
} from '@/services/products';

const statusMeta: Record<string, { label: string; className?: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  in_stock: {
    label: 'IN STOCK',
    className: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400',
    variant: 'default',
  },
  IN_STOCK: {
    label: 'IN STOCK',
    className: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400',
    variant: 'default',
  },
  low_stock: {
    label: 'LOW STOCK',
    className: 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400',
    variant: 'secondary',
  },
  LOW_STOCK: {
    label: 'LOW STOCK',
    className: 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400',
    variant: 'secondary',
  },
  out_of_stock: {
    label: 'OUT OF STOCK',
    variant: 'destructive',
  },
  OUT_OF_STOCK: {
    label: 'OUT OF STOCK',
    variant: 'destructive',
  },
};

const PAGE_SIZE = 20;

export function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadProducts = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const skip = (page - 1) * PAGE_SIZE;
        const response = await getProducts(skip, PAGE_SIZE, searchTerm || undefined);

        setProducts(response.items ?? []);
        setTotal(response.total ?? 0);
        setTotalPages(response.total_pages ?? 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load products';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, searchTerm]
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCreateProduct = async (payload: ProductCreateInput) => {
    await createProduct(payload);
    toast({
      title: 'Product created',
      description: `${payload.name} was created successfully.`,
    });

    setPage(1);
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
    setIsEditOpen(false);
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

      if (products.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadProducts(true);
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Could not delete product.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchSubmit = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
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
        header: 'Stock',
      },
      {
        accessorKey: 'stock_status',
        header: 'Status',
        cell: ({ row }) => {
          const stockStatus = String(row.getValue('stock_status'));
          const meta = statusMeta[stockStatus] ?? {
            label: stockStatus,
            variant: 'secondary' as const,
          };

          return (
            <Badge variant={meta.variant} className={meta.className}>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'selling_price',
        header: 'Price',
        cell: ({ row }) => {
          const amount = Number(row.getValue('selling_price'));
          const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(amount || 0);

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
    ],
    []
  );

  const hasData = products.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="overflow-y-auto">
        <div className="p-6 space-y-4">
          <PageHeader
            title="Products"
            description="Manage inventory products, pricing, and stock levels."
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

          <Card className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or SKU"
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
          </Card>

          {isLoading ? (
            <Card className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
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
                <Button onClick={() => loadProducts(true)} className="mt-4" variant="outline">
                  Retry
                </Button>
              </div>
            </Card>
          ) : hasData ? (
            <>
              <DataTable columns={columns} data={products} />
              <Card className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} products
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
              title="No Products Found"
              description={searchTerm ? 'No products match your current search.' : 'Start by adding a new product.'}
              action={
                <ProductForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateProduct}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
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
              defaultValues={editingProduct as Partial<ProductFormValues>}
              onSubmit={handleUpdateProduct}
            >
              <span />
            </ProductForm>
          )}

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            title="Delete Product"
            description={
              deleteTarget
                ? `Are you sure you want to delete ${deleteTarget.name}? This action cannot be undone.`
                : 'Are you sure?'
            }
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={handleDeleteProduct}
            isLoading={isDeleting}
          />
        </div>
      </div>
    </div>
  );
}
