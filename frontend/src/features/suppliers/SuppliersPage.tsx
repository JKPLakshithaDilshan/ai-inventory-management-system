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
import { SupplierForm, type SupplierFormValues } from './SupplierForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
  type Supplier,
  type SupplierCreateInput,
} from '@/services/suppliers';

const PAGE_SIZE = 20;

export function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadSuppliers = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const skip = (page - 1) * PAGE_SIZE;
        const response = await getSuppliers(skip, PAGE_SIZE, searchTerm || undefined);

        setSuppliers(response.items ?? []);
        setTotal(response.total ?? 0);
        setTotalPages(response.total_pages ?? 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load suppliers';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, searchTerm]
  );

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreateSupplier = async (payload: SupplierCreateInput) => {
    await createSupplier(payload);
    toast({
      title: 'Supplier created',
      description: `${payload.name} was created successfully.`,
    });

    setPage(1);
    await loadSuppliers(true);
  };

  const handleUpdateSupplier = async (payload: SupplierCreateInput) => {
    if (!editingSupplier) return;

    await updateSupplier(editingSupplier.id, payload);
    toast({
      title: 'Supplier updated',
      description: `${payload.name} was updated successfully.`,
    });

    setEditingSupplier(null);
    setIsEditOpen(false);
    await loadSuppliers(true);
  };

  const handleDeleteSupplier = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deleteSupplier(deleteTarget.id);
      toast({
        title: 'Supplier deleted',
        description: `${deleteTarget.name} was removed.`,
      });

      setDeleteTarget(null);

      if (suppliers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadSuppliers(true);
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unable to delete supplier.',
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

  const columns = useMemo<ColumnDef<Supplier>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
      },
      {
        accessorKey: 'name',
        header: 'Supplier Name',
      },
      {
        accessorKey: 'contact_person',
        header: 'Primary Contact',
        cell: ({ row }) => row.original.contact_person || '—',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || '—',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => row.original.phone || row.original.mobile || '—',
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.original.is_active;
          return (
            <Badge
              variant={isActive ? 'default' : 'secondary'}
              className={isActive ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400' : ''}
            >
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const supplier = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSupplier(supplier);
                  setIsEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(supplier)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const hasData = suppliers.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="overflow-y-auto">
        <div className="p-6 space-y-4">
          <PageHeader
            title="Suppliers"
            description="Manage your supplier directory and contacts."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => loadSuppliers(true)} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <SupplierForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateSupplier}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Supplier
                  </Button>
                </SupplierForm>
              </div>
            }
          />

          <Card className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or code"
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
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <div className="space-y-3">
                <p className="font-medium text-destructive">Error Loading Suppliers</p>
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadSuppliers(true)}>
                  Retry
                </Button>
              </div>
            </Card>
          ) : hasData ? (
            <>
              <DataTable columns={columns} data={suppliers} />
              <Card className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} suppliers
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
              title="No Suppliers Found"
              description={searchTerm ? 'No suppliers match your current search.' : 'Start by adding a new supplier.'}
              action={
                <SupplierForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateSupplier}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Supplier
                  </Button>
                </SupplierForm>
              }
            />
          )}

          {editingSupplier && (
            <SupplierForm
              open={isEditOpen}
              setOpen={(open) => {
                setIsEditOpen(open);
                if (!open) setEditingSupplier(null);
              }}
              mode="edit"
              defaultValues={editingSupplier as Partial<SupplierFormValues>}
              onSubmit={handleUpdateSupplier}
            >
              <span />
            </SupplierForm>
          )}

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            title="Delete Supplier"
            description={
              deleteTarget
                ? `Are you sure you want to delete ${deleteTarget.name}? This action cannot be undone.`
                : 'Are you sure?'
            }
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={handleDeleteSupplier}
            isLoading={isDeleting}
          />
        </div>
      </div>
    </div>
  );
}
