import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const stepSupplierSchema = z.object({
    supplierId: z.string().min(1, { message: 'Please select a supplier.' }),
    referenceNo: z.string().optional(),
    purchaseDate: z.string().min(1, { message: 'Date is required.' }),
    notes: z.string().optional(),
});

type StepSupplierValues = z.infer<typeof stepSupplierSchema>;

export function StepSupplier() {
    const { draft, updateDraftMeta, setStep } = usePurchaseStore();

    const form = useForm<StepSupplierValues>({
        resolver: zodResolver(stepSupplierSchema),
        defaultValues: {
            supplierId: draft.supplierId,
            referenceNo: draft.referenceNo || '',
            purchaseDate: draft.purchaseDate,
            notes: draft.notes || '',
        },
    });

    const onSubmit = (data: StepSupplierValues) => {
        updateDraftMeta(data);
        setStep(2);
    };

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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a supplier" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="sup_1">Tech Corp</SelectItem>
                                        <SelectItem value="sup_2">Office Supplies Inc</SelectItem>
                                        <SelectItem value="sup_3">Global Electronics</SelectItem>
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
                                <FormLabel>Date</FormLabel>
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
