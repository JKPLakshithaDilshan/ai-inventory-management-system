import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, X } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { stockLedgerApi, type StockLedgerEntry, type StockLedgerFilter, type StockTransactionType } from '@/services/stock-ledger';
import { getProducts, type Product } from '@/services/products';
import { warehouseApi, type Warehouse } from '@/services/warehouses';

const PAGE_SIZE = 25;

const transactionTypeStyles: Record<StockTransactionType, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  IN: { variant: 'outline', label: 'Stock In' },
  OUT: { variant: 'destructive', label: 'Stock Out' },
  ADJUST: { variant: 'secondary', label: 'Adjustment' },
  TRANSFER: { variant: 'outline', label: 'Transfer' },
};

export function StockLedgerPage() {
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | undefined>();
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
  const [selectedType, setSelectedType] = useState<StockTransactionType | undefined>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Load products and warehouses for filter dropdowns
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [productsRes, warehousesRes] = await Promise.all([
          getProducts(0, 999),
          warehouseApi.list(),
        ]);
        setProducts(productsRes.items || []);
        setWarehouses(warehousesRes.items || []);
      } catch {
        // Silent fail - filters optional
      }
    };

    loadDependencies();
  }, []);

  const loadEntries = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const filters: StockLedgerFilter = {
          page_size: PAGE_SIZE,
          product_id: selectedProduct,
          warehouse_id: selectedWarehouse,
          type: selectedType,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        };

        const response = await stockLedgerApi.list(filters);
        if (response && response.items) {
          setEntries(response.items);
          setTotal(response.total ?? 0);
          setTotalPages(response.total_pages ?? Math.ceil((response.total ?? 0) / PAGE_SIZE));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load stock ledger';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, selectedProduct, selectedWarehouse, selectedType, dateFrom, dateTo]
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const columns = useMemo<ColumnDef<StockLedgerEntry>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Date',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
        size: 100,
      },
      {
        accessorKey: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.product?.sku}</div>
            <div className="text-sm text-muted-foreground">{row.original.product?.name}</div>
          </div>
        ),
      },
      {
        accessorKey: 'warehouse',
        header: 'Warehouse',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.warehouse?.code}</div>
            <div className="text-sm text-muted-foreground">{row.original.warehouse?.name}</div>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.original.type;
          const style = transactionTypeStyles[type];
          return (
            <Badge variant={style.variant}>
              {style.label}
            </Badge>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'qty_change',
        header: 'Qty In / Out',
        cell: ({ row }) => {
          const change = row.original.qty_change;
          const isIn = change > 0;
          return (
            <div className={`font-medium ${isIn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isIn ? '+' : ''}{change}
            </div>
          );
        },
        size: 80,
      },
      {
        id: 'balance',
        header: 'Before → After',
        cell: ({ row }) => (
          <div className="text-sm">
            <span className="text-muted-foreground">{row.original.qty_before}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="font-medium">{row.original.qty_after}</span>
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'reference_type',
        header: 'Reference',
        cell: ({ row }) => {
          const refType = row.original.reference_type;
          const refId = row.original.reference_id;
          if (!refType) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="text-sm">
              <span className="font-medium">{refType}</span>
              {refId && <span className="text-muted-foreground ml-1">#{refId}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground max-w-xs truncate block">
            {row.original.note || '—'}
          </span>
        ),
      },
    ],
    []
  );

  const handleClearFilters = () => {
    setSelectedProduct(undefined);
    setSelectedWarehouse(undefined);
    setSelectedType(undefined);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = selectedProduct || selectedWarehouse || selectedType || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stock Ledger"
        description="Complete audit trail of all inventory movements."
        action={
          <Button variant="outline" onClick={() => loadEntries(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Product Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Product</label>
              <Select
                value={selectedProduct?.toString() || ''}
                onValueChange={(val) => {
                  setSelectedProduct(val ? parseInt(val) : undefined);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Warehouse</label>
              <Select
                value={selectedWarehouse?.toString() || ''}
                onValueChange={(val) => {
                  setSelectedWarehouse(val ? parseInt(val) : undefined);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.code} - {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={selectedType || ''}
                onValueChange={(val) => {
                  setSelectedType((val as StockTransactionType) || undefined);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  <SelectItem value="ADJUST">Adjustment</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X className="h-3 w-3" />
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <div className="font-medium mb-2">{error}</div>
          <Button variant="outline" size="sm" onClick={() => loadEntries(true)}>
            Retry
          </Button>
        </Card>
      )}

      {loading ? (
        <Card>
          <div className="space-y-4 p-6">
            {[...Array(8)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No stock movements found"
          description={hasActiveFilters ? 'No entries match your filters.' : 'No stock ledger entries yet.'}
        />
      ) : (
        <>
          <DataTable columns={columns} data={entries} />
          <Card className="p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {entries.length} of {total} entries • Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
