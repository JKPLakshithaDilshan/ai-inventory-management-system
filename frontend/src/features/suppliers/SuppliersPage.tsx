import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { SupplierForm } from './SupplierForm';
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
import { useAuthStore } from '@/stores/useAuthStore';

export function SuppliersPage() {
    const { toast } = useToast();
    const { isAuthenticated } = useAuthStore();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadSuppliers = useCallback(async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);
            const response = await getSuppliers(0, 100);
            setSuppliers(response.items);
        } catch (err: any) {
            const message = err?.message || 'Failed to load suppliers';
            setError(message);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadSuppliers();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, loadSuppliers]);

    const handleCreateSupplier = async (payload: SupplierCreateInput) => {
        await createSupplier(payload);
        toast({
            title: 'Supplier created',
            description: `${payload.name} was created successfully.`,
        });
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
            await loadSuppliers(true);
        } catch (err: any) {
            toast({
                title: 'Delete failed',
                description: err?.message || 'Unable to delete supplier.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = useMemo<ColumnDef<Supplier>[]>(() => [
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
            cell: ({ row }) => row.original.phone || '—',
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
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setEditingSupplier(supplier);
                                setIsEditOpen(true);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(supplier)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                );
            },
        },
    ], []);

    const hasData = suppliers.length > 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-4">
                    <PageHeader
                        title="Suppliers"
                        description="Manage your supplier directory, contacts, and lead times."
                        action={
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => loadSuppliers(true)} disabled={isRefreshing || isLoading}>
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
                        <DataTable columns={columns} data={suppliers} />
                    ) : (
                        <EmptyState
                            title="No Suppliers Found"
                            description="Start by adding a new supplier."
                            action={
                                <SupplierForm open={isAddOpen} setOpen={setIsAddOpen} onSubmit={handleCreateSupplier}>
                                    <Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
                                </SupplierForm>
                            }
                        />
                    )}

                    <SupplierForm
                        open={isEditOpen}
                        setOpen={setIsEditOpen}
                        mode="edit"
                        defaultValues={
                            editingSupplier
                                ? {
                                      name: editingSupplier.name,
                                      code: editingSupplier.code,
                                      contact_person: editingSupplier.contact_person || '',
                                      email: editingSupplier.email || '',
                                      phone: editingSupplier.phone || '',
                                      payment_terms: editingSupplier.payment_terms || '',
                                      city: editingSupplier.city || '',
                                      country: editingSupplier.country || '',
                                      is_active: editingSupplier.is_active,
                                  }
                                : undefined
                        }
                        onSubmit={handleUpdateSupplier}
                    >
                        <span className="hidden" />
                    </SupplierForm>

                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        onOpenChange={(open) => {
                            if (!open) setDeleteTarget(null);
                        }}
                        title="Delete supplier"
                        description={`Are you sure you want to delete ${deleteTarget?.name ?? 'this supplier'}? This action cannot be undone.`}
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
