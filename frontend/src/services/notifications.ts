import { http } from './http';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
    action_url?: string;
}

interface NotificationListResponse {
    items: Notification[];
    unread_count: number;
}

export async function getNotifications(): Promise<Notification[]> {
    const response = await http.get<NotificationListResponse>('/notifications?limit=20');
    return response.items;
}

export async function markAsRead(notificationId: string): Promise<void> {
    await http.put(`/notifications/${notificationId}/read`);
}

export async function clearNotifications(): Promise<void> {
    await http.delete('/notifications');
}
