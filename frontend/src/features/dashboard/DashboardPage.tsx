'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Warehouse, 
  Users, 
  AlertTriangle,
  Plus,
  ArrowRight,
  X,
  Zap,
  Clock
} from 'lucide-react';
import { getDashboardStats, getRecentActivities, type DashboardStats, type RecentActivity } from '@/services/dashboard';
import { getSuppliers } from '@/services/suppliers';
import { warehouseApi } from '@/services/warehouses';
import { getPurchases, type Purchase } from '@/services/purchases';
import { saleApi, type Sale } from '@/services/sales';
import { getReorderSuggestions, getSlowMovingStock, type ReorderSuggestion, type SlowMovingStockItem } from '@/services/analytics';
import { useAuthStore } from '@/stores/useAuthStore';

export function DashboardPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [suppliersCount, setSuppliersCount] = useState(0);
    const [warehousesCount, setWarehousesCount] = useState(0);
    const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
    const [slowMovingStock, setSlowMovingStock] = useState<SlowMovingStockItem[]>([]);

    const loadDashboard = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [statsRes, activitiesRes, suppliersRes, warehousesRes, purchasesRes, salesRes, reorderRes, slowMovingRes] = await Promise.all([
                getDashboardStats(30),
                getRecentActivities(10),
                getSuppliers(0, 1).catch(() => ({ items: [], total: 0 })),
                warehouseApi.list().catch(() => ({ items: [], total: 0 })),
                getPurchases(0, 5).catch(() => ({ items: [] })),
                saleApi.list({ limit: 5 }).catch(() => ({ items: [] })),
                getReorderSuggestions({ days_lookback: 30 }).catch(() => ({ suggestions: [], total_count: 0, critical_count: 0, high_priority_count: 0 })),
                getSlowMovingStock({ days_lookback: 90, min_days_no_sales: 30 }).catch(() => ({ items: [], total_count: 0, dead_stock_count: 0, total_stock_value: 0, days_analyzed: 90 })),
            ]);
            setStats(statsRes);
            setActivities(activitiesRes);
            setSuppliersCount(suppliersRes.total || 0);
            setWarehousesCount(warehousesRes.total || 0);
            setRecentPurchases(purchasesRes.items || []);
            setRecentSales(salesRes.items || []);
            setReorderSuggestions(reorderRes.suggestions.slice(0, 5) || []);
            setSlowMovingStock(slowMovingRes.items.slice(0, 5) || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadDashboard();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, loadDashboard]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatRelativeTime = (iso: string) => {
        const date = new Date(iso);
        const diffMs = Date.now() - date.getTime();
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const toTitleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    const getPurchaseStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            draft: 'secondary',
            pending: 'outline',
            approved: 'outline',
            received: 'default',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
    };

    const getSaleStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            draft: 'secondary',
            completed: 'default',
            cancelled: 'destructive',
            refunded: 'outline',
        };
        return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
    };

    const getUrgencyBadge = (urgency: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            critical: 'destructive',
            high: 'destructive',
            medium: 'outline',
            low: 'secondary',
        };
        return <Badge variant={variants[urgency] || 'secondary'}>{urgency.toUpperCase()}</Badge>;
    };

    const getSeverityBadge = (severity: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            dead_stock: 'destructive',
            critical: 'destructive',
            slow: 'outline',
            moderate: 'secondary',
        };
        const label = severity.replace('_', ' ').toUpperCase();
        return <Badge variant={variants[severity] || 'secondary'}>{label}</Badge>;
    };

    const panelClass = 'rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm';
    const itemRowClass = 'flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-colors cursor-pointer hover:border-primary/20 hover:bg-primary/5';
    const metricCards = [
        {
            key: 'products',
            title: 'Total Products',
            value: stats?.products.total ?? 0,
            description: 'In inventory',
            icon: Package,
            iconClass: 'bg-blue-100 text-blue-600 border-blue-200',
        },
        {
            key: 'suppliers',
            title: 'Total Suppliers',
            value: suppliersCount,
            description: 'Active vendors',
            icon: Users,
            iconClass: 'bg-indigo-100 text-indigo-600 border-indigo-200',
        },
        {
            key: 'warehouses',
            title: 'Warehouses',
            value: warehousesCount,
            description: 'Locations',
            icon: Warehouse,
            iconClass: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        },
        {
            key: 'low-stock',
            title: 'Low Stock',
            value: stats?.products.low_stock ?? 0,
            description: 'Need reorder',
            icon: TrendingUp,
            iconClass: 'bg-amber-100 text-amber-700 border-amber-200',
        },
        {
            key: 'out-stock',
            title: 'Out of Stock',
            value: stats?.products.out_of_stock ?? 0,
            description: 'Critical',
            icon: AlertTriangle,
            iconClass: 'bg-rose-100 text-rose-700 border-rose-200',
        },
        {
            key: 'value',
            title: 'Stock Value',
            value: formatCurrency(stats?.inventory_value ?? 0),
            description: 'Total inventory',
            icon: DollarSign,
            iconClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            valueClass: 'text-3xl',
        },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="space-y-6 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.08),transparent_26%)] p-6">
                    <PageHeader
                        title="Dashboard"
                        description="Welcome back! Here's your inventory overview."
                    />

                    {error && (
                        <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <X className="h-4 w-4 text-destructive" />
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={loadDashboard}>Retry</Button>
                            </div>
                        </Card>
                    )}

                    {/* KPI Cards */}
                    <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/85 shadow-sm backdrop-blur-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:divide-x xl:divide-border/60">
                        {isLoading ? (
                            <>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="space-y-4 border-b border-border/60 p-5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0 xl:border-b-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-10 w-10 rounded-xl" />
                                        </div>
                                        <Skeleton className="h-9 w-24" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                {metricCards.map((metric, index) => {
                                    const Icon = metric.icon;
                                    const borderClearClass = [
                                        'border-b border-border/60',
                                        'sm:[&:nth-last-child(-n+2)]:border-b-0',
                                        'lg:[&:nth-last-child(-n+3)]:border-b-0',
                                        'xl:border-b-0',
                                    ].join(' ');

                                    return (
                                        <div
                                            key={metric.key}
                                            className={`group relative space-y-4 p-5 transition-colors hover:bg-primary/[0.03] ${index === metricCards.length - 1 ? 'border-b-0' : borderClearClass}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.02em] text-muted-foreground/90">
                                                    {metric.title}
                                                </p>
                                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${metric.iconClass}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className={`font-bold tracking-tight text-foreground ${metric.valueClass ?? 'text-5xl lg:text-4xl'}`}>
                                                    {metric.value}
                                                </p>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    {metric.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    </Card>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Button 
                                variant="outline" 
                                className="h-auto justify-start rounded-2xl border-border/60 bg-gradient-to-br from-background to-muted/40 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                onClick={() => navigate('/purchases/new')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <div className="text-left">
                                    <div className="font-medium">New Purchase</div>
                                    <div className="text-xs text-muted-foreground">Create purchase order</div>
                                </div>
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-auto justify-start rounded-2xl border-border/60 bg-gradient-to-br from-background to-muted/40 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                onClick={() => navigate('/sales/new')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <div className="text-left">
                                    <div className="font-medium">New Sale</div>
                                    <div className="text-xs text-muted-foreground">Record a sale</div>
                                </div>
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-auto justify-start rounded-2xl border-border/60 bg-gradient-to-br from-background to-muted/40 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                onClick={() => navigate('/products')}
                            >
                                <Package className="mr-2 h-4 w-4" />
                                <div className="text-left">
                                    <div className="font-medium">View Products</div>
                                    <div className="text-xs text-muted-foreground">Manage inventory</div>
                                </div>
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-auto justify-start rounded-2xl border-border/60 bg-gradient-to-br from-background to-muted/40 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                onClick={() => navigate('/stock-ledger')}
                            >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                <div className="text-left">
                                    <div className="font-medium">Stock Ledger</div>
                                    <div className="text-xs text-muted-foreground">Audit trail</div>
                                </div>
                            </Button>
                        </div>
                    </div>

                    {/* Recent Activity & Transactions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Reorder Suggestions */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    <h2 className="text-lg font-semibold tracking-tight">Reorder Suggestions</h2>
                                </div>
                            </div>

                            {isLoading ? (
                                <Card className={`${panelClass} p-4 space-y-3`}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-32 mb-2" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    ))}
                                </Card>
                            ) : (
                                <Card className={`${panelClass} p-4`}>
                                    <div className="space-y-3">
                                        {reorderSuggestions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4 text-center">No reorder suggestions at this time</p>
                                        ) : (
                                            reorderSuggestions.map((suggestion) => (
                                                <div 
                                                    key={suggestion.product_id} 
                                                    className={itemRowClass}
                                                    onClick={() => navigate(`/products/${suggestion.product_id}`)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{suggestion.product_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Stock: {suggestion.current_stock} · Reorder: {suggestion.suggested_order_qty} units
                                                        </p>
                                                    </div>
                                                    {getUrgencyBadge(suggestion.urgency)}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Slow-Moving Stock */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-orange-500" />
                                    <h2 className="text-lg font-semibold tracking-tight">Slow-Moving Stock</h2>
                                </div>
                            </div>

                            {isLoading ? (
                                <Card className={`${panelClass} p-4 space-y-3`}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-32 mb-2" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    ))}
                                </Card>
                            ) : (
                                <Card className={`${panelClass} p-4`}>
                                    <div className="space-y-3">
                                        {slowMovingStock.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4 text-center">No slow-moving stock detected</p>
                                        ) : (
                                            slowMovingStock.map((item) => (
                                                <div 
                                                    key={item.product_id} 
                                                    className={itemRowClass}
                                                    onClick={() => navigate(`/products/${item.product_id}`)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{item.product_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.days_since_last_sale} days since last sale · Value: {formatCurrency(item.stock_value)}
                                                        </p>
                                                    </div>
                                                    {getSeverityBadge(item.severity)}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Recent Purchases */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold tracking-tight">Recent Purchases</h2>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => navigate('/purchases')}
                                >
                                    View All <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </div>

                            {isLoading ? (
                                <Card className={`${panelClass} p-4 space-y-3`}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-32 mb-2" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    ))}
                                </Card>
                            ) : (
                                <Card className={`${panelClass} p-4`}>
                                    <div className="space-y-3">
                                        {recentPurchases.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4 text-center">No recent purchases</p>
                                        ) : (
                                            recentPurchases.map((purchase) => (
                                                <div 
                                                    key={purchase.id} 
                                                    className={itemRowClass}
                                                    onClick={() => navigate(`/purchases/${purchase.id}`)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{purchase.purchase_number}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {purchase.supplier?.name} · {formatCurrency(purchase.total_amount)}
                                                        </p>
                                                    </div>
                                                    {getPurchaseStatusBadge(purchase.status)}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Recent Sales */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold tracking-tight">Recent Sales</h2>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => navigate('/sales')}
                                >
                                    View All <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </div>

                            {isLoading ? (
                                <Card className={`${panelClass} p-4 space-y-3`}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-32 mb-2" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    ))}
                                </Card>
                            ) : (
                                <Card className={`${panelClass} p-4`}>
                                    <div className="space-y-3">
                                        {recentSales.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4 text-center">No recent sales</p>
                                        ) : (
                                            recentSales.map((sale) => (
                                                <div 
                                                    key={sale.id} 
                                                    className={itemRowClass}
                                                    onClick={() => navigate(`/sales/${sale.id}`)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{sale.invoice_number}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {sale.customer_name || 'Walk-in'} · {formatCurrency(sale.total_amount)}
                                                        </p>
                                                    </div>
                                                    {getSaleStatusBadge(sale.status)}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Activity Overview */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>

                        {isLoading ? (
                            <Card className={`${panelClass} p-4 space-y-3`}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <Skeleton className="h-4 w-48 mb-2" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                        <Skeleton className="h-6 w-16" />
                                    </div>
                                ))}
                            </Card>
                        ) : (
                            <Card className={`${panelClass} p-4`}>
                                <div className="space-y-3">
                                    {activities.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">No recent activities found</p>
                                    ) : (
                                        activities.map((item) => (
                                            <div key={item.id} className="flex items-start justify-between rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-primary/20 hover:bg-primary/5">
                                                <div className="flex-1 pr-4">
                                                    <p className="font-medium text-sm">{toTitleCase(item.action)} · {toTitleCase(item.resource_type)}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                                </div>
                                                <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(item.created_at)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
