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
import { getPurchases, type Purchase, type PurchaseStatus } from '@/services/purchases';

const PAGE_SIZE = 20;

const statusStyle: Record<PurchaseStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  draft: { variant: 'secondary' },
  pending: { variant: 'outline' },
  approved: { variant: 'outline' },
  received: { variant: 'default', className: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400' },
  cancelled: { variant: 'destructive' },
};

export function PurchasesPage() {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadPurchases = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const skip = (page - 1) * PAGE_SIZE;
        const response = await getPurchases(skip, PAGE_SIZE);

        // Apply client-side search within current page only
        const displayItems = searchTerm
          ? response.items.filter(
              (purchase) =>
                purchase.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                purchase.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : response.items;

        setPurchases(displayItems);
        setTotal(response.total ?? 0);
        setTotalPages(response.total_pages ?? 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load purchases';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, searchTerm]
  );

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const columns = useMemo<ColumnDef<Purchase>[]>(
    () => [
      {
        accessorKey: 'purchase_number',
        header: 'PO Number',
        cell: ({ row }) => (
          <button className="font-medium text-primary hover:underline" onClick={() => navigate(`/purchases/${row.original.id}`)}>
            {row.original.purchase_number}
          </button>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => row.original.supplier?.name || '—',
      },
      {
        accessorKey: 'purchase_date',
        header: 'Date',
        cell: ({ row }) => new Date(String(row.original.purchase_date)).toLocaleDateString(),
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
      {
        accessorKey: 'total_amount',
        header: 'Total',
        cell: ({ row }) =>
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(row.original.total_amount),
      },
    ],
    [navigate]
  );

  const handleSearchSubmit = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Purchases"
        description="Manage purchase orders and stock-ins."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => loadPurchases(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={() => navigate('/purchases/new')}>
              <Plus className="mr-2 h-4 w-4" /> New Purchase
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search by PO, supplier, or reference (current page only)"
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
              Searching within current page. Showing {purchases.length} of {PAGE_SIZE} items.
            </p>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <div className="font-medium mb-2">{error}</div>
          <Button variant="outline" size="sm" onClick={() => loadPurchases(true)}>
            Retry
          </Button>
        </Card>
      )}

      {loading ? (
        <Card>
          <div className="space-y-4 p-6">
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : purchases.length === 0 ? (
        <EmptyState
          title="No purchases found"
          description={searchTerm ? 'No purchases match your search.' : 'Create your first purchase order to track stock-ins.'}
          action={
            <Button onClick={() => navigate('/purchases/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Purchase
            </Button>
          }
        />
      ) : (
        <>
          <DataTable columns={columns} data={purchases} />
          <Card className="p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} purchases
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page} of {Math.max(totalPages, 1)}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
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
