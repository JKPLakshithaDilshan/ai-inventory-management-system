import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getSuppliers, type Supplier } from '@/services/suppliers';

const stepSupplierSchema = z.object({
    supplierId: z.string().min(1, { message: 'Please select a supplier.' }),
    warehouseId: z.string().min(1, { message: 'Please select a warehouse.' }),
    referenceNo: z.string().optional(),
    purchaseDate: z.string().min(1, { message: 'Date is required.' }),
    notes: z.string().optional(),
});

type StepSupplierValues = z.infer<typeof stepSupplierSchema>;

export function StepSupplier() {
    const { draft, updateDraftMeta, setStep } = usePurchaseStore();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSuppliers(0, 1000, undefined, true);
            setSuppliers(data.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    const form = useForm<StepSupplierValues>({
        resolver: zodResolver(stepSupplierSchema),
        defaultValues: {
            supplierId: draft.supplierId,
            warehouseId: draft.warehouseId || '1', // Default to main warehouse
            referenceNo: draft.referenceNo || '',
            purchaseDate: draft.purchaseDate,
            notes: draft.notes || '',
        },
    });

    const onSubmit = (data: StepSupplierValues) => {
        updateDraftMeta({
            ...data,
            supplierId: data.supplierId,
        });
        setStep(2);
    };

    if (error) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                    <p className="font-medium">{error}</p>
                    <Button variant="outline" size="sm" onClick={loadSuppliers} className="mt-2">
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Supplier</FormLabel>
                                {loading ? (
                                    <Skeleton className="h-10 w-full" />
                                ) : (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a supplier" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {suppliers.map((supplier) => (
                                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                                    {supplier.name} ({supplier.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="warehouseId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Warehouse</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select warehouse" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="1">Main Warehouse</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="purchaseDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Purchase Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="referenceNo"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reference Number (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. INV-12345" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Additional notes for this purchase..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2">
                    <Button type="submit">Next</Button>
                </div>
            </form>
        </Form>
    );
}
