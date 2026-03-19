'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createUser, getRoles, updateUser, type Role, type User, type UserCreateInput, type UserUpdateInput } from '@/services/users';

interface UserFormProps {
    user?: User | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [formData, setFormData] = useState({
        email: user?.email || '',
        username: user?.username || '',
        full_name: user?.full_name || '',
        password: '',
        phone: user?.phone || '',
        is_active: user?.is_active ?? true,
        role_id: user?.roles?.[0]?.id?.toString() || '',
    });
    const { toast } = useToast();

    useEffect(() => {
        let mounted = true;

        const loadRoles = async () => {
            setIsLoadingRoles(true);
            try {
                const data = await getRoles();
                if (mounted) {
                    setRoles(data || []);
                }
            } catch {
                toast({
                    title: 'Error',
                    description: 'Failed to load roles',
                    variant: 'destructive',
                });
            } finally {
                if (mounted) {
                    setIsLoadingRoles(false);
                }
            }
        };

        loadRoles();
        return () => {
            mounted = false;
        };
    }, [toast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!formData.role_id) {
                toast({
                    title: 'Error',
                    description: 'Role is required',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            if (user) {
                // Update user
                const updateData: Partial<UserUpdateInput> = {
                    email: formData.email,
                    username: formData.username,
                    full_name: formData.full_name,
                    phone: formData.phone || undefined,
                    is_active: formData.is_active,
                    role_ids: formData.role_id ? [Number(formData.role_id)] : [],
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await updateUser(user.id, updateData);
                toast({
                    title: 'Success',
                    description: 'User updated successfully',
                });
            } else {
                // Create user
                if (!formData.password) {
                    toast({
                        title: 'Error',
                        description: 'Password is required for new users',
                        variant: 'destructive',
                    });
                    setIsLoading(false);
                    return;
                }
                const payload: UserCreateInput = {
                    email: formData.email,
                    username: formData.username,
                    full_name: formData.full_name,
                    password: formData.password,
                    phone: formData.phone || undefined,
                    is_active: formData.is_active,
                    role_ids: formData.role_id ? [Number(formData.role_id)] : [],
                };
                await createUser(payload);
                toast({
                    title: 'Success',
                    description: 'User created successfully',
                });
            }
            onSuccess?.();
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save user',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        disabled={!!user}
                        required
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="mt-1"
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="mt-1"
                />
            </div>

            <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="mt-1"
                />
            </div>

            <div>
                <Label htmlFor="role_id">Role</Label>
                <Select
                    value={formData.role_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, role_id: value }))}
                    disabled={isLoadingRoles || isLoading}
                >
                    <SelectTrigger id="role_id" className="mt-1">
                        <SelectValue placeholder={isLoadingRoles ? 'Loading roles...' : 'Select a role'} />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)}>
                                {role.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label htmlFor="password">
                    {user ? 'Password (Leave blank to keep current)' : 'Password'}
                </Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!user}
                    minLength={8}
                    placeholder={user ? 'Leave blank to keep current' : 'Minimum 8 characters'}
                    className="mt-1"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="rounded"
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">
                    Active
                </Label>
            </div>

            <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" disabled={isLoading} onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </form>
    );
}
