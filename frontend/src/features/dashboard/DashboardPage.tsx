'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react';

export function DashboardPage() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate data fetch
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto">
                <div className="p-6 space-y-8">
                    <PageHeader
                        title="Dashboard"
                        description="Welcome back! Here's your inventory overview."
                    />

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
                                    value="1,234"
                                    description="Across all categories"
                                    icon={Package}
                                    trend={{ value: 12, label: '+12% from last month' }}
                                />
                                <StatCard
                                    title="Low Stock Items"
                                    value="23"
                                    description="Need attention"
                                    icon={TrendingUp}
                                    trend={{ value: -8, label: '-8% better than last month' }}
                                />
                                <StatCard
                                    title="Pending Orders"
                                    value="45"
                                    description="Awaiting processing"
                                    icon={ShoppingCart}
                                    trend={{ value: 5, label: '+5% vs last week' }}
                                />
                                <StatCard
                                    title="Revenue (30d)"
                                    value="$12.5K"
                                    description="Sales performance"
                                    icon={DollarSign}
                                    trend={{ value: 18, label: '+18% growth' }}
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
                                    {[
                                        { action: 'Product updated', description: 'Laptop stock adjusted', time: '2 hours ago' },
                                        { action: 'Purchase created', description: 'Order from TechCorp', time: '5 hours ago' },
                                        { action: 'Sale completed', description: 'Invoice #SO-12345', time: '1 day ago' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start justify-between pb-3 last:pb-0 last:border-0 border-b border-border/50">
                                            <div>
                                                <p className="font-medium text-sm">{item.action}</p>
                                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
