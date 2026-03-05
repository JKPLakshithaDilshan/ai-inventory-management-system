import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Search, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { SidebarContent } from '@/components/shell/Sidebar';
import { useAuthStore } from '@/stores/useAuthStore';
import { getNotifications, markAsRead, clearNotifications, type Notification } from '@/services/notifications';

export function Topbar() {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setIsLoadingNotifications(true);
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setIsLoadingNotifications(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await markAsRead(id);
            setNotifications(notifications.map(n => 
                n.id === id ? { ...n, read: true } : n
            ));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearNotifications();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to clear notifications', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = () => {
        logout();
        navigate('/auth/login', { replace: true });
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
            {/* Mobile Sidebar Toggle */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 w-72">
                    <SidebarContent mobile />
                </SheetContent>
            </Sheet>

            {/* NLP Search Mock */}
            <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                <form className="ml-auto flex-1 sm:flex-initial">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder='Try "Show me low stock items"'
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-muted/50 rounded-full border-muted-foreground/20 focus-visible:ring-primary"
                        />
                    </div>
                </form>

                {/* Actions Menu */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="relative h-9 w-9 rounded-full" title="Notifications">
                                <Bell className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center p-0 text-xs bg-destructive">
                                        {unreadCount}
                                    </Badge>
                                )}
                                <span className="sr-only">Notifications ({unreadCount} unread)</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel className="flex items-center justify-between">
                                <span>Notifications</span>
                                {unreadCount > 0 && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-xs h-auto p-0"
                                        onClick={handleClearAll}
                                    >
                                        Mark all as read
                                    </Button>
                                )}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {isLoadingNotifications ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                            ) : (
                                <>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.map(notification => (
                                            <DropdownMenuItem
                                                key={notification.id}
                                                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                                                onClick={() => {
                                                    if (!notification.read) {
                                                        handleMarkAsRead(notification.id);
                                                    }
                                                    if (notification.action_url) {
                                                        navigate(notification.action_url);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-between w-full gap-2">
                                                    <span className="font-medium text-sm">{notification.title}</span>
                                                    {!notification.read && (
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{notification.message}</p>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(notification.created_at).toLocaleTimeString([], { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Button variant="ghost" className="w-full justify-center text-xs h-8">
                                            View all notifications
                                        </Button>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://github.com/shadcn.png" alt="@admin" />
                                    <AvatarFallback>AD</AvatarFallback>
                                </Avatar>
                                <span className="sr-only">Toggle user menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link to="/settings" className="cursor-pointer">Settings</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href="https://support.inventory.app" target="_blank" rel="noopener noreferrer" className="cursor-pointer">Support</a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
