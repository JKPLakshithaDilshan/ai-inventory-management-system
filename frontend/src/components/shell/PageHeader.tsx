import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: Breadcrumb[];
    action?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, breadcrumbs, action, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8', className)}>
            <div className="flex flex-col gap-1">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex items-center text-sm text-muted-foreground mb-2">
                        {breadcrumbs.map((bc, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                                {bc.href ? (
                                    <a href={bc.href} className="hover:text-foreground transition-colors">
                                        {bc.label}
                                    </a>
                                ) : (
                                    <span className="text-foreground font-medium">{bc.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {action && <div className="flex shrink-0">{action}</div>}
        </div>
    );
}
