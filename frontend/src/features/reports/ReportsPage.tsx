/**
 * Reports Page - Main dashboard for all reports
 */
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { InventoryReportTab } from './InventoryReportTab';
import { SalesReportTab } from './SalesReportTab';
import { PurchaseReportTab } from './PurchaseReportTab';
import { StockMovementsReportTab } from './StockMovementsReportTab';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('inventory');

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <PageHeader
                title="Reports"
                description="Generate and export detailed reports"
            />

            <div className="flex-1 overflow-auto p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
                        <TabsTrigger value="inventory" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span className="hidden sm:inline">Inventory</span>
                        </TabsTrigger>
                        <TabsTrigger value="sales" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="hidden sm:inline">Sales</span>
                        </TabsTrigger>
                        <TabsTrigger value="purchases" className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span className="hidden sm:inline">Purchases</span>
                        </TabsTrigger>
                        <TabsTrigger value="movements" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Movements</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inventory" className="mt-0">
                        <InventoryReportTab />
                    </TabsContent>

                    <TabsContent value="sales" className="mt-0">
                        <SalesReportTab />
                    </TabsContent>

                    <TabsContent value="purchases" className="mt-0">
                        <PurchaseReportTab />
                    </TabsContent>

                    <TabsContent value="movements" className="mt-0">
                        <StockMovementsReportTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
