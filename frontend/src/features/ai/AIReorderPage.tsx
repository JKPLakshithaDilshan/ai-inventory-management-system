'use client';

import { PageHeader } from '@/components/shell/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { AlertTriangle, TrendingUp, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ReorderSuggestion {
    id: number;
    product_name: string;
    current_stock: number;
    reorder_point: number;
    suggested_quantity: number;
    supplier_name: string;
    lead_time_days: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
}

export function AIReorderPage() {
    const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading reorder suggestions
        const timer = setTimeout(() => {
            setSuggestions([
                {
                    id: 1,
                    product_name: 'Laptop',
                    current_stock: 5,
                    reorder_point: 10,
                    suggested_quantity: 50,
                    supplier_name: 'TechCorp',
                    lead_time_days: 7,
                    urgency: 'critical',
                },
                {
                    id: 2,
                    product_name: 'Mouse',
                    current_stock: 15,
                    reorder_point: 20,
                    suggested_quantity: 100,
                    supplier_name: 'Global Electronics',
                    lead_time_days: 5,
                    urgency: 'high',
                },
                {
                    id: 3,
                    product_name: 'Keyboard',
                    current_stock: 25,
                    reorder_point: 15,
                    suggested_quantity: 75,
                    supplier_name: 'Quality Parts',
                    lead_time_days: 3,
                    urgency: 'medium',
                },
            ]);
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const getUrgencyColor = (urgency: ReorderSuggestion['urgency']) => {
        switch (urgency) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-300';
        }
    };

    const getUrgencyIcon = (urgency: ReorderSuggestion['urgency']) => {
        switch (urgency) {
            case 'critical':
            case 'high':
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <TrendingUp className="h-4 w-4" />;
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <PageHeader
                title="AI Reorder Suggestions"
                description="AI-powered inventory reorder recommendations based on historical data and trends"
            />

            <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Critical Items</p>
                        <p className="text-3xl font-bold mt-2">
                            {suggestions.filter(s => s.urgency === 'critical').length}
                        </p>
                        <p className="text-xs text-red-600 mt-2">Need immediate attention</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Suggested Orders</p>
                        <p className="text-3xl font-bold mt-2">{suggestions.length}</p>
                        <p className="text-xs text-muted-foreground mt-2">Total recommendations</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="text-3xl font-bold mt-2">
                            ${(suggestions.reduce((sum, s) => sum + s.suggested_quantity * 100, 0) / 100).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">For all suggestions</p>
                    </Card>
                </div>

                {/* Suggestions List */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted-foreground">Loading suggestions...</p>
                        </div>
                    ) : suggestions.length === 0 ? (
                        <EmptyState
                            title="No Reorder Suggestions"
                            description="Your inventory levels are optimal. No items need reordering at this time."
                        />
                    ) : (
                        <div className="space-y-3">
                            {suggestions.map(suggestion => (
                                <Card key={suggestion.id} className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <h3 className="font-semibold">{suggestion.product_name}</h3>
                                                <Badge className={`text-xs gap-2 ${getUrgencyColor(suggestion.urgency)}`}>
                                                    {getUrgencyIcon(suggestion.urgency)}
                                                    {suggestion.urgency.charAt(0).toUpperCase() + suggestion.urgency.slice(1)}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Current Stock</p>
                                                    <p className="font-medium">{suggestion.current_stock} units</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Reorder Point</p>
                                                    <p className="font-medium">{suggestion.reorder_point} units</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Suggested Qty</p>
                                                    <p className="font-medium text-primary">{suggestion.suggested_quantity} units</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Lead Time</p>
                                                    <p className="font-medium">{suggestion.lead_time_days} days</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 text-sm text-muted-foreground">
                                                Supplier: <span className="font-medium">{suggestion.supplier_name}</span>
                                            </div>
                                        </div>

                                        <Button className="flex-shrink-0">
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Create Order
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
