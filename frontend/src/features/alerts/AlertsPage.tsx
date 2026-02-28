import { useState } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { getLowStockProducts, generateAIReorderSuggestions, getSupplierById, type Product, type AIReorderSuggestion } from '@/lib/mockData';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Sparkles, ShoppingCart, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AlertsPage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isCreatingDraft, setIsCreatingDraft] = useState(false);

    const lowStockProducts = getLowStockProducts();
    const aiSuggestions = generateAIReorderSuggestions();

    const handleCreatePurchaseDraft = (suggestion: AIReorderSuggestion) => {
        setIsCreatingDraft(true);

        // Populate purchase store
        const { clearDraft, updateDraftMeta, addItem } = usePurchaseStore.getState();
        
        // Clear any existing draft first
        clearDraft();

        // Set supplier and metadata
        updateDraftMeta({
            supplierId: suggestion.supplierId,
            referenceNo: `AI-${Date.now()}`,
            purchaseDate: new Date().toISOString().split('T')[0],
            notes: `AI-generated reorder for ${suggestion.name}. ${suggestion.reason}`,
        });

        // Add the suggested item
        addItem({
            id: crypto.randomUUID(),
            productId: suggestion.productId,
            sku: suggestion.sku,
            name: suggestion.name,
            qty: suggestion.suggestedQty,
            unitCost: suggestion.estimatedCost / suggestion.suggestedQty,
            lineTotal: suggestion.estimatedCost,
        });

        setTimeout(() => {
            setIsCreatingDraft(false);
            toast({
                title: 'Purchase Draft Created',
                description: `Draft created for ${suggestion.name}. Redirecting...`,
            });
            navigate('/purchases/new');
        }, 500);
    };

    const handleBulkCreateDraft = () => {
        if (aiSuggestions.length === 0) {
            toast({
                title: 'No Suggestions',
                description: 'There are no AI reorder suggestions to process.',
                variant: 'destructive',
            });
            return;
        }

        setIsCreatingDraft(true);

        // Group by supplier
        const groupedBySupplier = aiSuggestions.reduce((acc, suggestion) => {
            if (!acc[suggestion.supplierId]) {
                acc[suggestion.supplierId] = [];
            }
            acc[suggestion.supplierId].push(suggestion);
            return acc;
        }, {} as Record<string, AIReorderSuggestion[]>);

        // Take the first supplier's suggestions for the draft
        const firstSupplier = Object.keys(groupedBySupplier)[0];
        const suggestions = groupedBySupplier[firstSupplier];

        // Populate purchase store
        const { clearDraft, updateDraftMeta, addItem } = usePurchaseStore.getState();
        
        clearDraft();

        updateDraftMeta({
            supplierId: firstSupplier,
            referenceNo: `AI-BULK-${Date.now()}`,
            purchaseDate: new Date().toISOString().split('T')[0],
            notes: `Bulk AI-generated reorder for ${suggestions.length} products from ${suggestions[0].supplierName}`,
        });

        suggestions.forEach(suggestion => {
            addItem({
                id: crypto.randomUUID(),
                productId: suggestion.productId,
                sku: suggestion.sku,
                name: suggestion.name,
                qty: suggestion.suggestedQty,
                unitCost: suggestion.estimatedCost / suggestion.suggestedQty,
                lineTotal: suggestion.estimatedCost,
            });
        });

        setTimeout(() => {
            setIsCreatingDraft(false);
            toast({
                title: 'Bulk Purchase Draft Created',
                description: `Draft created with ${suggestions.length} items. Redirecting...`,
            });
            navigate('/purchases/new');
        }, 500);
    };

    // Low Stock Table Columns
    const lowStockColumns: ColumnDef<Product>[] = [
        {
            accessorKey: 'sku',
            header: 'SKU',
        },
        {
            accessorKey: 'name',
            header: 'Product Name',
        },
        {
            accessorKey: 'stock',
            header: 'Current Stock',
            cell: ({ row }) => {
                const stock = row.getValue('stock') as number;
                const reorderPoint = row.original.reorderPoint;
                const isOutOfStock = stock === 0;
                const isCritical = stock < reorderPoint * 0.3;

                return (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{stock}</span>
                        {isOutOfStock && (
                            <Badge variant="destructive" className="text-xs">OUT</Badge>
                        )}
                        {!isOutOfStock && isCritical && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                                CRITICAL
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'reorderPoint',
            header: 'Reorder Point',
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <Badge variant="outline" className="bg-muted">
                    {row.getValue('category')}
                </Badge>
            ),
        },
        {
            id: 'supplier',
            header: 'Supplier',
            cell: ({ row }) => {
                const supplier = getSupplierById(row.original.supplierId);
                return <span className="text-sm text-muted-foreground">{supplier?.name || 'N/A'}</span>;
            },
        },
    ];

    // AI Reorder Suggestions Columns
    const aiSuggestionsColumns: ColumnDef<AIReorderSuggestion>[] = [
        {
            accessorKey: 'sku',
            header: 'SKU',
        },
        {
            accessorKey: 'name',
            header: 'Product Name',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">{row.getValue('name')}</span>
                </div>
            ),
        },
        {
            accessorKey: 'currentStock',
            header: 'Current',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span>{row.getValue('currentStock')}</span>
                </div>
            ),
        },
        {
            accessorKey: 'suggestedQty',
            header: 'Suggested Qty',
            cell: ({ row }) => (
                <span className="font-semibold text-primary">
                    {row.getValue('suggestedQty')}
                </span>
            ),
        },
        {
            accessorKey: 'confidence',
            header: 'Confidence',
            cell: ({ row }) => {
                const confidence = row.getValue('confidence') as number;
                const variant = confidence >= 90 ? 'default' : confidence >= 80 ? 'secondary' : 'outline';
                return (
                    <Badge variant={variant} className={confidence >= 90 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : ''}>
                        {confidence}%
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'reason',
            header: 'Reason',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.getValue('reason')}</span>
            ),
        },
        {
            accessorKey: 'estimatedCost',
            header: 'Est. Cost',
            cell: ({ row }) => {
                const amount = row.getValue('estimatedCost') as number;
                return (
                    <span className="font-medium">
                        ${amount.toFixed(2)}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: 'Action',
            cell: ({ row }) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreatePurchaseDraft(row.original)}
                    disabled={isCreatingDraft}
                >
                    <ShoppingCart className="mr-2 h-3 w-3" />
                    Create Draft
                </Button>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Alerts & AI Reorder"
                description="Monitor low stock levels and review AI-powered reorder suggestions."
                action={
                    <Button
                        onClick={handleBulkCreateDraft}
                        disabled={aiSuggestions.length === 0 || isCreatingDraft}
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Bulk Draft
                    </Button>
                }
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lowStockProducts.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Products below reorder point
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
                        <Sparkles className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aiSuggestions.length}</div>
                        <p className="text-xs text-muted-foreground">
                            AI-powered reorder recommendations
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Est. Total Cost</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${aiSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            For all AI recommendations
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        Low Stock Products
                    </CardTitle>
                    <CardDescription>
                        Products with current stock at or below their reorder point
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={lowStockColumns} data={lowStockProducts} />
                </CardContent>
            </Card>

            {/* AI Reorder Suggestions Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Reorder Suggestions
                    </CardTitle>
                    <CardDescription>
                        Intelligent recommendations based on stock levels, reorder points, and demand patterns
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={aiSuggestionsColumns} data={aiSuggestions} />
                </CardContent>
            </Card>
        </div>
    );
}
