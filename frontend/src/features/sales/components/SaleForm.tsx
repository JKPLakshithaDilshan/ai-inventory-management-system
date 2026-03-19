import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getProducts, type Product } from '@/services/products';
import { warehouseApi, type Warehouse } from '@/services/warehouses';
import { saleApi, type SaleCreateInput } from '@/services/sales';
import { Skeleton } from '@/components/ui/skeleton';
import { customerApi, type Customer } from '@/services/customers';

interface SaleLineItem {
    id: string;
    product_id: number;
    sku: string;
    name: string;
    availableQty: number;
    quantity: number;
    unit_price: number;
    lineTotal: number;
}

export function SaleForm() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [warehouseId, setWarehouseId] = useState('1');
    const [customerId, setCustomerId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);

    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<SaleLineItem[]>([]);

    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadCatalog = async () => {
            try {
                setLoadingCatalog(true);
                const [productResp, warehouseResp, customerResp] = await Promise.all([
                    getProducts(0, 100),
                    warehouseApi.list({ skip: 0, limit: 100 }).catch(() => ({ items: [] as Warehouse[], total: 0, page: 1, page_size: 100, total_pages: 1 })),
                    customerApi.list({ skip: 0, limit: 200, is_active: true }).catch(() => ({ items: [] as Customer[], total: 0, page: 1, page_size: 200, total_pages: 1 })),
                ]);

                setProducts(productResp.items);
                setCustomers(customerResp.items || []);
                const resolvedWarehouses = warehouseResp.items.length > 0
                    ? warehouseResp.items
                    : [{ id: 1, code: 'WH-MAIN', name: 'Main Warehouse', is_active: true, created_at: '', updated_at: '' } as Warehouse];
                setWarehouses(resolvedWarehouses);
                setWarehouseId(String(resolvedWarehouses[0].id));
            } catch (error) {
                toast({
                    title: 'Failed to load data',
                    description: error instanceof Error ? error.message : 'Could not load products/warehouses',
                    variant: 'destructive',
                });
            } finally {
                setLoadingCatalog(false);
            }
        };

        loadCatalog();
    }, [toast]);

    const addItem = (product: Product) => {
        if (items.some((item) => item.product_id === product.id)) {
            toast({ title: 'Already added', description: 'This product is already in the list.', variant: 'destructive' });
            return;
        }

        const line: SaleLineItem = {
            id: crypto.randomUUID(),
            product_id: product.id,
            sku: product.sku,
            name: product.name,
            availableQty: product.quantity,
            quantity: 1,
            unit_price: product.selling_price,
            lineTotal: product.selling_price,
        };

        setItems((prev) => [...prev, line]);
        setIsAddOpen(false);
    };

    const updateItem = (id: string, updates: Partial<SaleLineItem>) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const next = { ...item, ...updates };
                next.lineTotal = next.quantity * next.unit_price;
                return next;
            })
        );
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.lineTotal, 0), [items]);
    const totalAmount = useMemo(() => subtotal - discountAmount + taxAmount, [subtotal, discountAmount, taxAmount]);

    const handleCustomerSelect = (value: string) => {
        setCustomerId(value);
        if (!value) return;

        const selected = customers.find((customer) => String(customer.id) === value);
        if (!selected) return;

        setCustomerName(selected.full_name || '');
        setCustomerEmail(selected.email || '');
        setCustomerPhone(selected.phone || '');
    };

    const handleCreateSale = async () => {
        if (!warehouseId) {
            toast({ title: 'Validation error', description: 'Please select a warehouse.', variant: 'destructive' });
            return;
        }

        if (items.length === 0) {
            toast({ title: 'Validation error', description: 'Please add at least one product line.', variant: 'destructive' });
            return;
        }

        const invalidQty = items.find((item) => item.quantity <= 0 || item.quantity > item.availableQty);
        if (invalidQty) {
            toast({
                title: 'Stock validation failed',
                description: `${invalidQty.name} has invalid quantity (available: ${invalidQty.availableQty}).`,
                variant: 'destructive',
            });
            return;
        }

        const payload: SaleCreateInput = {
            warehouse_id: Number(warehouseId),
            customer_id: customerId ? Number(customerId) : undefined,
            sale_date: saleDate,
            customer_name: customerName || undefined,
            customer_email: customerEmail || undefined,
            customer_phone: customerPhone || undefined,
            notes: notes || undefined,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            paid_amount: 0,
            items: items.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percent: 0,
            })),
        };

        try {
            setIsSubmitting(true);
            const sale = await saleApi.create(payload);
            toast({ title: 'Sale created', description: `${sale.invoice_number} created as draft.` });
            navigate(`/sales/${sale.id}`);
        } catch (error) {
            toast({
                title: 'Create failed',
                description: error instanceof Error ? error.message : 'Failed to create sale',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Warehouse</label>
                    <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={warehouseId}
                        onChange={(event) => setWarehouseId(event.target.value)}
                    >
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={String(warehouse.id)}>
                                {warehouse.name} ({warehouse.code})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Sale Date</label>
                    <Input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Profile (Optional)</label>
                    <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={customerId}
                        onChange={(event) => handleCustomerSelect(event.target.value)}
                    >
                        <option value="">Walk-in / Manual Entry</option>
                        {customers.map((customer) => (
                            <option key={customer.id} value={String(customer.id)}>
                                {customer.full_name} ({customer.customer_code})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Name</label>
                    <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Optional customer" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Email</label>
                    <Input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Optional email" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Phone</label>
                    <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Optional phone" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" />
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
                            <DialogDescription>Pick a product and add it to this sale.</DialogDescription>
                        </DialogHeader>

                        {loadingCatalog ? (
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <div className="grid gap-2 border rounded-md p-2 mt-4 max-h-[300px] overflow-y-auto">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-left"
                                        onClick={() => addItem(product)}
                                    >
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {product.sku} | Stock: {product.quantity}
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium">${product.selling_price.toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border text-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-[120px]">Qty</TableHead>
                            <TableHead className="w-[140px]">Unit Price</TableHead>
                            <TableHead className="w-[120px] text-right">Line Total</TableHead>
                            <TableHead className="w-[70px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No items added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => {
                                const stockExceeded = item.quantity > item.availableQty;
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.sku} | Available: {item.availableQty}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                className={stockExceeded ? 'border-destructive' : ''}
                                                onChange={(event) =>
                                                    updateItem(item.id, { quantity: Number(event.target.value) || 0 })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(event) =>
                                                    updateItem(item.id, { unit_price: Number(event.target.value) || 0 })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">${item.lineTotal.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => removeItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-md">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Amount</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountAmount}
                        onChange={(event) => setDiscountAmount(Number(event.target.value) || 0)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tax Amount</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={taxAmount}
                        onChange={(event) => setTaxAmount(Number(event.target.value) || 0)}
                    />
                </div>
                <div className="flex flex-col justify-end">
                    <div className="text-sm text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</div>
                    <div className="text-lg font-bold">Total: ${totalAmount.toFixed(2)}</div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate('/sales')} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button onClick={handleCreateSale} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Sale Draft'}
                </Button>
            </div>
        </div>
    );
}
