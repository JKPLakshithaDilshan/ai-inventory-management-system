import { useState } from 'react';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

const mockProducts = [
    { id: 'prod_1', sku: 'CH-001', name: 'Ergonomic Chair', cost: 120 },
    { id: 'prod_2', sku: 'LT-012', name: 'MacBook Pro M3', cost: 1500 },
    { id: 'prod_3', sku: 'MS-099', name: 'Wireless Mouse', cost: 25 },
];

export function StepItems() {
    const { draft, setStep, updateItem, removeItem, addItem } = usePurchaseStore();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const handleAddProduct = (product: typeof mockProducts[0]) => {
        // Simple duplicate check
        if (draft.items.find(i => i.productId === product.id)) {
            alert('Item already added.');
            return;
        }
        addItem({
            id: crypto.randomUUID(), // transient ID for the row
            productId: product.id,
            sku: product.sku,
            name: product.name,
            qty: 1,
            unitCost: product.cost,
            lineTotal: product.cost,
        });
        setIsAddOpen(false);
    };

    const handleNext = () => {
        if (draft.items.length === 0) {
            alert('Please add at least one item.');
            return;
        }
        if (draft.items.some(i => i.qty <= 0)) {
            alert('All quantities must be greater than 0.');
            return;
        }
        setStep(3);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Purchase Items</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Select Product</DialogTitle>
                            <DialogDescription>
                                Pick a product from the catalog to add to the purchase order.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 border rounded-md p-2 mt-4 max-h-[300px] overflow-y-auto">
                            {mockProducts.map((p) => (
                                <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer transition-colors" onClick={() => handleAddProduct(p)}>
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                                    </div>
                                    <div className="text-sm border py-1 px-3 rounded-full">Add</div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border text-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-[100px]">Qty</TableHead>
                            <TableHead className="w-[120px]">Unit Cost</TableHead>
                            <TableHead className="w-[100px] text-right">Line Total</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {draft.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No items added yet. Click "Add Product".
                                </TableCell>
                            </TableRow>
                        ) : (
                            draft.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="h-8 p-1"
                                            value={item.qty || ''}
                                            onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="h-8 p-1"
                                            value={item.unitCost || ''}
                                            onChange={(e) => updateItem(item.id, { unitCost: Number(e.target.value) })}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${item.lineTotal.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 focus:ring-0"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-md">
                <div className="text-sm font-medium">
                    Total Items: {draft.items.length}
                </div>
                <div className="text-lg font-bold">
                    Subtotal: ${draft.items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)}
                </div>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleNext}>Next</Button>
            </div>
        </div>
    );
}
