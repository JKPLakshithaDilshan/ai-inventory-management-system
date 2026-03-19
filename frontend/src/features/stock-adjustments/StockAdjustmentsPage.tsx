import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { BadgePlus, RefreshCw, Search } from 'lucide-react';

import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getProducts, type Product } from '@/services/products';
import { warehouseApi, type Warehouse } from '@/services/warehouses';
import {
  createStockAdjustment,
  getStockAdjustments,
  stockAdjustmentApi,
  type StockAdjustment,
  type StockAdjustmentCreateInput,
  type StockAdjustmentType,
} from '@/services/stock-adjustments';
import { StockAdjustmentForm } from './StockAdjustmentForm';
import { useToast } from '@/hooks/use-toast';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { useAuthStore } from '@/stores/useAuthStore';

const PAGE_SIZE = 20;

export function StockAdjustmentsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const canCreate = hasPermission(user, PERMISSIONS.STOCK_ADJUSTMENT_CREATE);

  const [items, setItems] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchRef, setSearchRef] = useState('');
  const [searchRefApplied, setSearchRefApplied] = useState('');
  const [productId, setProductId] = useState<number | undefined>();
  const [warehouseId, setWarehouseId] = useState<number | undefined>();
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [productsResponse, warehousesResponse] = await Promise.all([
          getProducts(0, 500),
          warehouseApi.list({ skip: 0, limit: 500 }),
        ]);
        setProducts(productsResponse.items || []);
        setWarehouses(warehousesResponse.items || []);
      } catch {
        // Keep page usable even if optional dropdown data fails.
      }
    };

    loadDependencies();
  }, []);

  const loadAdjustments = useCallback(
    async (manual = false) => {
      try {
        if (manual) setIsRefreshing(true);
        else setIsLoading(true);

        setError(null);

        const response = await getStockAdjustments({
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          product_id: productId,
          warehouse_id: warehouseId,
          adjustment_type: adjustmentType,
        });

        const filteredItems = (response.items || []).filter((item) =>
          searchRefApplied
            ? (item.adjustment_reference || '').toLowerCase().includes(searchRefApplied.toLowerCase())
            : true
        );

        setItems(filteredItems);
        setTotal(response.total ?? 0);
        setTotalPages(response.total_pages ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stock adjustments');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [adjustmentType, page, productId, searchRefApplied, warehouseId]
  );

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  useEffect(() => {
    const loadCurrentStock = async () => {
      if (!productId || !warehouseId) {
        setCurrentStock(null);
        return;
      }

      try {
        const response = await stockAdjustmentApi.getCurrentStock(productId, warehouseId);
        setCurrentStock(response.quantity);
      } catch {
        setCurrentStock(null);
      }
    };

    loadCurrentStock();
  }, [productId, warehouseId, createOpen]);

  const submitAdjustment = async (payload: StockAdjustmentCreateInput) => {
    await createStockAdjustment(payload);
    toast({
      title: 'Stock adjustment created',
      description: 'Stock levels and ledger were updated successfully.',
    });

    setPage(1);
    await loadAdjustments(true);
  };

  const columns = useMemo<ColumnDef<StockAdjustment>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Date',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => {
          const product = productMap.get(row.original.product_id);
          return product ? `${product.sku} - ${product.name}` : `#${row.original.product_id}`;
        },
      },
      {
        id: 'warehouse',
        header: 'Warehouse',
        cell: ({ row }) => {
          const warehouse = warehouseMap.get(row.original.warehouse_id);
          return warehouse ? `${warehouse.code} - ${warehouse.name}` : `#${row.original.warehouse_id}`;
        },
      },
      {
        accessorKey: 'adjustment_type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.adjustment_type === 'increase' ? 'outline' : 'secondary'}>
            {row.original.adjustment_type === 'increase' ? 'Increase' : 'Decrease'}
          </Badge>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
      },
      {
        accessorKey: 'adjustment_reference',
        header: 'Reference',
        cell: ({ row }) => row.original.adjustment_reference || '—',
      },
    ],
    [productMap, warehouseMap]
  );

  const hasData = items.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="overflow-y-auto p-6 space-y-4">
        <PageHeader
          title="Stock Adjustments"
          description="Perform controlled stock corrections with audit and ledger traceability."
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => loadAdjustments(true)} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
              </Button>

              {canCreate && (
                <StockAdjustmentForm
                  open={createOpen}
                  setOpen={setCreateOpen}
                  onSubmit={submitAdjustment}
                  products={products}
                  warehouses={warehouses}
                >
                  <Button>
                    <BadgePlus className="mr-2 h-4 w-4" /> New Adjustment
                  </Button>
                </StockAdjustmentForm>
              )}
            </div>
          }
        />

        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Filter by reference"
              value={searchRef}
              onChange={(event) => setSearchRef(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setPage(1);
                  setSearchRefApplied(searchRef.trim());
                }
              }}
            />

            <Select
              value={productId?.toString() || 'all'}
              onValueChange={(value) => {
                setPage(1);
                setProductId(value === 'all' ? undefined : Number(value));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={warehouseId?.toString() || 'all'}
              onValueChange={(value) => {
                setPage(1);
                setWarehouseId(value === 'all' ? undefined : Number(value));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.code} - {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={adjustmentType || 'all'}
              onValueChange={(value) => {
                setPage(1);
                setAdjustmentType(value === 'all' ? undefined : (value as StockAdjustmentType));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearchRefApplied(searchRef.trim());
              }}
            >
              <Search className="mr-2 h-4 w-4" /> Apply Filters
            </Button>

            <p className="text-sm text-muted-foreground">
              {productId && warehouseId && currentStock !== null
                ? `Current stock at selected location: ${currentStock}`
                : 'Select product + warehouse to preview current stock'}
            </p>
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </Card>
        ) : error ? (
          <Card className="p-6 border-destructive/40 bg-destructive/10">
            <p className="font-medium text-destructive">Error Loading Stock Adjustments</p>
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadAdjustments(true)}>
              Retry
            </Button>
          </Card>
        ) : hasData ? (
          <>
            <DataTable columns={columns} data={items} />
            <Card className="p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} adjustments
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="text-muted-foreground">Page {page} of {Math.max(totalPages, 1)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <EmptyState
            title="No Stock Adjustments Found"
            description="Create your first adjustment to correct inventory levels."
            action={
              canCreate ? (
                <StockAdjustmentForm
                  open={createOpen}
                  setOpen={setCreateOpen}
                  onSubmit={submitAdjustment}
                  products={products}
                  warehouses={warehouses}
                >
                  <Button>
                    <BadgePlus className="mr-2 h-4 w-4" /> New Adjustment
                  </Button>
                </StockAdjustmentForm>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
