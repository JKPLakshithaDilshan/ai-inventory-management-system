export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
    action_url?: string;
}

// Mock notifications for now
const mockNotifications: Notification[] = [
    {
        id: '1',
        title: 'Low Stock Alert',
        message: 'Laptop stock is below 10 units',
        type: 'warning',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        action_url: '/products',
    },
    {
        id: '2',
        title: 'New Purchase Order',
        message: 'Purchase order PO-12345 has been created',
        type: 'info',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        action_url: '/purchases',
    },
    {
        id: '3',
        title: 'Sales Order Confirmed',
        message: 'Sales order SO-67890 has been confirmed',
        type: 'success',
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        action_url: '/sales',
    },
];

export async function getNotifications(): Promise<Notification[]> {
    // TODO: Replace with actual API call when backend endpoint is ready
    // return http.get('/notifications');
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockNotifications);
        }, 300);
    });
}

export async function markAsRead(notificationId: string): Promise<void> {
    // TODO: Replace with actual API call when backend endpoint is ready
    // return http.put(`/notifications/${notificationId}/read`);
    return new Promise(resolve => {
        setTimeout(() => {
            const notif = mockNotifications.find(n => n.id === notificationId);
            if (notif) notif.read = true;
            resolve();
        }, 200);
    });
}

export async function clearNotifications(): Promise<void> {
    // TODO: Replace with actual API call when backend endpoint is ready
    // return http.delete('/notifications');
    return new Promise(resolve => {
        setTimeout(() => {
            mockNotifications.forEach(n => n.read = true);
            resolve();
        }, 200);
    });
}
