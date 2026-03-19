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
        <Card
            className={cn(
                'group relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                className
            )}
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-90" />
            <CardContent className="p-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <p className="min-w-0 break-normal text-xs font-semibold uppercase tracking-[0.02em] leading-tight text-muted-foreground/90 [word-break:normal] [overflow-wrap:normal] [hyphens:none]">
                            {title}
                        </p>
                        {Icon && (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                                <Icon className="h-5 w-5" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold tracking-tight">
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
                </div>
            </CardContent>
        </Card>
    );
}
