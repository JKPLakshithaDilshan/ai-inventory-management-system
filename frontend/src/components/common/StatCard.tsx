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
        <Card className={cn('min-w-0 hover:shadow-md transition-shadow', className)}>
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium leading-5 text-muted-foreground break-words">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2 min-w-0">
                            <p className="text-2xl font-bold tracking-tight leading-none break-words">
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
                            <p className="text-xs leading-5 text-muted-foreground break-words">
                                {trend?.label || description}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
