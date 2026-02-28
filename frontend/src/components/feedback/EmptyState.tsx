import { PackageX } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({
    title = 'No results found',
    description = "We couldn't find anything matching your criteria.",
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] border border-dashed rounded-lg bg-muted/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                <PackageX className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {description}
            </p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
