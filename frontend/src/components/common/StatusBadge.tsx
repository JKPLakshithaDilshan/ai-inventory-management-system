import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
    'font-medium',
    {
        variants: {
            status: {
                success: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400 border-green-500/20',
                warning: 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20',
                danger: 'bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400 border-red-500/20',
                info: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
                neutral: 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 dark:text-gray-400 border-gray-500/20',
            },
        },
        defaultVariants: {
            status: 'neutral',
        },
    }
);

export interface StatusBadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof statusBadgeVariants> {
    label?: string;
}

export function StatusBadge({ status, label, className, children, ...props }: StatusBadgeProps) {
    return (
        <Badge
            variant="outline"
            className={cn(statusBadgeVariants({ status }), className)}
            {...props}
        >
            {label || children}
        </Badge>
    );
}

// Helper function to map common statuses
export function getStockStatus(stock: number, lowThreshold = 10): 'success' | 'warning' | 'danger' {
    if (stock === 0) return 'danger';
    if (stock <= lowThreshold) return 'warning';
    return 'success';
}

export function getStockStatusLabel(stock: number, lowThreshold = 10): string {
    if (stock === 0) return 'OUT';
    if (stock <= lowThreshold) return 'LOW';
    return 'OK';
}
