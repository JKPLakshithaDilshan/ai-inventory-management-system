'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { getDashboardStats, getRecentActivities, type DashboardStats, type RecentActivity } from '@/services/dashboard';
import { useAuthStore } from '@/stores/useAuthStore';

export function DashboardPage() {
    const { isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<RecentActivity[]>([]);

    const loadDashboard = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [statsRes, activitiesRes] = await Promise.all([
                getDashboardStats(30),
                getRecentActivities(10),
            ]);
            setStats(statsRes);
            setActivities(activitiesRes);
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

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-8">
                    <PageHeader
                        title="Dashboard"
                        description="Welcome back! Here's your inventory overview."
                    />

                    {error && (
                        <Card className="p-4 border-destructive/30 bg-destructive/5">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-destructive">{error}</p>
                                <Button variant="outline" size="sm" onClick={loadDashboard}>Retry</Button>
                            </div>
                        </Card>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {isLoading ? (
                            <>
                                {[1, 2, 3, 4].map(i => (
                                    <Card key={i} className="p-6">
                                        <Skeleton className="h-4 w-20 mb-3" />
                                        <Skeleton className="h-8 w-32 mb-2" />
                                        <Skeleton className="h-3 w-24" />
                                    </Card>
                                ))}
                            </>
                        ) : (
                            <>
                                <StatCard
                                    title="Total Products"
                                    value={stats?.products.total ?? 0}
                                    description="Across all categories"
                                    icon={Package}
                                />
                                <StatCard
                                    title="Low Stock Items"
                                    value={(stats?.products.low_stock ?? 0) + (stats?.products.out_of_stock ?? 0)}
                                    description="Need attention"
                                    icon={TrendingUp}
                                />
                                <StatCard
                                    title="Sales (30d)"
                                    value={stats?.sales.count ?? 0}
                                    description="Completed sales"
                                    icon={ShoppingCart}
                                />
                                <StatCard
                                    title="Revenue (30d)"
                                    value={formatCurrency(stats?.sales.revenue ?? 0)}
                                    description={`Inventory value: ${formatCurrency(stats?.inventory_value ?? 0)}`}
                                    icon={DollarSign}
                                />
                            </>
                        )}
                    </div>

                    {/* Activity Overview */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
                            <p className="text-sm text-muted-foreground mt-1">Latest transactions and changes</p>
                        </div>

                        {isLoading ? (
                            <Card className="p-6 space-y-4">
                                {[1, 2, 3].map(i => (
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
                            <Card className="p-6">
                                <div className="space-y-4">
                                    {activities.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No recent activities found.</p>
                                    ) : (
                                        activities.map((item) => (
                                            <div key={item.id} className="flex items-start justify-between pb-3 last:pb-0 last:border-0 border-b border-border/50">
                                                <div>
                                                    <p className="font-medium text-sm">{toTitleCase(item.action)} · {toTitleCase(item.resource_type)}</p>
                                                    <p className="text-xs text-muted-foreground">{item.description}</p>
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
