import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Receipt,
    ClipboardList,
    AlertTriangle,
    LineChart,
    Users,
    Settings,
    History,
    TrendingUp,
    BrainCircuit,
    Warehouse,
    Building2,
    ChevronLeft,
    ChevronRight,
    BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { hasPermission, PERMISSIONS, type Permission } from '@/lib/rbac';

interface NavItem {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    permission?: Permission;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

interface SidebarProps {
    className?: string;
    mobile?: boolean;
    isCollapsed?: boolean;
    onToggle?: () => void;
}

const navGroups: NavGroup[] = [
    {
        title: 'Core',
        items: [
            { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
            { title: 'Products', icon: Package, href: '/products', permission: PERMISSIONS.PRODUCTS_VIEW },
            { title: 'Suppliers', icon: Warehouse, href: '/suppliers', permission: PERMISSIONS.SUPPLIERS_VIEW },
            { title: 'Warehouses', icon: Building2, href: '/warehouses', permission: PERMISSIONS.WAREHOUSE_VIEW },
            { title: 'Customers', icon: Users, href: '/customers', permission: PERMISSIONS.CUSTOMER_VIEW },
            { title: 'Purchases', icon: ShoppingCart, href: '/purchases', permission: PERMISSIONS.PURCHASES_VIEW },
            { title: 'Sales', icon: Receipt, href: '/sales', permission: PERMISSIONS.SALES_VIEW },
            { title: 'Stock Adjustments', icon: ClipboardList, href: '/stock-adjustments', permission: PERMISSIONS.STOCK_ADJUSTMENT_VIEW },
            { title: 'Reports', icon: BarChart3, href: '/reports', permission: PERMISSIONS.REPORTS_VIEW },
        ],
    },
    {
        title: 'AI & Alerts',
        items: [
            { title: 'Alerts', icon: AlertTriangle, href: '/alerts', permission: PERMISSIONS.ALERTS_VIEW },
            { title: 'AI Forecast', icon: TrendingUp, href: '/ai/forecast', permission: PERMISSIONS.AI_FORECAST_VIEW },
            { title: 'AI Reorder', icon: BrainCircuit, href: '/ai/reorder', permission: PERMISSIONS.AI_REORDER_VIEW },
        ],
    },
    {
        title: 'Admin',
        items: [
            { title: 'Users & Roles', icon: Users, href: '/users', permission: PERMISSIONS.ADMIN_USERS_MANAGE },
            { title: 'Audit Logs', icon: History, href: '/audit-logs', permission: PERMISSIONS.ADMIN_AUDIT_VIEW },
            { title: 'Settings', icon: Settings, href: '/settings', permission: PERMISSIONS.ADMIN_SETTINGS },
        ],
    },
];

export function SidebarContent({ mobile, isCollapsed, onToggle }: SidebarProps) {
    const { user } = useAuthStore();

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-full flex-col gap-4">
                <div className={cn("flex h-16 items-center border-b", isCollapsed && !mobile ? "justify-center px-0" : "px-6 justify-between")}>
                    <NavLink to="/" className={cn("flex items-center gap-2 font-semibold", isCollapsed && !mobile && "justify-center")}>
                        <LineChart className="h-6 w-6 text-primary shrink-0" />
                        {(!isCollapsed || mobile) && <span className="text-lg tracking-tight">AI Inventory</span>}
                    </NavLink>

                    {!mobile && onToggle && (
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={onToggle}>
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-2 text-sm font-medium">
                        {navGroups.map((group, index) => {
                            // Filter items by permission
                            const visibleItems = group.items.filter(item =>
                                !item.permission || hasPermission(user, item.permission)
                            );

                            // Skip group if no visible items
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={index} className="pb-4">
                                    {(!isCollapsed || mobile) ? (
                                        <h4 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {group.title}
                                        </h4>
                                    ) : (
                                        <div className="mx-auto mb-2 w-6 border-t" />
                                    )}

                                    {visibleItems.map((item, itemIndex) => {
                                        const linkContent = (
                                            <NavLink
                                                key={itemIndex}
                                                to={item.href}
                                                className={({ isActive }) =>
                                                    cn(
                                                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary mb-1',
                                                        isActive ? 'bg-muted text-primary' : 'text-muted-foreground',
                                                        isCollapsed && !mobile && "justify-center px-0 h-10 w-10 mx-auto"
                                                    )
                                                }
                                            >
                                                <item.icon className="h-4 w-4 shrink-0" />
                                                {(!isCollapsed || mobile) && <span>{item.title}</span>}
                                            </NavLink>
                                        );

                                        if (isCollapsed && !mobile) {
                                            return (
                                                <Tooltip key={itemIndex}>
                                                    <TooltipTrigger asChild>
                                                        {linkContent}
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        {item.title}
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        }

                                        return linkContent;
                                    })}
                                </div>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </TooltipProvider>
    );
}

export function Sidebar({ className }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={cn(
            'hidden border-r bg-muted/40 md:block h-full transition-all duration-300',
            isCollapsed ? "w-16" : "w-64",
            className
        )}>
            <SidebarContent isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        </aside>
    );
}
