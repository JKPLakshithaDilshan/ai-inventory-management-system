import { useState } from 'react';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { createPurchase, type PurchaseCreateInput } from '@/services/purchases';

export function StepReview() {
    const { draft, setStep, clearDraft } = usePurchaseStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    const subtotal = draft.items.reduce((sum, item) => sum + item.lineTotal, 0);

    const handleConfirm = async () => {
        if (!draft.supplierId || !draft.warehouseId) {
            setError('Missing supplier or warehouse');
            return;
        }

        if (draft.items.length === 0) {
            setError('No items in purchase order');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const purchaseData: PurchaseCreateInput = {
                supplier_id: parseInt(draft.supplierId),
                warehouse_id: parseInt(draft.warehouseId),
                purchase_date: draft.purchaseDate,
                reference_number: draft.referenceNo || undefined,
                notes: draft.notes || undefined,
                tax_amount: 0,
                discount_amount: 0,
                items: draft.items.map((item) => ({
                    product_id: parseInt(item.productId),
                    quantity: item.qty,
                    unit_price: item.unitCost,
                })),
            };

            const result = await createPurchase(purchaseData);

            clearDraft();
            toast({
                title: 'Success',
                description: `Purchase Order ${result.purchase_number} created successfully.`,
            });
            navigate(`/purchases/${result.id}`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to create purchase';
            setError(errorMsg);
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = () => {
        // Just navigate away, Zustand persist keeps the draft
        toast({
            title: 'Draft Saved',
            description: 'Your purchase order draft has been saved locally.',
        });
        navigate('/purchases');
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Supplier ID:</span>
                            <span className="font-medium">{draft.supplierId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Warehouse ID:</span>
                            <span className="font-medium">{draft.warehouseId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{draft.purchaseDate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Reference:</span>
                            <span className="font-medium">{draft.referenceNo || 'None'}</span>
                        </div>
                        {draft.notes && (
                            <div className="pt-2 border-t mt-2">
                                <span className="text-muted-foreground block mb-1">Notes:</span>
                                <span className="italic">{draft.notes}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Items:</span>
                            <span className="font-medium">{draft.items.length}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
                            <span>Total Value:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border text-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-[100px] text-right">Qty</TableHead>
                            <TableHead className="w-[120px] text-right">Unit Cost</TableHead>
                            <TableHead className="w-[120px] text-right">Line Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {draft.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                                </TableCell>
                                <TableCell className="text-right">{item.qty}</TableCell>
                                <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">
                                    ${item.lineTotal.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} disabled={isSubmitting}>
                    Back
                </Button>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={isSubmitting}>
                        Save Draft
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirming...' : 'Confirm Purchase'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
