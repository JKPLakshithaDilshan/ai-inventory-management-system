import { http } from './http';

export interface Role {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    permissions: Permission[];
}

export interface Permission {
    id: number;
    name: string;
    description?: string;
    resource: string;
    action: string;
    created_at: string;
}

export interface User {
    id: number;
    email: string;
    username: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    roles: Role[];
}

export interface UserCreateInput {
    email: string;
    username: string;
    full_name: string;
    password: string;
    phone?: string;
    avatar_url?: string;
    role_ids?: number[];
    is_active?: boolean;
    is_superuser?: boolean;
}

export interface UserUpdateInput {
    email?: string;
    username?: string;
    full_name?: string;
    password?: string;
    phone?: string;
    avatar_url?: string;
    role_ids?: number[];
    is_active?: boolean;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export async function getUsers(
    skip = 0,
    limit = 100
): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({
        skip: String(skip),
        limit: String(limit),
    });

    return http.get(`/users?${params}`, {
        method: 'GET',
    });
}

export async function getUser(id: number): Promise<User> {
    return http.get(`/users/${id}`);
}

export async function createUser(data: UserCreateInput): Promise<User> {
    return http.post(`/users`, data);
}

export async function updateUser(
    id: number,
    data: Partial<UserUpdateInput>
): Promise<User> {
    return http.put(`/users/${id}`, data);
}

export async function deleteUser(id: number): Promise<{ message: string }> {
    return http.delete(`/users/${id}`);
}
