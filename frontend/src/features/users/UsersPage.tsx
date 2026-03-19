'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, Eye, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
    getUsers,
    deleteUser,
    getRoles,
    getPermissions,
    createRole,
    updateRole,
    type User,
    type Role,
    type Permission,
    type PaginatedResponse,
} from '@/services/users';
import { useAuthStore } from '@/stores/useAuthStore';
import { UserForm } from './UserForm';
import { format } from 'date-fns';

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAuthenticated } = useAuthStore();
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 100,
        total: 0,
    });
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [roleFormLoading, setRoleFormLoading] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        permission_ids: [] as number[],
    });
    const { toast } = useToast();

    const loadUsers = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const skip = (page - 1) * 100;
            const response: PaginatedResponse<User> = await getUsers(skip, 100);
            setUsers(response.items);
            setPagination({
                page: response.page,
                pageSize: response.page_size,
                total: response.total,
            });
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to load users',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const loadAuthzData = useCallback(async () => {
        try {
            const [roleData, permissionData] = await Promise.all([getRoles(), getPermissions()]);
            setRoles(roleData || []);
            setPermissions(permissionData || []);
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to load roles/permissions',
                variant: 'destructive',
            });
        }
    }, [toast]);

    useEffect(() => {
        if (isAuthenticated) {
            loadUsers();
            loadAuthzData();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, loadUsers, loadAuthzData]);

    const openCreateRoleDialog = () => {
        setEditingRole(null);
        setRoleForm({ name: '', description: '', permission_ids: [] });
        setRoleDialogOpen(true);
    };

    const openEditRoleDialog = (role: Role) => {
        setEditingRole(role);
        setRoleForm({
            name: role.name,
            description: role.description || '',
            permission_ids: role.permissions.map((p) => p.id),
        });
        setRoleDialogOpen(true);
    };

    const toggleRolePermission = (permissionId: number, checked: boolean) => {
        setRoleForm((prev) => ({
            ...prev,
            permission_ids: checked
                ? Array.from(new Set([...prev.permission_ids, permissionId]))
                : prev.permission_ids.filter((id) => id !== permissionId),
        }));
    };

    const handleSaveRole = async () => {
        if (!roleForm.name.trim()) {
            toast({
                title: 'Validation error',
                description: 'Role name is required',
                variant: 'destructive',
            });
            return;
        }

        setRoleFormLoading(true);
        try {
            if (editingRole) {
                await updateRole(editingRole.id, {
                    name: roleForm.name.trim(),
                    description: roleForm.description.trim() || undefined,
                    permission_ids: roleForm.permission_ids,
                });
                toast({ title: 'Role updated', description: 'Role permissions saved successfully.' });
            } else {
                await createRole({
                    name: roleForm.name.trim(),
                    description: roleForm.description.trim() || undefined,
                    permission_ids: roleForm.permission_ids,
                });
                toast({ title: 'Role created', description: 'New role created successfully.' });
            }

            setRoleDialogOpen(false);
            await loadAuthzData();
        } catch (error: unknown) {
            toast({
                title: 'Role save failed',
                description: error instanceof Error ? error.message : 'Could not save role',
                variant: 'destructive',
            });
        } finally {
            setRoleFormLoading(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`Delete user ${name}?`)) return;

        try {
            await deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            toast({
                title: 'Success',
                description: 'User deleted successfully',
            });
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to delete user',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <PageHeader
                title="Users & Roles"
                description="Manage system users and their roles"
            />

            <div className="flex-1 overflow-hidden flex flex-col p-6">
                {/* Header with Create Button */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Users</h2>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedUser(null)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedUser ? 'Edit User' : 'Create New User'}
                                </DialogTitle>
                            </DialogHeader>
                            <UserForm
                                user={selectedUser}
                                onSuccess={() => {
                                    setIsFormOpen(false);
                                    loadUsers(pagination.page);
                                }}
                                onCancel={() => setIsFormOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Users Table */}
                <Card className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.full_name}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {user.roles.length > 0 ? (
                                                        user.roles.map(role => (
                                                            <Badge key={role.id} variant="secondary" className="text-xs">
                                                                {role.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No roles</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.is_active ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {format(new Date(user.created_at), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsDetailsOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(user.id, user.username)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                {/* Pagination Info */}
                {!isLoading && users.length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                        Showing {users.length} of {pagination.total} users
                    </div>
                )}

                <Card className="mt-6 p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Roles & Permissions</h3>
                            <p className="text-sm text-muted-foreground">Manage available roles and permission assignments.</p>
                        </div>
                        <Button size="sm" onClick={openCreateRoleDialog}>
                            <Plus className="mr-2 h-4 w-4" /> New Role
                        </Button>
                    </div>

                    {roles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No roles found.</p>
                    ) : (
                        <div className="space-y-3">
                            {roles.map((role) => (
                                <div key={role.id} className="rounded-lg border p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{role.name}</p>
                                            <p className="text-xs text-muted-foreground">{role.description || 'No description'}</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => openEditRoleDialog(role)}>
                                            <Pencil className="mr-2 h-3 w-3" /> Edit
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.length > 0 ? (
                                            role.permissions.map((perm) => (
                                                <Badge key={perm.id} variant="secondary" className="text-xs font-mono">
                                                    {perm.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No permissions assigned</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Details Dialog */}
            {selectedUser && (
                <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>
                                ID: {selectedUser.id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Username</p>
                                    <p className="text-sm mt-1">{selectedUser.username}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                                    <p className="text-sm mt-1">{selectedUser.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Full Name</p>
                                    <p className="text-sm mt-1">{selectedUser.full_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Phone</p>
                                    <p className="text-sm mt-1">{selectedUser.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Status</p>
                                    <Badge className="mt-1" variant={selectedUser.is_active ? 'default' : 'secondary'}>
                                        {selectedUser.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Created</p>
                                    <p className="text-sm mt-1">{format(new Date(selectedUser.created_at), 'PPp')}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Roles</p>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedUser.roles.length > 0 ? (
                                        selectedUser.roles.map(role => (
                                            <Badge key={role.id} variant="secondary">
                                                {role.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? `Edit Role: ${editingRole.name}` : 'Create Role'}</DialogTitle>
                        <DialogDescription>
                            Assign permissions that control access to features and APIs.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="role-name">Role Name</Label>
                                <Input
                                    id="role-name"
                                    value={roleForm.name}
                                    onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                                    disabled={roleFormLoading || !!editingRole}
                                />
                            </div>
                            <div>
                                <Label htmlFor="role-description">Description</Label>
                                <Input
                                    id="role-description"
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                                    disabled={roleFormLoading}
                                />
                            </div>
                        </div>

                        <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border p-3">
                            {permissions.map((permission) => {
                                const checked = roleForm.permission_ids.includes(permission.id);
                                return (
                                    <label key={permission.id} className="flex cursor-pointer items-start gap-3 rounded px-2 py-1 hover:bg-muted/50">
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(state) => toggleRolePermission(permission.id, state === true)}
                                        />
                                        <div>
                                            <p className="text-sm font-mono">{permission.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {permission.description || `${permission.resource}:${permission.action}`}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={roleFormLoading}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRole} disabled={roleFormLoading}>
                                {roleFormLoading ? 'Saving...' : 'Save Role'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
