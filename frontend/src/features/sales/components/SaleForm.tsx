import { useState } from 'react';
import { useSaleStore } from '@/stores/useSaleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const mockProducts = [
    { id: 'prod_1', sku: 'CH-001', name: 'Ergonomic Chair', price: 199.99, stock: 45 },
    { id: 'prod_2', sku: 'LT-012', name: 'MacBook Pro M3', price: 1999.00, stock: 5 },
    { id: 'prod_3', sku: 'MS-099', name: 'Wireless Mouse', price: 49.99, stock: 0 },
];

export function SaleForm() {
    const { draft, updateDraftMeta, addItem, updateItem, removeItem, clearDraft } = useSaleStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleAddProduct = (product: typeof mockProducts[0]) => {
        if (product.stock <= 0) {
            toast({ title: 'Out of stock', description: 'Cannot add items with 0 stock.', variant: 'destructive' });
            return;
        }
        if (draft.items.find((i) => i.productId === product.id)) {
            toast({ title: 'Already added', description: 'Item is already in the list.' });
            return;
        }

        addItem({
            id: crypto.randomUUID(),
            productId: product.id,
            sku: product.sku,
            name: product.name,
            availableQty: product.stock,
            qty: 1,
            unitPrice: product.price,
            lineTotal: product.price,
        });
        setIsAddOpen(false);
    };

    const handleConfirm = () => {
        if (draft.items.length === 0) {
            toast({ title: 'Validation Error', description: 'Please add at least one item.', variant: 'destructive' });
            return;
        }

        // Stock block check
        const invalidItems = draft.items.filter(i => i.qty <= 0 || i.qty > i.availableQty);
        if (invalidItems.length > 0) {
            toast({ title: 'Validation Error', description: 'One or more items exceed available stock or have invalid quantity.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            clearDraft();
            toast({ title: 'Sale Confirmed', description: 'Stock has been deducted successfully.' });
            navigate('/sales');
        }, 1000);
    };

    const handleSaveDraft = () => {
        toast({ title: 'Draft Saved', description: 'You can resume this sale later.' });
        navigate('/sales');
    };

    // Derived totals
    const subtotal = draft.items.reduce((s, i) => s + i.lineTotal, 0);
    const discountAmount = subtotal * (draft.discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (draft.taxRate / 100);
    const grandTotal = subtotal - discountAmount + taxAmount;

    return (
        <div className="space-y-6">
            {/* Meta Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Name (Optional)</label>
                    <Input
                        value={draft.customerName}
                        onChange={(e) => updateDraftMeta({ customerName: e.target.value })}
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                        type="date"
                        value={draft.saleDate}
                        onChange={(e) => updateDraftMeta({ saleDate: e.target.value })}
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                        value={draft.notes}
                        onChange={(e) => updateDraftMeta({ notes: e.target.value })}
                        placeholder="Standard delivery terms..."
                    />
                </div>
            </div>

            <div className="flex items-center justify-between border-t pt-6">
                <h3 className="text-lg font-medium">Line Items</h3>
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
                                Pick a product to add to the sale invoice.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 border rounded-md p-2 mt-4 max-h-[300px] overflow-y-auto">
                            {mockProducts.map((p) => (
                                <div
                                    key={p.id}
                                    className={`flex items-center justify-between p-2 rounded-md transition-colors ${p.stock > 0 ? 'hover:bg-muted cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                        }`}
                                    onClick={() => p.stock > 0 && handleAddProduct(p)}
                                >
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-muted-foreground">{p.sku} | In Stock: {p.stock}</div>
                                    </div>
                                    <div className="text-sm font-medium pr-2">${p.price}</div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Items Table with Inline Editing */}
            <div className="rounded-md border text-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-[120px]">Qty</TableHead>
                            <TableHead className="w-[120px]">Unit Price</TableHead>
                            <TableHead className="w-[100px] text-right">Total</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {draft.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No items added.
                                </TableCell>
                            </TableRow>
                        ) : (
                            draft.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground flex gap-1 items-center">
                                            {item.sku}
                                            <span className={`px-1.5 py-0.5 rounded-sm ${item.qty > item.availableQty ? 'bg-red-500/20 text-red-600' : 'bg-muted'}`}>
                                                Stock: {item.availableQty}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className={`h-8 p-1 ${item.qty > item.availableQty ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            value={item.qty || ''}
                                            onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="h-8 p-1"
                                            value={item.unitPrice || ''}
                                            onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
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

            {/* Application Totals Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 p-4 rounded-md">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Discount (%)</label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            className="bg-background max-w-[150px]"
                            value={draft.discount || ''}
                            onChange={(e) => updateDraftMeta({ discount: Number(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Tax Rate (%)</label>
                        <Input
                            type="number"
                            min="0"
                            className="bg-background max-w-[150px]"
                            value={draft.taxRate || ''}
                            onChange={(e) => updateDraftMeta({ taxRate: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="flex flex-col justify-end gap-2 text-right">
                    <div className="flex justify-between text-muted-foreground text-sm">
                        <span>Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {draft.discount > 0 && (
                        <div className="flex justify-between text-muted-foreground text-sm">
                            <span>Discount ({draft.discount}%):</span>
                            <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {draft.taxRate > 0 && (
                        <div className="flex justify-between text-muted-foreground text-sm">
                            <span>Tax ({draft.taxRate}%):</span>
                            <span>+${taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Grand Total:</span>
                        <span>${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-xs text-muted-foreground">*Invoice preview updates automatically in real-time.</span>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={isSubmitting}>
                        Save Draft
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirming...' : 'Confirm Sale'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
