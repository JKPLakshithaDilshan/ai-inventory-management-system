import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon?: LucideIcon;
    trend?: {
        value: number;
        label: string;
    };
    className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
    const isPositiveTrend = trend && trend.value >= 0;

    return (
        <Card className={cn('hover:shadow-md transition-shadow', className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold tracking-tight">
                                {value}
                            </p>
                            {trend && (
                                <span
                                    className={cn(
                                        'text-xs font-medium',
                                        isPositiveTrend
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                    )}
                                >
                                    {isPositiveTrend ? '+' : ''}{trend.value}%
                                </span>
                            )}
                        </div>
                        {(description || trend?.label) && (
                            <p className="text-xs text-muted-foreground">
                                {trend?.label || description}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
