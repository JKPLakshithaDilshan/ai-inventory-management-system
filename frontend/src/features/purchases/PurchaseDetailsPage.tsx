import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getPurchaseById, receivePurchase, type Purchase, type ReceiveItemInput } from '@/services/purchases';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export function PurchaseDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuthStore();
    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadPurchase();
    }, [id, user, navigate]);

    const loadPurchase = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await getPurchaseById(parseInt(id));
            setPurchase(data);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to load purchase';
            setError(errorMsg);
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReceive = async () => {
        if (!purchase || purchase.status === 'received') {
            toast({
                title: 'Error',
                description: 'This purchase cannot be received',
                variant: 'destructive',
            });
            return;
        }

        try {
            setIsReceiving(true);

            // Prepare items for receiving - mark all items as fully received
            const receiveItems: ReceiveItemInput[] = purchase.items.map((item) => ({
                purchase_item_id: item.id,
                received_quantity: item.quantity,
            }));

            const today = new Date().toISOString().split('T')[0];
            await receivePurchase(purchase.id, receiveItems, today);

            toast({
                title: 'Success',
                description: 'Purchase order marked as received. Inventory updated.',
            });

            setIsReceiveDialogOpen(false);
            loadPurchase(); // Reload to show updated status
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to receive purchase';
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setIsReceiving(false);
        }
    };

    if (!user) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Card>
                    <div className="space-y-4 p-6">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    if (error || !purchase) {
        return (
            <div className="flex flex-col gap-6">
                <Button variant="ghost" onClick={() => navigate('/purchases')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Card className="border-destructive/50 bg-destructive/10 p-6 text-destructive">
                    <p className="font-medium">{error || 'Purchase not found'}</p>
                    <Button variant="outline" size="sm" onClick={loadPurchase} className="mt-4">
                        Retry
                    </Button>
                </Card>
            </div>
        );
    }

    const canReceive = purchase.status === 'draft' || purchase.status === 'ordered';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/purchases')}
                        className="h-fit p-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{purchase.purchase_number}</h1>
                        <p className="text-muted-foreground">Purchase Order Details</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge
                        variant={
                            {
                                draft: 'secondary',
                                ordered: 'outline',
                                received: 'default',
                                cancelled: 'destructive',
                            }[purchase.status] as any
                        }
                    >
                        {purchase.status.toUpperCase()}
                    </Badge>
                    {canReceive && (
                        <Button onClick={() => setIsReceiveDialogOpen(true)}>
                            <Check className="mr-2 h-4 w-4" /> Receive Stock
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Supplier:</span>
                            <span className="font-medium">{purchase.supplier?.name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Purchase Date:</span>
                            <span>{new Date(purchase.purchase_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Expected Delivery:</span>
                            <span>
                                {purchase.expected_delivery_date
                                    ? new Date(purchase.expected_delivery_date).toLocaleDateString()
                                    : '-'}
                            </span>
                        </div>
                        {purchase.received_date && (
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground">Received Date:</span>
                                <span className="font-medium">
                                    {new Date(purchase.received_date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Amount Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>${purchase.subtotal.toFixed(2)}</span>
                        </div>
                        {purchase.tax_amount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax:</span>
                                <span>${purchase.tax_amount.toFixed(2)}</span>
                            </div>
                        )}
                        {purchase.discount_amount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount:</span>
                                <span>-${purchase.discount_amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t text-base font-bold">
                            <span>Total:</span>
                            <span>${purchase.total_amount.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Line Items:</span>
                            <span className="font-medium">{purchase.items.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Received Items:</span>
                            <span className="font-medium">
                                {purchase.items.filter((i) => i.received_quantity > 0).length}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table className="text-sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="w-[100px] text-right">Quantity</TableHead>
                                    <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                                    <TableHead className="w-[120px] text-right">Received</TableHead>
                                    <TableHead className="w-[100px] text-right">Line Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchase.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.product?.name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={item.received_quantity > 0 ? 'default' : 'outline'}>
                                                {item.received_quantity}/{item.quantity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${item.total_price.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {purchase.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>{purchase.notes}</CardContent>
                </Card>
            )}

            {/* Receive Confirmation Dialog */}
            <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Receive Purchase Order</DialogTitle>
                        <DialogDescription>
                            This will mark all items as received and update inventory stock levels. This action is irreversible.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="rounded-lg bg-warning/10 p-4 text-sm text-amber-800">
                            <p className="font-medium mb-2">Items to be received:</p>
                            <ul className="space-y-1">
                                {purchase.items.map((item) => (
                                    <li key={item.id} className="text-sm">
                                        • {item.product?.name || 'Unknown'}: {item.quantity} units
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsReceiveDialogOpen(false)}
                            disabled={isReceiving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleReceive} disabled={isReceiving}>
                            {isReceiving ? 'Receiving...' : 'Confirm Receive'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
