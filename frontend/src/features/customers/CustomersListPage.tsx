import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import {
  createCustomer,
  deleteCustomer,
  customerApi,
  type Customer,
  type CustomerCreateInput,
  type CustomerType,
} from '@/services/customers';
import { updateCustomer } from '@/services/customers';
import { CustomerForm, type CustomerFormValues } from './CustomerForm';

const PAGE_SIZE = 20;

export function CustomersListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const canCreate = hasPermission(user, PERMISSIONS.CUSTOMER_CREATE);
  const canUpdate = hasPermission(user, PERMISSIONS.CUSTOMER_UPDATE);
  const canDelete = hasPermission(user, PERMISSIONS.CUSTOMER_DELETE);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CustomerType>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadCustomers = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const skip = (page - 1) * PAGE_SIZE;
        const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
        const customerType = typeFilter === 'all' ? undefined : typeFilter;

        const response = await customerApi.list({
          skip,
          limit: PAGE_SIZE,
          search: searchTerm || undefined,
          is_active: isActive,
          customer_type: customerType,
        });

        setCustomers(response.items ?? []);
        setTotal(response.total ?? 0);
        setTotalPages(response.total_pages ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, searchTerm, statusFilter, typeFilter]
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreateCustomer = async (payload: CustomerCreateInput) => {
    await createCustomer(payload);
    toast({ title: 'Customer created', description: `${payload.full_name} was created successfully.` });
    setPage(1);
    await loadCustomers(true);
  };

  const handleUpdateCustomer = async (payload: CustomerCreateInput) => {
    if (!editingCustomer) return;
    await updateCustomer(editingCustomer.id, payload);
    toast({ title: 'Customer updated', description: `${payload.full_name} was updated successfully.` });
    setEditingCustomer(null);
    setIsEditOpen(false);
    await loadCustomers(true);
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deleteCustomer(deleteTarget.id);
      toast({ title: 'Customer deleted', description: `${deleteTarget.full_name} was removed.` });
      setDeleteTarget(null);
      if (customers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadCustomers(true);
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unable to delete customer.',
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

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      { accessorKey: 'customer_code', header: 'Code' },
      {
        accessorKey: 'full_name',
        header: 'Customer',
        cell: ({ row }) => (
          <button className="font-medium text-primary hover:underline" onClick={() => navigate(`/customers/${row.original.id}`)}>
            {row.original.full_name}
          </button>
        ),
      },
      {
        accessorKey: 'company_name',
        header: 'Company',
        cell: ({ row }) => row.original.company_name || '—',
      },
      {
        accessorKey: 'customer_type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.customer_type.toUpperCase()}</Badge>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => row.original.phone || '—',
      },
      {
        accessorKey: 'credit_limit',
        header: 'Credit Limit',
        cell: ({ row }) => `$${row.original.credit_limit.toFixed(2)}`,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
            {row.original.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${row.original.id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingCustomer(row.original);
                  setIsEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row.original)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, navigate]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="overflow-y-auto">
        <div className="p-6 space-y-4">
          <PageHeader
            title="Customers"
            description="Manage customer profiles and credit settings."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => loadCustomers(true)} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                {canCreate && (
                  <CustomerForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateCustomer}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                  </CustomerForm>
                )}
              </div>
            }
          />

          <Card className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by code, name, company, phone, email"
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

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => { setStatusFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value: 'all' | CustomerType) => { setTypeFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {isLoading ? (
            <Card className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-10 w-full" />))}
              </div>
            </Card>
          ) : error ? (
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <div className="space-y-3">
                <p className="font-medium text-destructive">Error Loading Customers</p>
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadCustomers(true)}>Retry</Button>
              </div>
            </Card>
          ) : customers.length > 0 ? (
            <>
              <DataTable columns={columns} data={customers} />
              <Card className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Previous</Button>
                    <span className="text-muted-foreground">Page {page} of {Math.max(totalPages, 1)}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState
              title="No Customers Found"
              description={searchTerm ? 'No customers match your current filters.' : 'Start by adding a customer profile.'}
              action={canCreate ? (
                <CustomerForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateCustomer}>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
                </CustomerForm>
              ) : undefined}
            />
          )}

          {editingCustomer && (
            <CustomerForm
              open={isEditOpen}
              setOpen={(open) => {
                setIsEditOpen(open);
                if (!open) setEditingCustomer(null);
              }}
              mode="edit"
              defaultValues={editingCustomer as Partial<CustomerFormValues>}
              onSubmit={handleUpdateCustomer}
            >
              <span />
            </CustomerForm>
          )}

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            title="Delete Customer"
            description={deleteTarget ? `Are you sure you want to delete ${deleteTarget.full_name}? This action cannot be undone.` : 'Are you sure?'}
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={handleDeleteCustomer}
            isLoading={isDeleting}
          />
        </div>
      </div>
    </div>
  );
}
