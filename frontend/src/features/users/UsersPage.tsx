'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { getUsers, deleteUser, type User, type PaginatedResponse } from '@/services/users';
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
    const { toast } = useToast();

    const loadUsers = async (page = 1) => {
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
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load users',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadUsers();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`Delete user ${name}?`)) return;

        try {
            await deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            toast({
                title: 'Success',
                description: 'User deleted successfully',
            });
        } catch (error) {
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
        </div>
    );
}
