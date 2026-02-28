import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton() {
    return (
        <div className="rounded-md border p-6">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-8 w-[250px]" />
                <Skeleton className="h-8 w-[100px]" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow space-y-4 p-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[40px]" />
            </div>
            <Skeleton className="h-8 w-[60px]" />
            <Skeleton className="h-3 w-[150px]" />
        </div>
    )
}
